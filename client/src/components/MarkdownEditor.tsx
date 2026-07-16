import { markdown } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { GFM } from '@lezer/markdown';
import { useEffect, useRef } from 'react';
import { livePreview } from '../markdown/livePreview';
import { markdownEditorTheme, markdownHighlighting } from '../markdown/markdownTheme';
import { proseSetup } from '../markdown/proseSetup';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        proseSetup(),
        markdown({ extensions: GFM }),
        markdownHighlighting,
        markdownEditorTheme,
        livePreview(),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current(update.state.doc.toString());
        }),
      ],
    });
    const view = new EditorView({ state, parent: containerRef.current });
    return () => view.destroy();
    // Cria o editor uma única vez, na montagem (o componente é remontado via `key` ao trocar de
    // nota) — não recriar a cada tecla, o que quebraria o cursor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="markdown-editor" />;
}
