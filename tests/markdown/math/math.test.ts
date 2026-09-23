import { describe, expect, it } from "vitest";
import { renderMath } from "../../../src/markdown/math";

describe("math", () => {
  it("renders simple expression or fails closed", () => {
    const r = renderMath("x+1", false);
    expect(r.html || r.error).toBeTruthy();
  });
});

describe("untrusted KaTeX input", () => {
  it("does not turn HTML/CSS macros into executable elements or positioning styles", () => {
    const source = String.raw`\htmlStyle{position:fixed;inset:0;z-index:9999}{x} \href{javascript:alert(1)}{x}`;
    const rendered = renderMath(source, false);
    const root = document.createElement("div");
    root.innerHTML = rendered.html;
    expect(root.querySelector("script, iframe, img")).toBeNull();
    expect([...root.querySelectorAll<HTMLElement>("[style]")].every((node) =>
      !/position\s*:|inset\s*:|z-index\s*:/i.test(node.getAttribute("style") ?? ""),
    )).toBe(true);
    expect(root.querySelector('a[href^="javascript:"]')).toBeNull();
  });
});
