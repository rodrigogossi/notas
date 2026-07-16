import type { LocalNote, NoteFile, NoteType, Stroke } from '../types';
import { generateId } from '../utils/uuid';
import { db } from './dexie';
import { enqueue } from './pendingOps';

export async function listNotes(): Promise<LocalNote[]> {
  const all = await db.notes.toArray();
  return all
    .filter((note) => !note.deletedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getNote(id: string): Promise<LocalNote | undefined> {
  return db.notes.get(id);
}

export async function createNote(
  type: NoteType,
  title = '',
  folderId: string | null = null,
): Promise<LocalNote> {
  const now = new Date().toISOString();
  const note: LocalNote = {
    id: generateId(),
    type,
    title,
    folderId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    lastSyncedUpdatedAt: null,
    ...(type === 'markdown' ? { content: '' } : { strokes: [] as Stroke[] }),
  };
  await db.notes.put(note);
  await enqueue('notes', note.id);
  return note;
}

export async function updateNote(
  id: string,
  changes: Partial<Pick<NoteFile, 'title' | 'content' | 'strokes' | 'canvasSize' | 'folderId'>>,
): Promise<void> {
  const existing = await db.notes.get(id);
  if (!existing) return;
  await db.notes.put({
    ...existing,
    ...changes,
    updatedAt: new Date().toISOString(),
  });
  await enqueue('notes', id);
}

export async function moveNoteToFolder(id: string, folderId: string | null): Promise<void> {
  await updateNote(id, { folderId });
}

export async function deleteNote(id: string): Promise<void> {
  const existing = await db.notes.get(id);
  if (!existing) return;
  const now = new Date().toISOString();
  await db.notes.put({ ...existing, deletedAt: now, updatedAt: now });
  await enqueue('notes', id);
}
