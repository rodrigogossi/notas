import Dexie, { type EntityTable, type Table } from 'dexie';
import type { LocalFolder, LocalNote, PendingOp } from '../types';

export class NotesDB extends Dexie {
  notes!: EntityTable<LocalNote, 'id'>;
  folders!: EntityTable<LocalFolder, 'id'>;
  pendingOps!: Table<PendingOp, [string, string]>;

  constructor() {
    super('notas-app');
    this.version(1).stores({
      notes: 'id, updatedAt, deletedAt',
      pendingOps: 'noteId, enqueuedAt',
    });
    this.version(2).stores({
      notes: 'id, updatedAt, deletedAt, folderId',
      folders: 'id, updatedAt, deletedAt',
      // fila unificada pra notas e pastas: chave composta [collection+itemId]
      pendingOps: '[collection+itemId], enqueuedAt',
    });
  }
}

export const db = new NotesDB();

// Se outra aba/dispositivo abrir uma versão mais nova do banco enquanto esta aba ainda segura a
// conexão antiga, a atualização fica bloqueada — e como consequência TODA operação no banco desta
// aba (criar nota, sincronizar, etc.) trava esperando indefinidamente. Sem isso, o travamento é
// silencioso: nada aparece no console pro usuário, só "para de funcionar".
db.on('blocked', () => {
  alert(
    'Este app está aberto em outra aba com uma versão diferente. Feche as outras abas e recarregue esta página.',
  );
});

db.on('versionchange', () => {
  db.close();
  alert('O app foi atualizado. Recarregando...');
  location.reload();
});

export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  const already = await navigator.storage.persisted?.();
  if (already) return true;
  return navigator.storage.persist();
}
