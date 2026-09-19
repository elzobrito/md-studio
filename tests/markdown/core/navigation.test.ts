import { describe, expect, it } from "vitest";
import {
  extractOutline,
  headingDomId,
  slugify,
} from "../../../src/services/navigation";

describe("navigation outline", () => {
  it("slugifies accents", () => {
    expect(slugify("Introdução Geral")).toBe("introducao-geral");
  });

  it("dedupes heading ids", () => {
    const md = "# A\n\n## B\n\n## B\n";
    const outline = extractOutline(md);
    expect(outline.map((o) => o.id)).toEqual(["a", "b", "b-1"]);
  });

  it("maps slug to dom id with sanitize prefix", () => {
    expect(headingDomId("introducao")).toBe("user-content-introducao");
  });
});
