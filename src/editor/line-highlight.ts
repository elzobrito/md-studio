import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";

const setHighlight = StateEffect.define<number | null>();
const highlightMark = Decoration.line({ class: "cm-backlink-line" });

export const backlinkLineHighlight = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(deco, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setHighlight)) {
        if (effect.value == null) return Decoration.none;
        const lineNo = Math.max(1, Math.min(effect.value, tr.state.doc.lines));
        const line = tr.state.doc.line(lineNo);
        return Decoration.set([highlightMark.range(line.from)]);
      }
    }
    return deco.map(tr.changes);
  },
  provide: (field) => EditorView.decorations.from(field),
});

export const backlinkLineTheme = EditorView.theme({
  ".cm-backlink-line": {
    backgroundColor: "var(--accent-soft)",
  },
});

export interface QueuedLineTarget {
  line: number;
  col?: number;
}

let pendingTarget: QueuedLineTarget | null = null;
let highlightTimer: number | null = null;

export function queueGoToLine(line: number, col?: number) {
  pendingTarget = { line, col };
}

export function consumeQueuedGoToLine(): QueuedLineTarget | null {
  const target = pendingTarget;
  pendingTarget = null;
  return target;
}

export function goToLineWithHighlight(view: EditorView, line: number, col?: number) {
  const valid = Math.max(1, Math.min(line, view.state.doc.lines));
  const info = view.state.doc.line(valid);
  pendingTarget = null;
  const colOffset = col != null && col > 1 ? Math.min(col - 1, info.length) : 0;
  const targetPos = info.from + colOffset;

  view.dispatch({
    selection: { anchor: targetPos },
    effects: [setHighlight.of(valid), EditorView.scrollIntoView(targetPos)],
    scrollIntoView: true,
  });
  view.focus();
  if (highlightTimer != null) window.clearTimeout(highlightTimer);
  highlightTimer = window.setTimeout(() => {
    view.dispatch({ effects: setHighlight.of(null) });
    highlightTimer = null;
  }, 1200);
}
