import { describe, expect, it } from "vitest";
import { processMarkdown } from "../../../src/markdown/processor";
import * as fs from "node:fs";
import * as path from "node:path";

describe("code syntax highlighting with Shiki", () => {
  it("highlights python code blocks with Shiki TextMate dual-theme tokens", async () => {
    const pythonCode = [
      '```python',
      '"""Testes da etapa final usando banco temporário e cliente Flask."""',
      '',
      'import sqlite3',
      'import unittest',
      '',
      'class CrudTestCase(unittest.TestCase):',
      '    def setUp(self):',
      '        self.banco = "teste.db"',
      '',
      '    def test_crud_completo(self):',
      '        resposta = self.client.post("/usuarios", data={"nome": "Beatriz"})',
      '        self.assertEqual(resposta.status_code, 302)',
      '```',
    ].join("\n");

    const result = await processMarkdown(pythonCode);
    const html = result.html;

    // Code container classes and dual-theme attributes
    expect(html).toContain('<pre');
    expect(html).toContain('class="shiki shiki-themes github-light github-dark"');
    expect(html).toContain('data-language="python"');
    expect(html).toContain('--shiki-light');
    expect(html).toContain('--shiki-dark');

    // Keywords: import, class, def (GitHub Light: #D73A49, GitHub Dark: #F97583)
    expect(html).toMatch(/<span style="[^"]*--shiki-light:#D73A49[^"]*">\s*import<\/span>/);
    expect(html).toMatch(/<span style="[^"]*--shiki-light:#D73A49[^"]*">\s*class<\/span>/);
    expect(html).toMatch(/<span style="[^"]*--shiki-light:#D73A49[^"]*">\s*def<\/span>/);

    // Entity/Class and Function titles (GitHub Light: #6F42C1)
    expect(html).toMatch(/<span style="[^"]*--shiki-light:#6F42C1[^"]*">\s*CrudTestCase<\/span>/);
    expect(html).toMatch(/<span style="[^"]*--shiki-light:#6F42C1[^"]*">\s*setUp<\/span>/);
    expect(html).toMatch(/<span style="[^"]*--shiki-light:#6F42C1[^"]*">\s*test_crud_completo<\/span>/);

    // Strings (GitHub Light: #032F62)
    expect(html).toMatch(/<span style="[^"]*--shiki-light:#032F62[^"]*">\s*&quot;teste\.db&quot;<\/span>/);

    // Numbers (GitHub Light: #005CC5)
    expect(html).toMatch(/<span style="[^"]*--shiki-light:#005CC5[^"]*">\s*302<\/span>/);
  }, 20000);

  it("highlights javascript and json code blocks with TextMate tokens", async () => {
    const jsSnippet = '```javascript\nconst x = 42;\nfunction hello() { return "world"; }\n```';
    const jsResult = await processMarkdown(jsSnippet);
    expect(jsResult.html).toContain('class="shiki shiki-themes github-light github-dark"');
    expect(jsResult.html).toMatch(/<span style="[^"]*--shiki-light:#D73A49[^"]*">\s*const<\/span>/);
    expect(jsResult.html).toMatch(/<span style="[^"]*--shiki-light:#005CC5[^"]*">\s*42<\/span>/);

    const jsonSnippet = '```json\n{"status": "ok", "count": 10}\n```';
    const jsonResult = await processMarkdown(jsonSnippet);
    expect(jsonResult.html).toContain('class="shiki shiki-themes github-light github-dark"');
    expect(jsonResult.html).toMatch(/<span style="[^"]*--shiki-light:#005CC5[^"]*">\s*10<\/span>/);
  });

  it("ensures syntax.css exists and defines variables for light, dark, and Shiki themes", () => {
    const cssPath = path.resolve(__dirname, "../../../src/styles/syntax.css");
    expect(fs.existsSync(cssPath)).toBe(true);

    const cssContent = fs.readFileSync(cssPath, "utf-8");
    expect(cssContent).toContain("pre.shiki");
    expect(cssContent).toContain("--shiki-light");
    expect(cssContent).toContain("--shiki-dark");
    expect(cssContent).toContain(".theme-light");
    expect(cssContent).toContain(".theme-dark");
  });
});
