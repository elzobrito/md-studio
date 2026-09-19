import { describe, expect, it } from "vitest";
import { parseFrontmatter } from "../../../src/markdown/frontmatter";

describe("frontmatter", () => {
  it("parses title", () => {
    const r = parseFrontmatter("title: Demo\n");
    expect(r.data.title).toBe("Demo");
    expect(r.errors).toEqual([]);
  });
});
