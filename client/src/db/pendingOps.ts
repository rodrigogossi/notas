import { scheduleSync } from '../sync/syncScheduler';
import type { Collection } from '../types';
import { db } from './dexie';

export async function enqueue(collection: Collection, itemId: string): Promise<void> {
  await db.pendingOps.put({ collection, itemId, enqueuedAt: new Date().toISOString() });
  scheduleSync();
}

export async function dequeue(collection: Collection, itemId: string): Promise<void> {
  await db.pendingOps.delete([collection, itemId]);
}

export async function hasPending(collection: Collection, itemId: string): Promise<boolean> {
  return (await db.pendingOps.get([collection, itemId])) !== undefined;
}

export async function listPendingFor(collection: Collection) {
  const all = await db.pendingOps.where('collection').equals(collection).toArray();
  return all.sort((a, b) => a.enqueuedAt.localeCompare(b.enqueuedAt));
}
