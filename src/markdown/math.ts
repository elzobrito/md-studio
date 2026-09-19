import katex from "katex";

export function renderMath(source: string, displayMode: boolean): { html: string; error?: string } {
  try {
    const html = katex.renderToString(source, {
      displayMode,
      throwOnError: false,
      trust: false,
      strict: "warn",
      maxExpand: 1000,
      maxSize: 10,
    });
    return { html };
  } catch (e) {
    return { html: "", error: e instanceof Error ? e.message : "KaTeX error" };
  }
}
