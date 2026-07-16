import { liveQuery } from 'dexie';
import { Folder, Maximize2, Minimize2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import FoldersPane from './components/FoldersPane';
import IconMenuButton from './components/IconMenuButton';
import MarkdownEditor from './components/MarkdownEditor';
import NotesListPane from './components/NotesListPane';
import StrokeCanvas from './components/StrokeCanvas';
import SyncButton from './components/SyncButton';
import SyncStatusBar from './components/SyncStatusBar';
import ThemeToggle from './components/ThemeToggle';
import { createFolder, deleteFolder, listFolders, renameFolder } from './db/foldersRepo';
import { createNote, deleteNote, listNotes, moveNoteToFolder, updateNote } from './db/notesRepo';
import type { LocalFolder, LocalNote, Stroke } from './types';

const DEFAULT_CANVAS_SIZE = { width: 800, height: 1000 };

export default function App() {
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [folders, setFolders] = useState<LocalFolder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [foldersCollapsed, setFoldersCollapsed] = useState(false);
  const [editorFullscreen, setEditorFullscreen] = useState(false);

  useEffect(() => {
    const subscription = liveQuery(() => listNotes()).subscribe({
      next: setNotes,
      error: (err) => console.error('Erro ao carregar notas', err),
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const subscription = liveQuery(() => listFolders()).subscribe({
      next: setFolders,
      error: (err) => console.error('Erro ao carregar pastas', err),
    });
    return () => subscription.unsubscribe();
  }, []);

  const selectedNote = notes.find((note) => note.id === selectedId) ?? null;
  const visibleNotes =
    selectedFolderId === null ? notes : notes.filter((note) => note.folderId === selectedFolderId);

  async function handleCreateMarkdown() {
    const note = await createNote('markdown', 'Nova nota', selectedFolderId);
    setSelectedId(note.id);
  }

  async function handleCreateHandwritten() {
    const note = await createNote('handwritten', 'Novo desenho', selectedFolderId);
    setSelectedId(note.id);
  }

  async function handleDeleteNote(id: string) {
    await deleteNote(id);
    if (selectedId === id) setSelectedId(null);
  }

  async function handleDeleteFolder(id: string) {
    await deleteFolder(id);
    if (selectedFolderId === id) setSelectedFolderId(null);
  }

  const layoutClassName = [
    'app-layout',
    foldersCollapsed && 'app-layout--folders-collapsed',
    editorFullscreen && 'app-layout--fullscreen',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={layoutClassName}>
      <FoldersPane
        folders={folders}
        selectedFolderId={selectedFolderId}
        onSelect={setSelectedFolderId}
        onCreateFolder={() => createFolder('Nova pasta')}
        onRenameFolder={renameFolder}
        onDeleteFolder={handleDeleteFolder}
      />
      <aside className="sidebar">
        <NotesListPane
          notes={visibleNotes}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreateMarkdown={handleCreateMarkdown}
          onCreateHandwritten={handleCreateHandwritten}
          onDeleteNote={handleDeleteNote}
          onToggleFolders={() => setFoldersCollapsed((collapsed) => !collapsed)}
        />
        <div className="sidebar-footer">
          <SyncStatusBar />
          <SyncButton />
          <ThemeToggle />
        </div>
      </aside>
      <main className="editor-area">
        {!selectedNote && <div className="empty-state">Selecione ou crie uma nota</div>}
        {selectedNote && (
          <div className="editor-pane" key={selectedNote.id}>
            <div className="editor-header">
              <input
                className="note-title-input"
                value={selectedNote.title}
                onChange={(e) => updateNote(selectedNote.id, { title: e.target.value })}
                placeholder="Título"
              />
              <IconMenuButton
                icon={<Folder size={16} />}
                ariaLabel="Mover para pasta"
                selectedKey={selectedNote.folderId ?? 'none'}
                items={[
                  {
                    key: 'none',
                    label: 'Sem pasta',
                    onSelect: () => moveNoteToFolder(selectedNote.id, null),
                  },
                  ...folders.map((folder) => ({
                    key: folder.id,
                    label: folder.name,
                    onSelect: () => moveNoteToFolder(selectedNote.id, folder.id),
                  })),
                ]}
              />
              <button
                className="icon-button"
                onClick={() => setEditorFullscreen((fullscreen) => !fullscreen)}
                aria-label={editorFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
              >
                {editorFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
            {selectedNote.type === 'markdown' ? (
              <MarkdownEditor
                value={selectedNote.content ?? ''}
                onChange={(content) => updateNote(selectedNote.id, { content })}
              />
            ) : (
              <StrokeCanvas
                initialStrokes={selectedNote.strokes ?? []}
                initialCanvasSize={selectedNote.canvasSize ?? DEFAULT_CANVAS_SIZE}
                onChange={(strokes: Stroke[]) => updateNote(selectedNote.id, { strokes })}
                onCanvasSizeChange={(canvasSize) => updateNote(selectedNote.id, { canvasSize })}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
