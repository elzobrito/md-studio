import { describe, expect, it } from "vitest";
import { htmlToMarkdown } from "../../src/editor/paste/html-to-md";
import { settingsStore } from "../../src/state/settings";

describe("HTML to Markdown (Smart Paste)", () => {
  it("converts h1 to # heading", () => {
    expect(htmlToMarkdown("<h1>Título</h1>")).toBe("# Título");
  });

  it("converts h2 to ## heading", () => {
    expect(htmlToMarkdown("<h2>Subtítulo</h2>")).toBe("## Subtítulo");
  });

  it("converts strong to **negrito**", () => {
    expect(htmlToMarkdown("<p>texto <strong>negrito</strong></p>")).toContain("**negrito**");
  });

  it("converts em / i to _itálico_", () => {
    expect(htmlToMarkdown("<p>texto <em>itálico</em></p>")).toContain("_itálico_");
    expect(htmlToMarkdown("<p>texto <i>itálico</i></p>")).toContain("_itálico_");
  });

  it("converts del / s to ~~tachado~~", () => {
    expect(htmlToMarkdown("<p>texto <s>tachado</s></p>")).toContain("~~tachado~~");
  });

  it("converts ul to unordered list", () => {
    const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";
    const md = htmlToMarkdown(html);
    expect(md).toContain("- Item 1");
    expect(md).toContain("- Item 2");
  });

  it("converts ol to numbered list", () => {
    const html = "<ol><li>Primeiro</li><li>Segundo</li></ol>";
    const md = htmlToMarkdown(html);
    expect(md).toContain("1. Primeiro");
    expect(md).toContain("2. Segundo");
  });

  it("converts a to markdown link", () => {
    const html = '<a href="https://exemplo.com">Texto</a>';
    expect(htmlToMarkdown(html)).toContain("[Texto](https://exemplo.com)");
  });

  it("converts img to markdown image", () => {
    const html = '<img src="https://exemplo.com/logo.png" alt="Logo" />';
    expect(htmlToMarkdown(html)).toBe("![Logo](https://exemplo.com/logo.png)");
  });

  it("converts code to inline code", () => {
    expect(htmlToMarkdown("<code>console.log()</code>")).toContain("`console.log()`");
  });

  it("converts pre code to code block", () => {
    const html = '<pre><code class="language-js">const x = 1;</code></pre>';
    const md = htmlToMarkdown(html);
    expect(md).toContain("```js\nconst x = 1;\n```");
  });

  it("converts blockquote", () => {
    const html = "<blockquote>Citação sábia</blockquote>";
    expect(htmlToMarkdown(html)).toBe("> Citação sábia");
  });

  it("leaves plain text unaltered", () => {
    expect(htmlToMarkdown("texto simples")).toBe("texto simples");
  });

  it("handles settings toggle for smart paste", () => {
    settingsStore.setSmartPaste(false);
    expect(settingsStore.getState().smartPaste).toBe(false);

    settingsStore.setSmartPaste(true);
    expect(settingsStore.getState().smartPaste).toBe(true);
  });
});
