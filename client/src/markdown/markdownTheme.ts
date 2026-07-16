import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

const highlightStyle = HighlightStyle.define([
  { tag: tags.heading1, fontSize: '1.8em', fontWeight: '700' },
  { tag: tags.heading2, fontSize: '1.5em', fontWeight: '700' },
  { tag: tags.heading3, fontSize: '1.3em', fontWeight: '700' },
  { tag: tags.heading4, fontSize: '1.15em', fontWeight: '700' },
  { tag: tags.heading5, fontSize: '1.05em', fontWeight: '700' },
  { tag: tags.heading6, fontSize: '1em', fontWeight: '700' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.link, color: 'var(--accent)', textDecoration: 'underline' },
  { tag: tags.url, color: 'var(--text-muted)' },
  { tag: tags.monospace, fontFamily: "'SF Mono', Menlo, monospace", fontSize: '0.9em' },
  { tag: tags.quote, color: 'var(--text-muted)', fontStyle: 'italic' },
  { tag: tags.list, color: 'var(--accent)' },
  // marcadores de sintaxe (**, #, ~~, `, [](), >) quando visíveis (cursor em cima) ficam
  // discretos em vez de competir visualmente com o conteúdo
  { tag: tags.processingInstruction, color: 'var(--text-muted)' },
]);

export const markdownHighlighting = syntaxHighlighting(highlightStyle);

export const markdownEditorTheme = EditorView.theme({
  '&': { fontSize: '16px', height: '100%' },
  '.cm-content': {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    maxWidth: '720px',
    margin: '0 auto',
    padding: '24px 16px',
  },
  '.cm-line': { padding: '2px 0' },
  '&.cm-focused': { outline: 'none' },
});
