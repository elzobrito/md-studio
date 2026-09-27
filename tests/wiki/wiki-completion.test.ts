import { describe, expect, it } from "vitest";
import { wikiCandidates } from "../../src/editor/wiki/wiki-completion";

const documents = [
  { path: "docs/architecture.md", title: "Architecture" },
  { path: "notes/api.md", title: "API Guide" },
  { path: "README.md", title: null },
];

describe("wiki completion candidates", () => {
  it("filters by title or path and sorts labels", () => {
    expect(wikiCandidates(documents, "a").map((item) => item.label)).toEqual([
      "API Guide",
      "Architecture",
      "README",
    ]);
    expect(wikiCandidates(documents, "notes")[0]?.target).toBe("API Guide");
  });

  it("deduplicates targets case-insensitively", () => {
    expect(
      wikiCandidates([...documents, { path: "other.md", title: "architecture" }], "architecture"),
    ).toHaveLength(1);
  });

  it("completes block references with ^ syntax", () => {
    const docsWithBlocks = [
      {
        path: "docs/architecture.md",
        title: "Architecture",
        blocks: [
          { id: "atomic-save", snippet: "Atomic save details" },
          { id: "path-fencing", snippet: "Security boundary" },
        ],
      },
    ];

    const results = wikiCandidates(docsWithBlocks, "Architecture#^");
    expect(results).toHaveLength(2);
    expect(results[0].target).toBe("Architecture#^atomic-save");
    expect(results[1].target).toBe("Architecture#^path-fencing");

    const filtered = wikiCandidates(docsWithBlocks, "Architecture#^atomic");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].label).toBe("Architecture#^atomic-save");
  });

  it("suggests registered placeholders as intentional future notes", () => {
    const results = wikiCandidates(documents, "nota", {
      placeholders: ["nota-futura", "outra-ideia"],
    });
    expect(results.some((r) => r.target === "nota-futura")).toBe(true);
    expect(results.find((r) => r.target === "nota-futura")?.detail).toBe("placeholder (nota futura)");
  });
});
