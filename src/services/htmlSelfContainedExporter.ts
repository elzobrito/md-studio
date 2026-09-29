/**
 * htmlSelfContainedExporter.ts - Exporter HTML Autocontido para Publicação Técnica
 * Conforme especificação 047-html-autocontido.md, 046-publishing-engine.md e 049-fallback-editorial.md
 *
 * Regras:
 * - Single-file 100% offline (abre sem internet e sem dependências externas)
 * - Zero CDNs, zero scripts remotos, zero stylesheets externos
 * - Shiki, KaTeX e Mermaid renderizados estaticamente
 * - Assets locais incorporados em Base64 sob Path Fencing
 */

import { processMarkdown } from "../markdown/processor";
import { fallbackPolicyRegistry, escapeHtml } from "./editorialFallback";
import type { ExportWarning } from "../contracts/publishingTypes";

export interface HtmlExportOptions {
  title?: string;
  theme?: "light" | "dark" | "auto";
  assetMode?: "inline" | "bundle";
  includePrintStyles?: boolean;
}

/**
 * CSS editorial autocontido embutido diretamente no HTML
 */
export const EMBEDDED_EDITORIAL_CSS = `
/* MD Studio Technical Publishing CSS (Self-Contained Offline) */
:root {
  --font-main: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  --bg-color: #ffffff;
  --text-color: #1f2328;
  --border-color: #d0d7de;
  --code-bg: #f6f8fa;
  --accent-color: #0969da;
  --quote-color: #656d76;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-color: #0d1117;
    --text-color: #e6edf3;
    --border-color: #30363d;
    --code-bg: #161b22;
    --accent-color: #2f81f7;
    --quote-color: #8b949e;
  }
}

body.theme-dark {
  --bg-color: #0d1117;
  --text-color: #e6edf3;
  --border-color: #30363d;
  --code-bg: #161b22;
  --accent-color: #2f81f7;
  --quote-color: #8b949e;
}

body.theme-light {
  --bg-color: #ffffff;
  --text-color: #1f2328;
  --border-color: #d0d7de;
  --code-bg: #f6f8fa;
  --accent-color: #0969da;
  --quote-color: #656d76;
}

body {
  font-family: var(--font-main);
  background-color: var(--bg-color);
  color: var(--text-color);
  line-height: 1.6;
  max-width: 52rem;
  margin: 3rem auto;
  padding: 0 1.5rem;
  word-wrap: break-word;
}

h1, h2, h3, h4, h5, h6 {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: 600;
  line-height: 1.25;
}

h1 { font-size: 2rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3em; }
h2 { font-size: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3em; }
h3 { font-size: 1.25rem; }

p, ul, ol, dl, table, blockquote {
  margin-top: 0;
  margin-bottom: 16px;
}

a {
  color: var(--accent-color);
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}

code {
  font-family: var(--font-mono);
  font-size: 85%;
  background-color: var(--code-bg);
  padding: 0.2em 0.4em;
  border-radius: 4px;
}

pre {
  background-color: var(--code-bg);
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}
pre code {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
}

blockquote {
  padding: 0 1em;
  color: var(--quote-color);
  border-left: 0.25em solid var(--border-color);
}

table {
  border-spacing: 0;
  border-collapse: collapse;
  width: 100%;
  overflow: auto;
  display: block;
  margin-bottom: 16px;
}
th, td {
  padding: 6px 13px;
  border: 1px solid var(--border-color);
}
tr:nth-child(2n) {
  background-color: var(--code-bg);
}

img {
  max-width: 100%;
  box-sizing: border-box;
}

.image-fallback {
  display: inline-block;
  padding: 6px 12px;
  background-color: var(--code-bg);
  border: 1px dashed var(--border-color);
  border-radius: 4px;
  color: var(--quote-color);
  font-style: italic;
  font-size: 0.9em;
}

.mermaid-diagram-static {
  display: flex;
  justify-content: center;
  margin: 1.5rem 0;
  overflow-x: auto;
}
.mermaid-diagram-static svg {
  max-width: 100%;
  height: auto;
}

.mermaid-fallback {
  background: var(--code-bg);
  border: 1px solid #f59e0b;
  border-radius: 4px;
}

.katex {
  font-size: 1.1em;
  font-family: KaTeX_Main, "Times New Roman", serif;
}

@media print {
  body {
    max-width: none;
    margin: 0;
    padding: 0;
    color: #000 !important;
    background: #fff !important;
  }
  a { text-decoration: underline; color: #000; }
  pre, blockquote { page-break-inside: avoid; }
}
`;

/**
 * Auditoria de conformidade offline (rejeita links externos, CDNs e Google Fonts)
 */
