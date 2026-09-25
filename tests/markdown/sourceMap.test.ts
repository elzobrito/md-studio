import { describe, expect, it } from "vitest";
import {
  attachSourcePositionsToHast,
  findSourcePositionFromElement,
} from "../../src/markdown/sourceMap";
import { processMarkdown } from "../../src/markdown/processor";

describe("Preview ↔ Source Mapping por bloco (MD-V03-019)", () => {
  it("attaches data-source-line to headings, paragraphs, lists, and code blocks during preview processing", async () => {
    const markdown = [
      "# Introdução",
      "",
      "Este é o primeiro parágrafo.",
      "",
      "- Item 1",
      "- Item 2",
      "",
      "```typescript",
      "const a = 1;",
      "```",
    ].join("\n");

    const res = await processMarkdown(markdown);

    const div = document.createElement("div");
    div.innerHTML = res.html;

    const heading = div.querySelector("h1");
    expect(heading).not.toBeNull();
    expect(heading?.getAttribute("data-source-line")).toBe("1");

    const paragraph = div.querySelector("p");
    expect(paragraph).not.toBeNull();
    expect(paragraph?.getAttribute("data-source-line")).toBe("3");

    const list = div.querySelector("ul");
    expect(list).not.toBeNull();
    expect(list?.getAttribute("data-source-line")).toBe("5");

    const code = div.querySelector("pre");
    expect(code).not.toBeNull();
    expect(code?.getAttribute("data-source-line")).toBe("8");
  });

  it("finds source position when clicking on an annotated block element", () => {
    const container = document.createElement("div");
    const p = document.createElement("p");
    p.setAttribute("data-source-line", "12");
    p.setAttribute("data-source-offset", "145");

    const span = document.createElement("span");
    span.textContent = "Texto interno";
    p.appendChild(span);
    container.appendChild(p);

    const pos = findSourcePositionFromElement(span, container);
    expect(pos).toEqual({ line: 12, offset: 145 });
  });

  it("returns null when clicking an element without reliable source position", () => {
    const container = document.createElement("div");
    const div = document.createElement("div");
    div.textContent = "Elemento sintético sem posição";
    container.appendChild(div);

    const pos = findSourcePositionFromElement(div, container);
    expect(pos).toBeNull();
  });
});
