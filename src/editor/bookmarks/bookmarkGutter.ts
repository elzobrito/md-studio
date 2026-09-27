import { RangeSet, RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { GutterMarker, gutter } from "@codemirror/view";
import "../../styles/bookmarks.css";

export const setBookmarksEffect = StateEffect.define<number[]>();

class BookmarkGutterMarker extends GutterMarker {
  constructor(readonly lineNo: number) {
    super();
  }

  toDOM() {
    const el = document.createElement("div");
    el.className = "cm-bookmark-marker";
    el.title = `Bookmark na linha ${this.lineNo}`;
    el.setAttribute("aria-label", `Marcador linha ${this.lineNo}`);
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
    return el;
  }
}

export const bookmarkField = StateField.define<RangeSet<GutterMarker>>({
  create() {
    return RangeSet.empty;
  },
  update(markers, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setBookmarksEffect)) {
        const lines = effect.value;
        const builder = new RangeSetBuilder<GutterMarker>();
        const sorted = Array.from(new Set(lines)).sort((a, b) => a - b);
        for (const lineNo of sorted) {
          if (lineNo >= 1 && lineNo <= tr.state.doc.lines) {
            const line = tr.state.doc.line(lineNo);
            builder.add(line.from, line.from, new BookmarkGutterMarker(lineNo));
          }
        }
        return builder.finish();
      }
    }
    return markers.map(tr.changes);
  },
});

export function createBookmarkGutter(onMarkerClick?: (line: number) => void) {
  return [
    bookmarkField,
    gutter({
      class: "cm-bookmark-gutter",
      markers: (view) => view.state.field(bookmarkField),
      domEventHandlers: {
        mousedown(view, line) {
          if (onMarkerClick) {
            const lineNo = view.state.doc.lineAt(line.from).number;
            onMarkerClick(lineNo);
            return true;
          }
          return false;
        },
      },
    }),
  ];
}
