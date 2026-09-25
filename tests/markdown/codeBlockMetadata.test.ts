import { describe, expect, it } from "vitest";
import {
  parseCodeBlockMetadata,
  parseRangeString,
  groupAdjacentCodeTabs,
} from "../../src/markdown/codeBlockMetadata";

describe("Code Blocks Avançados (MD-V03-018)", () => {
  it("parses range strings correctly", () => {
    const range = parseRangeString("1,3-5,8");
    expect(Array.from(range)).toEqual([1, 3, 4, 5, 8]);
  });

  it("parses filename and highlighted lines from fence metadata", () => {
    const meta = parseCodeBlockMetadata('filename="server.ts" {1,3-5}', "typescript");

    expect(meta.lang).toBe("typescript");
    expect(meta.filename).toBe("server.ts");
    expect(Array.from(meta.highlightLines)).toEqual([1, 3, 4, 5]);
    expect(meta.showLineNumbers).toBe(false);
  });

  it("parses embedded filename in lang and focus lines", () => {
    const meta = parseCodeBlockMetadata("focus={2-4} showLineNumbers", "python:main.py");

    expect(meta.lang).toBe("python");
    expect(meta.filename).toBe("main.py");
    expect(Array.from(meta.focusLines)).toEqual([2, 3, 4]);
    expect(meta.showLineNumbers).toBe(true);
  });

  it("parses tab title for code groups", () => {
    const meta = parseCodeBlockMetadata("[tab:App.tsx]", "tsx");
    expect(meta.tabTitle).toBe("App.tsx");
  });

  it("leaves standard code block with no extra metadata unchanged", () => {
    const meta = parseCodeBlockMetadata("", "rust");
    expect(meta.lang).toBe("rust");
    expect(meta.filename).toBeUndefined();
    expect(meta.tabTitle).toBeUndefined();
    expect(meta.highlightLines.size).toBe(0);
    expect(meta.focusLines.size).toBe(0);
    expect(meta.showLineNumbers).toBe(false);
  });

  it("groups adjacent tabbed code blocks and switches tabs without eval or reparsing", () => {
    const container = document.createElement("div");

    const block1 = document.createElement("div");
    block1.className = "code-block-container";
    block1.setAttribute("data-tab-title", "Tab 1");
    block1.innerHTML = "<pre><code>console.log(1)</code></pre>";

    const block2 = document.createElement("div");
    block2.className = "code-block-container";
    block2.setAttribute("data-tab-title", "Tab 2");
    block2.innerHTML = "<pre><code>console.log(2)</code></pre>";

    container.appendChild(block1);
    container.appendChild(block2);

    groupAdjacentCodeTabs(container);

    const group = container.querySelector(".code-group-container");
    expect(group).not.toBeNull();

    const tabs = container.querySelectorAll(".code-group-tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0].textContent).toBe("Tab 1");
    expect(tabs[1].textContent).toBe("Tab 2");

    // Initially Tab 1 is visible, Tab 2 is hidden
    expect(block1.style.display).toBe("block");
    expect(block2.style.display).toBe("none");

    // Click Tab 2
    (tabs[1] as HTMLButtonElement).click();
    expect(block1.style.display).toBe("none");
    expect(block2.style.display).toBe("block");
  });
});
