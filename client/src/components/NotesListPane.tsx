import { ArrowUpDown, FileText, PanelLeft, PenLine, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { LocalNote } from '../types';
import IconMenuButton from './IconMenuButton';
import NoteListItem from './NoteListItem';

type SortOrder = 'newest' | 'oldest';

const SORT_ORDER_KEY = 'notas.sortOrder';

function readSortOrder(): SortOrder {
  return localStorage.getItem(SORT_ORDER_KEY) === 'oldest' ? 'oldest' : 'newest';
}

interface NotesListPaneProps {
  notes: LocalNote[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateMarkdown: () => void;
  onCreateHandwritten: () => void;
  onDeleteNote: (id: string) => void;
  onToggleFolders: () => void;
}

interface ContextMenuState {
  noteId: string;
  x: number;
  y: number;
}

export default function NotesListPane({
  notes,
  selectedId,
  onSelect,
  onCreateMarkdown,
  onCreateHandwritten,
  onDeleteNote,
  onToggleFolders,
}: NotesListPaneProps) {
  const [query, setQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>(readSortOrder);
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu) return;
    function close() {
      setContextMenu(null);
    }
    document.addEventListener('mousedown', close);
    document.addEventListener('scroll', close, true);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('scroll', close, true);
      document.removeEventListener('keydown', close);
    };
  }, [contextMenu]);

  function changeSortOrder(order: SortOrder) {
    setSortOrder(order);
    localStorage.setItem(SORT_ORDER_KEY, order);
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? notes.filter(
        (note) => note.title.toLowerCase().includes(q) || (note.content ?? '').toLowerCase().includes(q),
      )
    : notes;
  const sorted = [...filtered].sort((a, b) =>
    sortOrder === 'newest'
      ? b.updatedAt.localeCompare(a.updatedAt)
      : a.updatedAt.localeCompare(b.updatedAt),
  );

  return (
    <div className="notes-list-pane">
      <div className="list-header">
        <div className="list-header-top">
          <button
            className="icon-button"
            onClick={onToggleFolders}
            aria-label="Mostrar/ocultar pastas"
          >
            <PanelLeft size={16} />
          </button>
          <input
            className="search-input"
            placeholder="Buscar notas"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <IconMenuButton
            icon={<ArrowUpDown size={16} />}
            ariaLabel="Ordenar notas"
            selectedKey={sortOrder}
            items={[
              { key: 'newest', label: 'Mais novas primeiro', onSelect: () => changeSortOrder('newest') },
              {
                key: 'oldest',
                label: 'Mais antigas primeiro',
                onSelect: () => changeSortOrder('oldest'),
              },
            ]}
          />
          <IconMenuButton
            icon={<Plus size={16} />}
            ariaLabel="Nova nota"
            items={[
              {
                key: 'markdown',
                label: 'Nota de texto',
                icon: <FileText size={15} />,
                onSelect: onCreateMarkdown,
              },
              {
                key: 'handwritten',
                label: 'Nota manuscrita',
                icon: <PenLine size={15} />,
                onSelect: onCreateHandwritten,
              },
            ]}
          />
        </div>
      </div>
      <ul className="notes-list">
        {sorted.map((note) => (
          <NoteListItem
            key={note.id}
            note={note}
            selected={note.id === selectedId}
            isOpen={openSwipeId === note.id}
            onOpenChange={(open) => setOpenSwipeId(open ? note.id : null)}
            onSelect={() => onSelect(note.id)}
            onDelete={() => onDeleteNote(note.id)}
            onContextMenu={(x, y) => setContextMenu({ noteId: note.id, x, y })}
          />
        ))}
        {sorted.length === 0 && <li className="empty">Nenhuma nota encontrada</li>}
      </ul>
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => {
              onDeleteNote(contextMenu.noteId);
              setContextMenu(null);
            }}
          >
            <Trash2 size={14} />
            Excluir
          </button>
        </div>
      )}
    </div>
  );
}
