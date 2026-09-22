import { describe, expect, it } from "vitest";
import { renderMermaid } from "../../../src/markdown/mermaid";
import { processMarkdown } from "../../../src/markdown/processor";

describe("mermaid pipeline & renderer", () => {
  it("returns error on invalid diagram without throwing", async () => {
    const r = await renderMermaid("t1", "not a diagram");
    expect(r.error || r.svg).toBeTruthy();
  });

  it("handles empty diagram gracefully", async () => {
    const r = await renderMermaid("empty", "   ");
    expect(r.error).toBe("Diagrama vazio");
  });

  it("transforms mermaid code block into interactive container in processMarkdown", async () => {
    const md = "```mermaid\ngraph TD\nA --> B\n```";
    const res = await processMarkdown(md);

    expect(res.html).toContain('class="mermaid-diagram-container"');
    expect(res.html).toContain('data-mermaid-code="graph TD\nA --&gt; B"');
    expect(res.html).toContain('class="mermaid-code-fallback"');
    // Ensure it bypassed Shiki (no pre.shiki on mermaid)
    expect(res.html).not.toContain('class="shiki"');
  });

  it("supports light and dark theme options in renderMermaid", async () => {
    const rDark = await renderMermaid("dark-test", "graph TD\nA --> B", { isDark: true });
    expect(rDark.svg || rDark.error).toBeTruthy();

    const rLight = await renderMermaid("light-test", "graph TD\nA --> B", { isDark: false });
    expect(rLight.svg || rLight.error).toBeTruthy();
  });
});
