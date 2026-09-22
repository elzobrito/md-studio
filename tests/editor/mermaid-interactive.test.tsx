import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MermaidBlock } from "../../src/components/MermaidBlock";
import { embedStylesInSvg } from "../../src/services/diagramExport";
import * as mermaidModule from "../../src/markdown/mermaid";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("Interactive Mermaid Component & Export", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it("embedStylesInSvg embeds styles into <defs> of SVG", () => {
    const styleEl = document.createElement("style");
    styleEl.id = "mermaid-test-styles";
    styleEl.textContent = ".node { fill: #f00; }";
    document.head.appendChild(styleEl);

    const rawSvg = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>';
    const embedded = embedStylesInSvg(rawSvg);

    expect(embedded).toContain("<defs");
    expect(embedded).toContain("</defs>");
    expect(embedded).toContain(".node { fill: #f00; }");
    expect(embedded).toContain('xmlns="http://www.w3.org/2000/svg"');

    styleEl.remove();
  });

  it("renders MermaidBlock toolbar and toggles between diagram and source", async () => {
    vi.spyOn(mermaidModule, "renderMermaid").mockResolvedValue({
      svg: '<svg id="test-svg"><text>Diagram Content</text></svg>',
    });

    const root = createRoot(container);
    await act(async () => {
      root.render(<MermaidBlock source={"graph TD\nA --> B"} />);
    });

    // Toolbar buttons
    expect(container.querySelector(".mermaid-badge-title")?.textContent).toContain("Mermaid");
    expect(container.querySelector(".mermaid-zoom-btn")).not.toBeNull();

    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>("button"));
    const copyBtn = buttons.find((b) => b.textContent?.includes("Copiar SVG"));
    const svgBtn = buttons.find((b) => b.textContent === "SVG");
    const pngBtn = buttons.find((b) => b.textContent === "PNG");
    const toggleBtn = buttons.find((b) => b.textContent?.includes("Fonte") || b.textContent?.includes("Diagrama"));

    expect(copyBtn).toBeDefined();
    expect(svgBtn).toBeDefined();
    expect(pngBtn).toBeDefined();
    expect(toggleBtn).toBeDefined();

    // Toggle to source
    await act(async () => {
      toggleBtn?.click();
    });

    expect(container.querySelector(".mermaid-chrome-source")?.textContent).toContain("graph TD\nA --> B");

    // Toggle back to diagram
    await act(async () => {
      toggleBtn?.click();
    });

    expect(container.querySelector(".mermaid-chrome-viewport")).not.toBeNull();

    act(() => {
      root.unmount();
    });
    vi.restoreAllMocks();
  });

  it("handles temporary syntax degradation gracefully during typing", async () => {
    let callCount = 0;
    vi.spyOn(mermaidModule, "renderMermaid").mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { svg: '<svg id="valid-svg"><text>Valid Diagram</text></svg>' };
      }
      return { error: "Parse error on line 2" };
    });

    const root = createRoot(container);

    // Initial valid render
    await act(async () => {
      root.render(<MermaidBlock source="graph TD\nA --> B" />);
    });

    expect(container.querySelector(".mermaid-panzoom-target")?.innerHTML).toContain("Valid Diagram");
    expect(container.querySelector(".mermaid-badge-degraded")).toBeNull();

    // Re-render with typing error (e.g. user typed partial text)
    await act(async () => {
      root.render(<MermaidBlock source="graph TD\nA -->" />);
    });

    // Must preserve the previous valid diagram and display degraded badge
    expect(container.querySelector(".mermaid-panzoom-target")?.innerHTML).toContain("Valid Diagram");
    expect(container.querySelector(".mermaid-badge-degraded")?.textContent).toContain("Sintaxe incompleta");

    act(() => {
      root.unmount();
    });
    vi.restoreAllMocks();
  });
});
