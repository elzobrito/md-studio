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
});
