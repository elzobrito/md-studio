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

let pendingLine: number | null = null;
let highlightTimer: number | null = null;

export function queueGoToLine(line: number) {
  pendingLine = line;
}

export function consumeQueuedGoToLine(): number | null {
  const line = pendingLine;
  pendingLine = null;
  return line;
}

export function goToLineWithHighlight(view: EditorView, line: number) {
  const valid = Math.max(1, Math.min(line, view.state.doc.lines));
  const info = view.state.doc.line(valid);
  pendingLine = null;
  view.dispatch({
    selection: { anchor: info.from },
    effects: [setHighlight.of(valid), EditorView.scrollIntoView(info.from)],
    scrollIntoView: true,
  });
  view.focus();
  if (highlightTimer != null) window.clearTimeout(highlightTimer);
  highlightTimer = window.setTimeout(() => {
    view.dispatch({ effects: setHighlight.of(null) });
    highlightTimer = null;
  }, 1200);
}
