import { useSyncExternalStore } from 'react';
import { getSyncState, subscribeSyncState } from '../sync/syncStatus';

const LABELS: Record<string, string> = {
  idle: 'Sincronizado',
  syncing: 'Sincronizando…',
  offline: 'Offline',
  error: 'Erro na sincronização',
};

export default function SyncStatusBar() {
  const state = useSyncExternalStore(subscribeSyncState, getSyncState);

  return (
    <div className={`sync-status sync-status--${state.phase}`}>
      <div className="sync-status-line">
        <span>{LABELS[state.phase]}</span>
        {state.pendingCount > 0 && <span> · {state.pendingCount} pendente(s)</span>}
        {state.lastSyncedAt && (
          <span> · última sync {new Date(state.lastSyncedAt).toLocaleTimeString('pt-BR')}</span>
        )}
      </div>
      {state.error && <div className="sync-error">{state.error}</div>}
    </div>
  );
}
