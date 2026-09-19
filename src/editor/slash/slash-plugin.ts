import { syntaxTree } from "@codemirror/language";
import type { EditorView } from "@codemirror/view";
import { ViewPlugin, type ViewUpdate } from "@codemirror/view";
import type { SlashItem } from "./slash-items";

export interface SlashState {
  isOpen: boolean;
  query: string;
  slashFrom: number;
  slashTo: number;
  coords: { top: number; left: number; bottom: number } | null;
}

export function isInsideCode(view: EditorView, pos: number): boolean {
  try {
    const tree = syntaxTree(view.state);
    const node = tree.resolveInner(pos, -1);
    for (let cur: typeof node | null = node; cur; cur = cur.parent) {
      const name = cur.name.toLowerCase();
      if (name.includes("code") || name.includes("fenced")) {
        return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

export function detectSlashCommand(view: EditorView): SlashState | null {
  const { state } = view;
  const sel = state.selection.main;
  if (!sel.empty) return null;

  const pos = sel.from;
  if (isInsideCode(view, pos)) return null;

  const line = state.doc.lineAt(pos);
  const textBefore = line.text.slice(0, pos - line.from);

  // Match / only at line start (or following only leading whitespace)
  const match = textBefore.match(/^(\s*)\/([a-zA-Z0-9_\-]*)$/);
  if (!match) return null;

  const indentLength = match[1].length;
  const slashFrom = line.from + indentLength;
  const slashTo = pos;
  const query = match[2];

  let coords: { top: number; left: number; bottom: number } | null = null;
  try {
    const rect = view.coordsAtPos(pos);
    if (rect) {
      coords = { top: rect.top, left: rect.left, bottom: rect.bottom };
    }
  } catch {
    // fallback
  }

  return {
    isOpen: true,
    query,
    slashFrom,
    slashTo,
    coords,
  };
}

export function executeSlashItem(
  view: EditorView,
  item: SlashItem,
  slashState: Pick<SlashState, "slashFrom" | "slashTo">
): void {
  // 1. Remove the / and query
  view.dispatch({
    changes: { from: slashState.slashFrom, to: slashState.slashTo, insert: "" },
    selection: { anchor: slashState.slashFrom },
  });

  // 2. Insert item template
  item.insert(view);
}

export function createSlashPlugin(onSlashStateChange: (state: SlashState | null) => void) {
  return ViewPlugin.fromClass(
    class {
      constructor(public view: EditorView) {
        this.check(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet) {
          this.check(update.view);
        }
      }

      check(view: EditorView) {
        const slashState = detectSlashCommand(view);
        onSlashStateChange(slashState);
      }

      destroy() {
        onSlashStateChange(null);
      }
    }
  );
}
