import { PenLine, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { LocalNote } from '../types';

const DELETE_WIDTH = 72;

interface NoteListItemProps {
  note: LocalNote;
  selected: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: () => void;
  onDelete: () => void;
  onContextMenu: (x: number, y: number) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default function NoteListItem({
  note,
  selected,
  isOpen,
  onOpenChange,
  onSelect,
  onDelete,
  onContextMenu,
}: NoteListItemProps) {
  const [dragX, setDragX] = useState(isOpen ? -DELETE_WIDTH : 0);
  const [isDragging, setIsDragging] = useState(false);
  const startRef = useRef<{ x: number; y: number; dragX: number } | null>(null);
  const draggingRef = useRef(false);
  const didDragRef = useRef(false);

  // Se outra nota da lista abriu o "arrastar para excluir" dela, esta fecha — só uma aberta por vez.
  useEffect(() => {
    if (!isOpen) setDragX(0);
  }, [isOpen]);

  function handlePointerDown(e: React.PointerEvent) {
    if (!e.isPrimary) return;
    startRef.current = { x: e.clientX, y: e.clientY, dragX };
    draggingRef.current = false;
    didDragRef.current = false;
  }

  function handlePointerMove(e: React.PointerEvent) {
    const start = startRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!draggingRef.current) {
      if (Math.abs(dx) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        // gesto mais vertical que horizontal — é rolagem da lista, não arrastar-para-excluir
        startRef.current = null;
        return;
      }
      draggingRef.current = true;
      setIsDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    didDragRef.current = true;
    setDragX(clamp(start.dragX + dx, -DELETE_WIDTH, 0));
  }

  function handlePointerUp() {
    if (draggingRef.current) {
      const openNow = Math.abs(dragX) > DELETE_WIDTH / 2;
      setDragX(openNow ? -DELETE_WIDTH : 0);
      onOpenChange(openNow);
    }
    startRef.current = null;
    draggingRef.current = false;
    setIsDragging(false);
  }

  function handleClick() {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    if (isOpen) {
      onOpenChange(false);
      return;
    }
    onSelect();
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    onContextMenu(e.clientX, e.clientY);
  }

  return (
    <li className="note-list-item-wrapper">
      <button className="note-swipe-delete" onClick={onDelete} aria-label="Excluir nota">
        <Trash2 size={16} />
        Excluir
      </button>
      <div
        className={`note-list-item ${selected ? 'selected' : ''} ${isDragging ? '' : 'note-list-item--settled'}`}
        style={{ transform: `translateX(${dragX}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <div className="note-title">
          {note.type === 'handwritten' && <PenLine className="note-type-icon" size={13} />}
          {note.title || '(sem título)'}
        </div>
        <div className="note-meta">{new Date(note.updatedAt).toLocaleString('pt-BR')}</div>
        {note.type === 'markdown' && note.content && (
          <div className="note-snippet">{note.content.slice(0, 80)}</div>
        )}
      </div>
    </li>
  );
}
