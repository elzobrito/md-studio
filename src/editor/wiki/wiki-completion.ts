import { Prec } from "@codemirror/state";
import { keymap, ViewPlugin, type EditorView, type ViewUpdate } from "@codemirror/view";

export interface WikiDocumentCandidate {
  path: string;
  title: string | null;
}

export interface WikiCompletionItem {
  label: string;
  detail: string;
  target: string;
}

export interface WikiCompletionState {
  from: number;
  to: number;
  query: string;
  selected: number;
  items: WikiCompletionItem[];
  coords: { left: number; bottom: number } | null;
}

export function wikiCandidates(
  documents: readonly WikiDocumentCandidate[],
  query: string,
): WikiCompletionItem[] {
  const needle = query.trim().toLocaleLowerCase();
  const seen = new Set<string>();
  return documents
    .map((document) => {
      const normalized = document.path.replace(/\\/g, "/");
      const stem = normalized.split("/").pop()?.replace(/\.md$/i, "") || normalized;
      const target = document.title?.trim() || stem;
      return { label: target, detail: normalized, target };
    })
    .filter((item) => {
      const key = item.target.toLocaleLowerCase();
      const matches = !needle
        || key.includes(needle)
        || item.detail.toLocaleLowerCase().includes(needle);
      if (!matches || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.label.localeCompare(b.label))
    .slice(0, 12);
}

export function detectWikiCompletion(
  view: EditorView,
  documents: readonly WikiDocumentCandidate[],
): WikiCompletionState | null {
  const selection = view.state.selection.main;
  if (!selection.empty) return null;
  const line = view.state.doc.lineAt(selection.head);
  const before = line.text.slice(0, selection.head - line.from);
  const match = before.match(/\[\[([^\]|\n]*)$/);
  if (!match) return null;

  const query = match[1];
  const from = selection.head - query.length;
  const items = wikiCandidates(documents, query);
  if (!items.length) return null;
  const rect = view.coordsAtPos(selection.head);
  return {
    from,
    to: selection.head,
    query,
    selected: 0,
    items,
    coords: rect ? { left: rect.left, bottom: rect.bottom } : null,
  };
}

export function insertWikiCompletion(
  view: EditorView,
  state: WikiCompletionState,
  item: WikiCompletionItem,
): void {
  view.dispatch({
    changes: { from: state.from, to: state.to, insert: `${item.target}]]` },
    selection: { anchor: state.from + item.target.length + 2 },
  });
  view.focus();
}

export function createWikiCompletionExtensions(
  getDocuments: () => readonly WikiDocumentCandidate[],
  onChange: (state: WikiCompletionState | null) => void,
) {
  let current: WikiCompletionState | null = null;
  const publish = (next: WikiCompletionState | null) => {
    current = next;
    onChange(next);
  };

  const plugin = ViewPlugin.fromClass(class {
    constructor(view: EditorView) {
      publish(detectWikiCompletion(view, getDocuments()));
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet) {
        publish(detectWikiCompletion(update.view, getDocuments()));
      }
    }

    destroy() {
      publish(null);
    }
  });

  const keys = Prec.highest(keymap.of([
    {
      key: "Escape",
      run: () => {
        if (!current) return false;
        publish(null);
        return true;
      },
    },
    {
      key: "ArrowDown",
      run: () => {
        if (!current) return false;
        publish({ ...current, selected: (current.selected + 1) % current.items.length });
        return true;
      },
    },
    {
      key: "ArrowUp",
      run: () => {
        if (!current) return false;
        publish({
          ...current,
          selected: (current.selected - 1 + current.items.length) % current.items.length,
        });
        return true;
      },
    },
    {
      key: "Enter",
      run: (view) => {
        if (!current) return false;
        insertWikiCompletion(view, current, current.items[current.selected]);
        publish(null);
        return true;
      },
    },
  ]));

  return [plugin, keys];
}