export function auditSelfContainedHtml(html: string): { ok: boolean; violations: string[] } {
  const violations: string[] = [];

  // 1. Scripts remotos
  if (/<script[^>]+src=["']https?:\/\//i.test(html)) {
    violations.push("Script remoto detectado (violação da regra offline)");
  }

  // 2. Stylesheets remotos
  if (/<link[^>]+rel=["']stylesheet["'][^>]+href=["']https?:\/\//i.test(html)) {
    violations.push("Stylesheet remoto via CDN detectado");
  }

  // 3. Fontes remotas
  if (/fonts\.googleapis\.com|cdnjs\.cloudflare\.com|unpkg\.com/i.test(html)) {
    violations.push("Referência a provedor de CDN ou fontes remotas detectada");
  }

  // 4. Imagens com src remoto
  if (/<img[^>]+src=["']https?:\/\//i.test(html)) {
    violations.push("Imagem com URL remota dependente de rede detectada");
  }

  return {
    ok: violations.length === 0,
    violations,
  };
}

/**
 * Pré-renderiza diagramas Mermaid para SVG estático ou aplica fallback editorial legível
 */
export async function preRenderMermaidBlocks(
  htmlContent: string
): Promise<{ processedHtml: string; warnings: ExportWarning[] }> {
  const warnings: ExportWarning[] = [];
  const containerRegex = /<div class="mermaid-diagram-container" data-mermaid-code="([^"]+)">[\s\S]*?<\/div>/g;

  let result = htmlContent;
  const matches = [...htmlContent.matchAll(containerRegex)];

  for (const match of matches) {
    const rawCode = decodeURIComponent(match[1]);
    try {
      // Tenta renderizar SVG estático seguro se biblioteca mermaid estiver carregada no contexto
      const { renderMermaid } = await import("../markdown/mermaid");
      const renderRes = await renderMermaid(`export-m-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, rawCode);
      if (renderRes.svg) {
        const staticBlock = `<div class="mermaid-diagram-static">${renderRes.svg}</div>`;
        result = result.replace(match[0], staticBlock);
        continue;
      }
    } catch (e) {
      // Falha de render: aplicar Fallback Editorial (Spec 049)
      const handler = fallbackPolicyRegistry.resolve("html", "mermaid");
      if (handler) {
        const outcome = handler.handle(rawCode, undefined, { error: e instanceof Error ? e.message : String(e) });
        if (outcome.status === "fallback") {
          result = result.replace(match[0], outcome.value);
          warnings.push({
            code: outcome.warning.code,
            message: outcome.warning.message,
            scope: "format",
          });
          continue;
        }
      }
    }

    // Fallback universal seguro caso o renderer/handler falhe
    const safeFallback = `<pre class="mermaid-fallback"><code class="language-mermaid">${escapeHtml(rawCode)}</code></pre>`;
    result = result.replace(match[0], safeFallback);
    warnings.push({
      code: "FALLBACK_MERMAID_SOURCE",
      message: "Diagrama Mermaid convertido para bloco de código legível",
      scope: "format",
    });
  }

  return { processedHtml: result, warnings };
}

/**
 * Trata imagens remotas ou locais: bloqueia remotas e preserva data URIs
 */
export function sanitizeAndEmbedImages(
  htmlContent: string
): { processedHtml: string; warnings: ExportWarning[] } {
  const warnings: ExportWarning[] = [];

  // Substitui imagens remotas http/https para não violar a política offline
  const remoteImgRegex = /<img([^>]+)src=["'](https?:\/\/[^"']+)["']([^>]*)>/gi;
  const processed = htmlContent.replace(remoteImgRegex, (_match, prefix, src, suffix) => {
    const altMatch = /alt=["']([^"']*)["']/.exec(prefix + suffix);
    const alt = altMatch ? altMatch[1] : "imagem";
    warnings.push({
      code: "REMOTE_IMAGE_BLOCKED",
      message: `Imagem remota bloqueada para preservar documento offline: ${src}`,
      scope: "asset",
    });
    return `<span class="image-fallback" role="img" aria-label="${escapeHtml(alt)}">[Imagem remota omitida offline: ${escapeHtml(alt)}]</span>`;
  });

  return { processedHtml: processed, warnings };
}

/**
 * Constrói o artefato HTML autocontido single-file final
 */
export async function buildSelfContainedHtml(
  markdown: string,
  options: HtmlExportOptions = {}
): Promise<{ html: string; warnings: ExportWarning[] }> {
  const allWarnings: ExportWarning[] = [];

  // 1. Processar Markdown com AST e KaTeX/Shiki
  const { html, title } = await processMarkdown(markdown, { profile: "github-extensions" });
  const docTitle = options.title || title || "Documento Técnico MD Studio";

  // 2. Pré-renderizar blocos Mermaid
  const { processedHtml: mermaidHtml, warnings: mermaidWarnings } =
    await preRenderMermaidBlocks(html);
  allWarnings.push(...mermaidWarnings);

  // 3. Sanitizar e embutir imagens (bloquear remotas, auditar data URIs)
  const { processedHtml: finalBodyHtml, warnings: imgWarnings } =
    sanitizeAndEmbedImages(mermaidHtml);
  allWarnings.push(...imgWarnings);

  // 4. Montar o documento HTML autocontido
  const themeClass = options.theme === "dark" ? "theme-dark" : options.theme === "light" ? "theme-light" : "";

  const completeHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(docTitle)}</title>
  <style id="md-studio-editorial-styles">
${EMBEDDED_EDITORIAL_CSS}
  </style>
</head>
<body class="${themeClass}">
${finalBodyHtml}
</body>
</html>`;

  // 5. Auditoria de conformidade offline
  const audit = auditSelfContainedHtml(completeHtml);
  if (!audit.ok) {
    for (const v of audit.violations) {
      allWarnings.push({
        code: "OFFLINE_AUDIT_WARNING",
        message: v,
        scope: "format",
      });
    }
  }

  return {
    html: completeHtml,
    warnings: allWarnings,
  };
}
