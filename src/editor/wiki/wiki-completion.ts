import { Prec } from "@codemirror/state";
import { keymap, ViewPlugin, type EditorView, type ViewUpdate } from "@codemirror/view";

export interface WikiDocumentCandidate {
  path: string;
  title: string | null;
  headings?: Array<{ depth: number; text: string; anchor: string }>;
  blocks?: Array<{ id: string; snippet?: string }>;
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

export interface WikiCandidateOptions {
  exactMatch?: boolean;
  limit?: number;
  placeholders?: readonly string[];
}

export function wikiCandidates(
  documents: readonly WikiDocumentCandidate[],
  query: string,
  options?: WikiCandidateOptions,
): WikiCompletionItem[] {
  const needle = query.trim().toLocaleLowerCase();
  const seen = new Set<string>();
  const limit = options?.limit ?? 12;
  const exact = options?.exactMatch ?? false;
  const placeholders = options?.placeholders ?? [];

  if (needle.includes("#^")) {
    const parts = needle.split("#^");
    const docQuery = parts[0].trim();
    const blockQuery = parts.slice(1).join("#^").trim();
    const items: WikiCompletionItem[] = [];

    for (const doc of documents) {
      const normalized = doc.path.replace(/\\/g, "/");
      const stem = normalized.split("/").pop()?.replace(/\.md$/i, "") || normalized;
      const target = doc.title?.trim() || stem;

      if (!docQuery || target.toLocaleLowerCase().includes(docQuery) || normalized.toLocaleLowerCase().includes(docQuery)) {
        if (doc.blocks) {
          for (const b of doc.blocks) {
            if (!blockQuery || b.id.toLocaleLowerCase().includes(blockQuery)) {
              items.push({
                label: `${target}#^${b.id}`,
                detail: b.snippet ? `^${b.id}: ${b.snippet}` : `${normalized} #^${b.id}`,
                target: `${target}#^${b.id}`,
              });
            }
          }
        }
      }
    }
    return items.slice(0, limit);
  }

  if (needle.includes("#")) {
    const parts = needle.split("#");
    const docQuery = parts[0].trim();
    const subQuery = parts.slice(1).join("#").trim();
    const isBlockQuery = subQuery.startsWith("^");
    const cleanSubQuery = isBlockQuery ? subQuery.slice(1).trim() : subQuery;
    const items: WikiCompletionItem[] = [];

    for (const doc of documents) {
      const normalized = doc.path.replace(/\\/g, "/");
      const stem = normalized.split("/").pop()?.replace(/\.md$/i, "") || normalized;
      const target = doc.title?.trim() || stem;

      if (!docQuery || target.toLocaleLowerCase().includes(docQuery) || normalized.toLocaleLowerCase().includes(docQuery)) {
        if (!isBlockQuery && doc.headings) {
          for (const h of doc.headings) {
            if (!cleanSubQuery || h.text.toLocaleLowerCase().includes(cleanSubQuery) || h.anchor.includes(cleanSubQuery)) {
              items.push({
                label: `${target}#${h.text}`,
                detail: `${normalized} #${h.anchor}`,
                target: `${target}#${h.text}`,
              });
            }
          }
        }
        if ((isBlockQuery || !cleanSubQuery) && doc.blocks) {
          for (const b of doc.blocks) {
            if (!cleanSubQuery || b.id.toLocaleLowerCase().includes(cleanSubQuery)) {
              items.push({
                label: `${target}#^${b.id}`,
                detail: b.snippet ? `^${b.id}: ${b.snippet}` : `${normalized} #^${b.id}`,
                target: `${target}#^${b.id}`,
              });
            }
          }
        }
      }
    }
    return items.slice(0, limit);
  }

  const results: WikiCompletionItem[] = [];

  for (const document of documents) {
    const normalized = document.path.replace(/\\/g, "/");
    const stem = normalized.split("/").pop()?.replace(/\.md$/i, "") || normalized;
    const target = document.title?.trim() || stem;
    const key = target.toLocaleLowerCase();
    const matches = !needle
      ? true
      : exact
      ? key === needle || normalized.toLocaleLowerCase() === needle
      : key.includes(needle) || normalized.toLocaleLowerCase().includes(needle);

    if (matches && !seen.has(key)) {
      seen.add(key);
      results.push({ label: target, detail: normalized, target });
    }
  }

  // Include matching registered placeholders
  for (const placeholder of placeholders) {
    const key = placeholder.trim().toLocaleLowerCase();
    if (!key || seen.has(key)) continue;
    const matches = !needle ? true : exact ? key === needle : key.includes(needle);
    if (matches) {
      seen.add(key);
      results.push({
        label: placeholder.trim(),
        detail: "placeholder (nota futura)",
        target: placeholder.trim(),
      });
    }
  }

  return results.sort((a, b) => a.label.localeCompare(b.label)).slice(0, limit);
}

export function detectWikiCompletion(
  view: EditorView,
  documents: readonly WikiDocumentCandidate[],
  options?: WikiCandidateOptions,
): WikiCompletionState | null {
  const selection = view.state.selection.main;
  if (!selection.empty) return null;
  const line = view.state.doc.lineAt(selection.head);
  const before = line.text.slice(0, selection.head - line.from);
  const match = before.match(/\[\[([^\]|\n]*)$/);
  if (!match) return null;

  const query = match[1];
  const from = selection.head - query.length;
  const items = wikiCandidates(documents, query, options);
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
  getOptions?: () => WikiCandidateOptions | undefined,
) {
  let current: WikiCompletionState | null = null;
  const publish = (next: WikiCompletionState | null) => {
    current = next;
    onChange(next);
  };

  const plugin = ViewPlugin.fromClass(class {
    constructor(view: EditorView) {
      publish(detectWikiCompletion(view, getDocuments(), getOptions?.()));
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet) {
        publish(detectWikiCompletion(update.view, getDocuments(), getOptions?.()));
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
