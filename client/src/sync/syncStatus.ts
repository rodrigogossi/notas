export type SyncPhase = 'idle' | 'syncing' | 'offline' | 'error';

export interface SyncState {
  phase: SyncPhase;
  lastSyncedAt: string | null;
  pendingCount: number;
  error?: string;
}

let state: SyncState = { phase: 'idle', lastSyncedAt: null, pendingCount: 0 };
const listeners = new Set<() => void>();

export function getSyncState(): SyncState {
  return state;
}

export function subscribeSyncState(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function setSyncState(patch: Partial<SyncState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}
