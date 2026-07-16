import { FolderPlus, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { LocalFolder } from '../types';

interface FoldersPaneProps {
  folders: LocalFolder[];
  selectedFolderId: string | null;
  onSelect: (folderId: string | null) => void;
  onCreateFolder: () => Promise<LocalFolder>;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
}

export default function FoldersPane({
  folders,
  selectedFolderId,
  onSelect,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: FoldersPaneProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  async function handleCreate() {
    const folder = await onCreateFolder();
    setEditingId(folder.id);
    setEditingName(folder.name);
  }

  function startEditing(folder: LocalFolder) {
    setEditingId(folder.id);
    setEditingName(folder.name);
  }

  function commitEditing() {
    if (editingId && editingName.trim()) {
      onRenameFolder(editingId, editingName.trim());
    }
    setEditingId(null);
  }

  return (
    <div className="folders-pane">
      <div className="folders-header">
        <span>Pastas</span>
        <button className="icon-text-button" onClick={handleCreate}>
          <FolderPlus size={15} />
          Nova pasta
        </button>
      </div>
      <ul className="folders-list">
        <li
          className={selectedFolderId === null ? 'selected' : ''}
          onClick={() => onSelect(null)}
        >
          Todas as notas
        </li>
        {folders.map((folder) => (
          <li
            key={folder.id}
            className={selectedFolderId === folder.id ? 'selected' : ''}
            onClick={() => onSelect(folder.id)}
          >
            {editingId === folder.id ? (
              <input
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={commitEditing}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEditing();
                  if (e.key === 'Escape') setEditingId(null);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <span className="folder-name">{folder.name}</span>
                <span className="folder-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(folder);
                    }}
                    aria-label="Renomear pasta"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFolder(folder.id);
                    }}
                    aria-label="Apagar pasta"
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
