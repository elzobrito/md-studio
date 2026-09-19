import { processMarkdown } from "../markdown/processor";

export interface ExportOptions {
  embedImagesAsDataUrl?: boolean;
  title?: string;
}

export async function exportHtmlDocument(markdown: string, options: ExportOptions = {}): Promise<string> {
  const { html, title } = await processMarkdown(markdown, { profile: "github-extensions" });
  const docTitle = options.title ?? title ?? "MD Studio export";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(docTitle)}</title>
<style>
body{font-family:system-ui,sans-serif;max-width:48rem;margin:2rem auto;padding:0 1rem;line-height:1.55}
pre{background:#f4f4f5;padding:0.75rem;overflow:auto}
code{font-family:ui-monospace,monospace}
img{max-width:100%}
@media print{body{max-width:none;margin:0}}
</style>
</head>
<body>
${html}
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
