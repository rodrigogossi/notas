import { db } from '../db/dexie';
import { dequeue, hasPending, listPendingFor } from '../db/pendingOps';
import type { Collection, FolderFile, Local, NoteFile, SyncableEntity } from '../types';
import { fetchItem, fetchManifest, putItem } from './apiClient';
import { registerSyncTrigger } from './syncScheduler';
import { setSyncState } from './syncStatus';

function stripLocalFields<T extends SyncableEntity>(local: Local<T>): T {
  const { lastSyncedUpdatedAt: _lastSyncedUpdatedAt, ...item } = local;
  return item as unknown as T;
}

/** Só o subconjunto de EntityTable que o motor de sync realmente usa — evita a inferência de
 * generics do Dexie (InsertType/IDType) travar quando a coleção é genérica. */
interface SyncTable<T extends SyncableEntity> {
  get(id: string): Promise<Local<T> | undefined>;
  put(item: Local<T>): Promise<unknown>;
}

/**
 * Sincroniza uma coleção inteira (notas OU pastas — mesmo algoritmo pras duas).
 *
 * Push: para cada item com edição local pendente, empurra direto se ninguém mudou o item
 * remotamente desde nosso último sync; se mudou (conflito real), LWW por `updatedAt` — quem tiver
 * o maior vence (local sobrescreve remoto, ou remoto vence e descarta a edição local pendente).
 *
 * Pull: para cada id no manifest remoto, baixa e aplica localmente se for novo ou mais recente
 * que a versão local — pulando qualquer item que tenha ganhado uma edição local durante o sync.
 */
async function syncCollection<T extends SyncableEntity>(
  collection: Collection,
  table: SyncTable<T>,
): Promise<void> {
  async function applyRemote(remote: T): Promise<void> {
    await table.put({ ...remote, lastSyncedUpdatedAt: remote.updatedAt } as Local<T>);
  }

  async function applyPushed(saved: T): Promise<void> {
    await table.put({ ...saved, lastSyncedUpdatedAt: saved.updatedAt } as Local<T>);
    await dequeue(collection, saved.id);
  }

  const pending = await listPendingFor(collection);
  for (const op of pending) {
    const local = await table.get(op.itemId);
    if (!local) {
      await dequeue(collection, op.itemId);
      continue;
    }
    const remote = await fetchItem<T>(collection, local.id);
    const remoteMovedSinceLastSync =
      remote !== null &&
      local.lastSyncedUpdatedAt !== null &&
      remote.updatedAt > local.lastSyncedUpdatedAt;

    if (remoteMovedSinceLastSync && remote!.updatedAt >= local.updatedAt) {
      await applyRemote(remote!);
      await dequeue(collection, local.id);
      continue;
    }
    const saved = await putItem<T>(collection, stripLocalFields(local));
    await applyPushed(saved);
  }

  const manifest = await fetchManifest(collection);
  for (const { id } of manifest) {
    if (await hasPending(collection, id)) continue; // edição nova pode ter surgido durante o sync
    const local = await table.get(id);
    if (!local) {
      const remote = await fetchItem<T>(collection, id);
      if (remote) await applyRemote(remote);
      continue;
    }
    const remote = await fetchItem<T>(collection, id);
    if (remote && remote.updatedAt > local.updatedAt) {
      await applyRemote(remote);
    }
  }
}

let syncing = false;

export async function syncNow(): Promise<void> {
  if (syncing) return;
  if (!navigator.onLine) {
    setSyncState({ phase: 'offline' });
    return;
  }
  syncing = true;
  setSyncState({ phase: 'syncing' });
  try {
    await syncCollection<FolderFile>('folders', db.folders);
    await syncCollection<NoteFile>('notes', db.notes);
    const pendingCount = await db.pendingOps.count();
    setSyncState({
      phase: 'idle',
      lastSyncedAt: new Date().toISOString(),
      pendingCount,
      error: undefined,
    });
  } catch (err) {
    const pendingCount = await db.pendingOps.count();
    setSyncState({
      phase: 'error',
      error: err instanceof Error ? err.message : String(err),
      pendingCount,
    });
  } finally {
    syncing = false;
  }
}

// Ciclo periódico agora é só uma rede de segurança — a sincronização "de verdade" acontece via
// notificação em tempo real (liveUpdates.ts) e logo após uma edição local (scheduleSync em
// pendingOps.ts).
const SYNC_INTERVAL_MS = 60 * 1000;

export function startAutoSync(): void {
  registerSyncTrigger(() => void syncNow());
  window.addEventListener('online', () => void syncNow());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncNow();
  });
  setInterval(() => void syncNow(), SYNC_INTERVAL_MS);
  void syncNow();
}
