import { describe, expect, it } from "vitest";
import { fuzzyScore, fuzzySearch } from "../../src/utils/fuzzy-search";

describe("fuzzy search", () => {
  it("scores exact matches highest", () => {
    const scoreExact = fuzzyScore("readme.md", "readme.md");
    const scorePartial = fuzzyScore("rdm", "readme.md");
    expect(scoreExact).toBeGreaterThan(scorePartial);
  });

  it("returns zero for non-matching queries", () => {
    const score = fuzzyScore("xyz", "document.md");
    expect(score).toBe(0);
  });

  it("ranks matching items with fuzzySearch", () => {
    const items = [
      { name: "notes.md", path: "notes.md" },
      { name: "readme.md", path: "readme.md" },
      { name: "package.json", path: "package.json" },
    ];
    const results = fuzzySearch("read", items);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("readme.md");
  });
});
