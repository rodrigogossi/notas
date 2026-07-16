import type { LocalFolder } from '../types';
import { generateId } from '../utils/uuid';
import { db } from './dexie';
import { enqueue } from './pendingOps';

export async function listFolders(): Promise<LocalFolder[]> {
  const all = await db.folders.toArray();
  return all.filter((folder) => !folder.deletedAt).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getFolder(id: string): Promise<LocalFolder | undefined> {
  return db.folders.get(id);
}

export async function createFolder(name: string): Promise<LocalFolder> {
  const now = new Date().toISOString();
  const folder: LocalFolder = {
    id: generateId(),
    name,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    lastSyncedUpdatedAt: null,
  };
  await db.folders.put(folder);
  await enqueue('folders', folder.id);
  return folder;
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const existing = await db.folders.get(id);
  if (!existing) return;
  await db.folders.put({ ...existing, name, updatedAt: new Date().toISOString() });
  await enqueue('folders', id);
}

/** Apaga a pasta (soft-delete) e desatribui todas as notas dela (elas voltam pra "Todas as
 * notas", não são apagadas). */
export async function deleteFolder(id: string): Promise<void> {
  const existing = await db.folders.get(id);
  if (!existing) return;
  const now = new Date().toISOString();

  await db.transaction('rw', db.folders, db.notes, db.pendingOps, async () => {
    await db.folders.put({ ...existing, deletedAt: now, updatedAt: now });
    await enqueue('folders', id);
    const affectedNotes = await db.notes.where('folderId').equals(id).toArray();
    for (const note of affectedNotes) {
      await db.notes.put({ ...note, folderId: null, updatedAt: now });
      await enqueue('notes', note.id);
    }
  });
}
