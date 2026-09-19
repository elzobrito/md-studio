import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  BacklinksPanel,
  backlinkCountLabel,
  backlinkGroupTitle,
} from "../../src/components/wiki/BacklinksPanel";
import { emptyBacklinks } from "../../src/lib/ipc/metadata";
import type { BacklinkResult } from "../../src/types/metadata";

const sample: BacklinkResult = {
  targetPath: "notes/guide.md",
  documentCount: 2,
  occurrenceCount: 3,
  groups: [
    {
      sourcePath: "notes/index.md",
      sourceTitle: "Index",
      occurrences: [
        { sourcePath: "notes/index.md", line: 4, context: "See [[guide]]" },
        { sourcePath: "notes/index.md", line: 9, context: null },
      ],
    },
    {
      sourcePath: "diario.md",
      sourceTitle: null,
      occurrences: [{ sourcePath: "diario.md", line: 1, context: "[[guide]]" }],
    },
  ],
};

describe("Onda 3 — Backlinks panel", () => {
  it("formats document and occurrence counts separately with pluralization", () => {
    expect(backlinkCountLabel(0, 0)).toBe("0 documentos · 0 referências");
    expect(backlinkCountLabel(1, 1)).toBe("1 documento · 1 referência");
    expect(backlinkCountLabel(2, 3)).toBe("2 documentos · 3 referências");
  });

  it("falls back to basename when title is missing", () => {
    expect(backlinkGroupTitle(sample.groups[1])).toBe("diario.md");
    expect(backlinkGroupTitle(sample.groups[0])).toBe("Index");
  });

  it("renders empty state without a second sidebar", () => {
    const html = renderToString(
      <BacklinksPanel result={emptyBacklinks("notes/guide.md")} />,
    );
    expect(html).toContain("Backlinks");
    expect(html).toContain("Nenhum backlink para este documento.");
    expect(html).not.toContain("sidebar");
    expect(html).not.toContain("column");
  });

  it("renders groups, lines, null context, tree a11y and retry", () => {
    const html = renderToString(
      <BacklinksPanel
        result={sample}
        error={null}
        onRetry={() => undefined}
      />,
    );
    expect(html).toContain("2 documentos · 3 referências");
    expect(html).toContain("Index");
    expect(html).toContain("diario.md");
    expect(html).toContain("Linha <!-- -->4");
    expect(html).toContain("See [[guide]]");
    expect(html).toContain("Linha <!-- -->9");
    expect(html).toContain('role="tree"');
    expect(html).toContain("aria-expanded");
    expect(html).toContain("aria-selected");
    expect(html).not.toContain("grafo");
  });

  it("renders loading and error+retry using the shared button", () => {
    const loading = renderToString(
      <BacklinksPanel result={emptyBacklinks()} loading />,
    );
    expect(loading).toContain("Carregando backlinks");
    const errored = renderToString(
      <BacklinksPanel
        result={emptyBacklinks()}
        error="falha de índice"
        onRetry={() => undefined}
      />,
    );
    expect(errored).toContain("falha de índice");
    expect(errored).toContain("Tentar de novo");
    expect(errored).toContain("btn");
  });
});
