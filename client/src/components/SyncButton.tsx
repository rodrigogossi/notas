import { RefreshCw } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { syncNow } from '../sync/syncEngine';
import { getSyncState, subscribeSyncState } from '../sync/syncStatus';

export default function SyncButton() {
  const state = useSyncExternalStore(subscribeSyncState, getSyncState);
  const syncing = state.phase === 'syncing';

  return (
    <button
      className="icon-button"
      onClick={() => syncNow()}
      disabled={syncing}
      aria-label="Sincronizar agora"
      title="Sincronizar agora"
    >
      <RefreshCw size={15} className={syncing ? 'icon-spin' : ''} />
    </button>
  );
}
