import { RangeSet, RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { GutterMarker, gutter } from "@codemirror/view";
import type { FileDiffGutter } from "../../contracts/types";
import "../../styles/git-gutter.css";

export const setGitDiffEffect = StateEffect.define<FileDiffGutter>();

type DiffMarkerKind = "added" | "modified" | "deleted";

class GitDiffGutterMarker extends GutterMarker {
  constructor(readonly kind: DiffMarkerKind) {
    super();
  }

  toDOM() {
    const el = document.createElement("div");
    el.className = `cm-git-diff-marker cm-git-diff-${this.kind}`;
    el.title = `Git: ${this.kind === "added" ? "Linha adicionada" : this.kind === "modified" ? "Linha modificada" : "Linha excluída"}`;
    return el;
  }
}

export const gitDiffField = StateField.define<RangeSet<GutterMarker>>({
  create() {
    return RangeSet.empty;
  },
  update(markers, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setGitDiffEffect)) {
        const diff = effect.value;
        const builder = new RangeSetBuilder<GutterMarker>();
        const totalLines = tr.state.doc.lines;

        // Adiciona marcadores respeitando ordem de linha no documento
        const allMarkers: Array<{ line: number; kind: DiffMarkerKind }> = [];

        for (const line of diff.addedLines) {
          if (line >= 1 && line <= totalLines) allMarkers.push({ line, kind: "added" });
        }
        for (const line of diff.modifiedLines) {
          if (line >= 1 && line <= totalLines) allMarkers.push({ line, kind: "modified" });
        }
        for (const line of diff.deletedLines) {
          if (line >= 1 && line <= totalLines) allMarkers.push({ line, kind: "deleted" });
        }

        allMarkers.sort((a, b) => a.line - b.line);

        for (const m of allMarkers) {
          const docLine = tr.state.doc.line(m.line);
          builder.add(docLine.from, docLine.from, new GitDiffGutterMarker(m.kind));
        }

        return builder.finish();
      }
    }
    return markers.map(tr.changes);
  },
});

export function createGitDiffGutter() {
  return [
    gitDiffField,
    gutter({
      class: "cm-git-diff-gutter",
      markers: (view) => view.state.field(gitDiffField),
    }),
  ];
}
