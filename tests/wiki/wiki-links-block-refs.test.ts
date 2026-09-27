import { describe, expect, it } from "vitest";
import { rehypeWikiLinks, parseWikiTarget } from "../../src/markdown/plugins/wiki-links";

describe("wiki links block references & placeholders", () => {
  it("parses wiki target into document and block/heading components", () => {
    expect(parseWikiTarget("Architecture#^atomic-save")).toEqual({
      docTarget: "Architecture",
      blockId: "atomic-save",
    });

    expect(parseWikiTarget("^local-block")).toEqual({
      docTarget: "",
      blockId: "local-block",
    });

    expect(parseWikiTarget("Architecture#Persistence Layer")).toEqual({
      docTarget: "Architecture",
      heading: "Persistence Layer",
    });

    expect(parseWikiTarget("SimpleDoc")).toEqual({
      docTarget: "SimpleDoc",
    });
  });

  it("transforms AST with block references, anchors and placeholder status", () => {
    const tree: any = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "p",
          children: [
            {
              type: "text",
              value: "Este parágrafo possui um ID terminal ^meu-bloco",
            },
          ],
        },
        {
          type: "element",
          tagName: "p",
          children: [
            {
              type: "text",
              value: "Veja [[Architecture#^meu-bloco]] e também [[nota-futura]].",
            },
          ],
        },
      ],
    };

    const plugin = rehypeWikiLinks({
      resolutions: [
        {
          target: "Architecture",
          status: "resolved",
          path: "docs/Architecture.md",
        },
      ],
      placeholders: ["nota-futura"],
    });

    plugin(tree);

    // 1. Paragraph 1 should have id "block-meu-bloco" and block-anchor child
    const p1 = tree.children[0];
    expect(p1.properties?.id).toBe("block-meu-bloco");
    expect(p1.properties?.dataBlockId).toBe("meu-bloco");
    expect(p1.children.some((c: any) => c.properties?.className?.includes("block-anchor"))).toBe(true);

    // 2. Paragraph 2 should have wiki links for Architecture#^meu-bloco and nota-futura
    const p2 = tree.children[1];
    const linkNodes = p2.children.filter((c: any) => c.tagName === "a");
    expect(linkNodes).toHaveLength(2);

    const blockRefLink = linkNodes[0];
    expect(blockRefLink.properties.dataBlockId).toBe("meu-bloco");
    expect(blockRefLink.properties.dataWikiStatus).toBe("resolved");

    const placeholderLink = linkNodes[1];
    expect(placeholderLink.properties.dataWikiStatus).toBe("placeholder");
    expect(placeholderLink.properties.className).toContain("is-placeholder");
  });
});
