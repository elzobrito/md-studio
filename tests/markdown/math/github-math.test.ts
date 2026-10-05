import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { processMarkdown } from "../../../src/markdown/processor";

const require = createRequire(import.meta.url);

const HAVERSINE = [
  "$$a=\\sin^2\\left(\\frac{\\Delta\\varphi}{2}\\right)+\\cos(\\varphi_1)\\cos(\\varphi_2)\\sin^2\\left(\\frac{\\Delta\\lambda}{2}\\right)$$ $$d=2R\\,\\mathrm{atan2}(\\sqrt{a},\\sqrt{1-a})$$",
  "",
  "O raio usado é $R=6.371.000$ m (ou 6.371 km, conforme a unidade).",
  "",
  "$$v_{km/h}=3{,}6\\,v_{m/s}\\qquad v_{m/s}=\\frac{v_{km/h}}{3{,}6}$$",
].join("\n");

describe("GitHub-flavored math in the preview pipeline", () => {
  it("entrypoint imports KaTeX CSS so MathML and HTML layers do not concatenate", () => {
    const main = readFileSync(path.join(process.cwd(), "src/main.tsx"), "utf8");
    expect(main).toMatch(/import\s+["']katex\/dist\/katex\.min\.css["']/);
    const cssPath = require.resolve("katex/dist/katex.min.css");
    const css = readFileSync(cssPath, "utf8");
    expect(css).toContain(".katex-mathml");
    expect(css).toContain("clip:rect(1px,1px,1px,1px)");
  });

  it("renders FuelControl-style display and inline GitHub math as KaTeX", async () => {
    const html = (await processMarkdown(HAVERSINE)).html;
    expect(html).toContain("katex");
    expect(html).toContain("katex-html");
    const katexBlocks = html.split('class="katex"').length - 1;
    expect(katexBlocks).toBeGreaterThanOrEqual(3);
    expect(html).not.toMatch(/a=\\sin\^2\\left\{\\frac\{\\Delta\\varphi\}\{2\}\\right\}a=\\sin/);
  });

  it("keeps two $$ formulae on one source line as distinct KaTeX trees", async () => {
    const html = (await processMarkdown(
      "$$a=\\sin^2\\left(\\frac{\\Delta\\varphi}{2}\\right)$$ $$d=2R\\,\\mathrm{atan2}(\\sqrt{a},\\sqrt{1-a})$$",
    )).html;
    expect((html.match(/class="katex"/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(html).toContain("katex-html");
    expect(html).toContain("atan2");
  });
});
