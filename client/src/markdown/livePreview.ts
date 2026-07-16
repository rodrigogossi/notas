import { syntaxTree } from '@codemirror/language';
import type { Range } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

/**
 * Estilo Bear Notes: não existe alternância entre "editar" e "visualizar". O texto formatado
 * (negrito, título, link...) já aparece formatado o tempo todo; os caracteres de sintaxe
 * (`**`, `#`, `~~`, crases, `[]()`) só aparecem quando o cursor/seleção está em cima daquele
 * trecho. O estilo visual em si (negrito, tamanho de título, etc.) vem do HighlightStyle em
 * markdownTheme.ts — esta extensão só decide quando ESCONDER os marcadores de sintaxe.
 */

// marcadores que só existem para delimitar sintaxe — nunca fazem parte do conteúdo em si
const HIDDEN_MARK_TYPES = new Set([
  'HeaderMark',
  'QuoteMark',
  'EmphasisMark',
  'StrikethroughMark',
]);

function selectionOverlaps(view: EditorView, from: number, to: number): boolean {
  return view.state.selection.ranges.some((range) => range.from <= to && range.to >= from);
}

function buildDecorations(view: EditorView): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const tree = syntaxTree(view.state);

  function hideUnlessActive(markFrom: number, markTo: number, activeFrom: number, activeTo: number) {
    if (!selectionOverlaps(view, activeFrom, activeTo)) {
      ranges.push(Decoration.replace({}).range(markFrom, markTo));
    }
  }

  for (const { from, to } of view.visibleRanges) {
    tree.iterate({
      from,
      to,
      enter(node) {
        const { name } = node;

        if (HIDDEN_MARK_TYPES.has(name)) {
          const parent = node.node.parent;
          hideUnlessActive(node.from, node.to, parent?.from ?? node.from, parent?.to ?? node.to);
          return;
        }

        // as crases de código inline escondem; as de bloco de código (```) ficam sempre visíveis
        if (name === 'CodeMark' && node.node.parent?.name === 'InlineCode') {
          const parent = node.node.parent;
          hideUnlessActive(node.from, node.to, parent.from, parent.to);
          return;
        }

        // "[texto](url)" -> some com "[", "](url)" e mostra só "texto", exceto com o cursor em cima
        if (name === 'LinkMark' || name === 'URL') {
          let link = node.node.parent;
          while (link && link.name !== 'Link') link = link.parent;
          hideUnlessActive(node.from, node.to, link?.from ?? node.from, link?.to ?? node.to);
        }
      },
    });
  }

  return Decoration.set(ranges, true);
}

export function livePreview() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = buildDecorations(update.view);
        }
      }
    },
    { decorations: (plugin) => plugin.decorations },
  );
}
