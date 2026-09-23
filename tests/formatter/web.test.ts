import { describe, expect, it, vi } from "vitest";
import { formatWebCode, isWebLanguage } from "../../src/services/formatter/web";
import { formatCode } from "../../src/services/formatter/index";

describe("Web Formatter (Prettier Standalone)", () => {
  it("recognizes web languages and markup", () => {
    expect(isWebLanguage("javascript")).toBe(true);
    expect(isWebLanguage("js")).toBe(true);
    expect(isWebLanguage("typescript")).toBe(true);
    expect(isWebLanguage("json")).toBe(true);
    expect(isWebLanguage("html")).toBe(true);
    expect(isWebLanguage("css")).toBe(true);
    expect(isWebLanguage("yaml")).toBe(true);
    expect(isWebLanguage("markdown")).toBe(true);

    expect(isWebLanguage("python")).toBe(false);
    expect(isWebLanguage("rust")).toBe(false);
    expect(isWebLanguage("c")).toBe(false);
  });

  it("formats unformatted JavaScript and TypeScript", async () => {
    const rawJs = "const a=1;function test(x,y){return x+y;}";
    const resJs = await formatWebCode("javascript", rawJs);
    expect(resJs.formatted).toBe(true);
    expect(resJs.formatter).toBe("prettier");
    expect(resJs.code).toBe("const a = 1;\nfunction test(x, y) {\n  return x + y;\n}\n");

    const rawTs = "interface User{name:string;age:number;}const u:User={name:'Ada',age:36};";
    const resTs = await formatWebCode("typescript", rawTs);
    expect(resTs.formatted).toBe(true);
    expect(resTs.code).toContain("interface User {\n  name: string;\n  age: number;\n}");
  });

  it("formats unformatted JSON", async () => {
    const rawJson = '{"status":"ok","items":[1,2,3],"active":true}';
    const res = await formatWebCode("json", rawJson);
    expect(res.formatted).toBe(true);
    expect(res.code).toBe('{ "status": "ok", "items": [1, 2, 3], "active": true }\n');
  });

  it("formats unformatted HTML and CSS", async () => {
    const rawHtml = "<div><p>Hello <span>World</span></p></div>";
    const resHtml = await formatWebCode("html", rawHtml);
    expect(resHtml.formatted).toBe(true);
    expect(resHtml.code).toContain("<div>\n  <p>Hello <span>World</span></p>\n</div>");

    const rawCss = "body{margin:0;padding:10px;color:#333;}";
    const resCss = await formatWebCode("css", rawCss);
    expect(resCss.formatted).toBe(true);
    expect(resCss.code).toBe("body {\n  margin: 0;\n  padding: 10px;\n  color: #333;\n}\n");
  });

  it("formats unformatted YAML", async () => {
    const rawYaml = "name:   MD Studio\nfeatures: [formatting, preview]\nversion: 0.2.0";
    const res = await formatWebCode("yaml", rawYaml);
    expect(res.formatted).toBe(true);
    expect(res.code).toBe("name: MD Studio\nfeatures: [formatting, preview]\nversion: 0.2.0\n");
  });

  it("tolerates syntax errors gracefully without throwing", async () => {
    const invalidJs = "const foo = {;";
    const res = await formatWebCode("javascript", invalidJs);
    expect(res.formatted).toBe(false);
    expect(res.code).toBe(invalidJs);
    expect(res.error).toBeDefined();
  });

  it("unified formatCode orchestrator handles web languages and gracefully falls back for non-web", async () => {
    const jsResult = await formatCode("js", "const b=2;");
    expect(jsResult.formatted).toBe(true);
    expect(jsResult.code).toBe("const b = 2;\n");

    const pythonSnippet = "def foo(): pass";
    const pyResult = await formatCode("python", pythonSnippet);
    // In node/vitest environment without Tauri IPC, falls back cleanly:
    expect(pyResult.formatted).toBe(false);
    expect(pyResult.code).toBe(pythonSnippet);
  });

  it("unified formatCode delegates to Tauri IPC when __TAURI_INTERNALS__ is present", async () => {
    (window as any).__TAURI_INTERNALS__ = {};
    const mockInvoke = vi.fn().mockResolvedValue({
      formatted: true,
      code: "def foo():\n    pass\n",
      formatter: "ruff",
    });
    vi.doMock("@tauri-apps/api/core", () => ({
      invoke: mockInvoke,
    }));

    const res = await formatCode("python", "def foo(): pass");
    expect(res.formatted).toBe(true);
    expect(res.formatter).toBe("ruff");
    expect(res.code).toBe("def foo():\n    pass\n");

    delete (window as any).__TAURI_INTERNALS__;
    vi.doUnmock("@tauri-apps/api/core");
  });
});
