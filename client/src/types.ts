export type NoteType = 'markdown' | 'handwritten';

export type StrokeTool = 'pen' | 'highlighter';

export interface Stroke {
  points: [x: number, y: number, pressure: number][];
  color: string;
  size: number;
  /** ausente = traços antigos, tratados como caneta */
  tool?: StrokeTool;
}

export interface SyncableEntity {
  id: string;
  updatedAt: string;
  createdAt: string;
  deletedAt: string | null;
}

export interface NoteFile extends SyncableEntity {
  type: NoteType;
  title: string;
  /** null = sem pasta, aparece em "Todas as notas" */
  folderId: string | null;
  content?: string;
  strokes?: Stroke[];
  canvasSize?: { width: number; height: number };
}

export interface FolderFile extends SyncableEntity {
  name: string;
}

/** updatedAt confirmado pelo servidor na última sincronização; null = nunca sincronizado */
export type Local<T extends SyncableEntity> = T & { lastSyncedUpdatedAt: string | null };

export type LocalNote = Local<NoteFile>;
export type LocalFolder = Local<FolderFile>;

export type Collection = 'notes' | 'folders';

export interface PendingOp {
  collection: Collection;
  itemId: string;
  enqueuedAt: string;
}
