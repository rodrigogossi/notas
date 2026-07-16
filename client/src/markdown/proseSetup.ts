import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { defaultHighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { EditorState } from '@codemirror/state';
import {
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightSpecialChars,
  keymap,
} from '@codemirror/view';

/**
 * Equivalente ao `basicSetup` do pacote `codemirror`, mas sem os recursos de editor de código
 * que não fazem sentido numa nota (números de linha, gutter, fold, autocompletar, fechamento
 * automático de colchetes/parênteses, casamento de parênteses).
 */
export function proseSetup() {
  return [
    highlightSpecialChars(),
    history(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    highlightSelectionMatches(),
    highlightActiveLine(),
    keymap.of([...defaultKeymap, ...searchKeymap, ...historyKeymap]),
  ];
}
