import { describe, expect, it } from "vitest";
import { processMarkdown } from "../../../src/markdown/processor";
import * as fs from "node:fs";
import * as path from "node:path";

describe("code syntax highlighting", () => {
  it("highlights python code blocks with appropriate hljs classes", async () => {
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

    // Code container classes
    expect(html).toContain('<pre><code class="language-python">');

    // Keywords: import, class, def
    expect(html).toMatch(/<span class="hljs-keyword">import<\/span>/);
    expect(html).toMatch(/<span class="hljs-keyword">class<\/span>/);
    expect(html).toMatch(/<span class="hljs-keyword">def<\/span>/);

    // Entity/Class and Function titles
    expect(html).toMatch(/<span class="hljs-title class_">CrudTestCase<\/span>/);
    expect(html).toMatch(/<span class="hljs-title function_">setUp<\/span>/);
    expect(html).toMatch(/<span class="hljs-title function_">test_crud_completo<\/span>/);

    // Strings
    expect(html).toMatch(/<span class="hljs-string">&quot;teste\.db&quot;<\/span>/);
    expect(html).toMatch(/<span class="hljs-string">&quot;&quot;&quot;Testes da etapa final/);

    // Numbers
    expect(html).toMatch(/<span class="hljs-number">302<\/span>/);
  });

  it("highlights javascript and json code blocks", async () => {
    const jsSnippet = '```javascript\nconst x = 42;\nfunction hello() { return "world"; }\n```';
    const jsResult = await processMarkdown(jsSnippet);
    expect(jsResult.html).toContain('class="language-javascript"');
    expect(jsResult.html).toMatch(/<span class="hljs-keyword">const<\/span>/);
    expect(jsResult.html).toMatch(/<span class="hljs-number">42<\/span>/);

    const jsonSnippet = '```json\n{"status": "ok", "count": 10}\n```';
    const jsonResult = await processMarkdown(jsonSnippet);
    expect(jsonResult.html).toContain('class="language-json"');
    expect(jsonResult.html).toMatch(/<span class="hljs-attr">&quot;status&quot;<\/span>/);
  });

  it("ensures syntax.css exists and defines variables for light and dark themes", () => {
    const cssPath = path.resolve(__dirname, "../../../src/styles/syntax.css");
    expect(fs.existsSync(cssPath)).toBe(true);

    const cssContent = fs.readFileSync(cssPath, "utf-8");
    expect(cssContent).toContain("--hljs-keyword");
    expect(cssContent).toContain("--hljs-string");
    expect(cssContent).toContain("--hljs-constant");
    expect(cssContent).toContain(".theme-light");
    expect(cssContent).toContain(".theme-dark");
    expect(cssContent).toContain(".preview-body .hljs-keyword");
    expect(cssContent).toContain(".preview-body .hljs-string");
  });
});
