import { describe, expect, it } from "vitest";
import {
  extractOutline,
  headingDomId,
  resolveRelativeLink,
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

describe("resolveRelativeLink", () => {
  it("resolves sibling files in root", () => {
    expect(resolveRelativeLink("README.md", "outro.md")).toBe("outro.md");
  });

  it("resolves sibling files in subdirectories", () => {
    expect(resolveRelativeLink("docs/intro.md", "detalhes.md")).toBe("docs/detalhes.md");
    expect(resolveRelativeLink("docs/intro.md", "./detalhes.md")).toBe("docs/detalhes.md");
  });

  it("resolves parent directory navigation with ../", () => {
    expect(resolveRelativeLink("docs/user-guide/MARKDOWN_GUIDE.md", "../README.md")).toBe("docs/README.md");
    expect(resolveRelativeLink("docs/intro.md", "../README.md")).toBe("README.md");
  });

  it("handles leading slashes as workspace-relative", () => {
    expect(resolveRelativeLink("docs/intro.md", "/README.md")).toBe("README.md");
    expect(resolveRelativeLink("docs/intro.md", "/docs/detalhes.md")).toBe("docs/detalhes.md");
  });

  it("clamps excessive parent traversals safely within workspace", () => {
    expect(resolveRelativeLink("docs/intro.md", "../../../README.md")).toBe("README.md");
  });
});
