import { describe, it, expect } from 'vitest';
import {
  buildSelfContainedHtml,
  auditSelfContainedHtml,
  sanitizeAndEmbedImages,
  preRenderMermaidBlocks,
  EMBEDDED_EDITORIAL_CSS,
} from '../../src/services/htmlSelfContainedExporter';

describe('HTML Autocontido (Spec 047)', () => {
  const sampleMarkdown = `
# Relatório Técnico Autocontido

Documento gerado para distribuição offline sem internet.

## Fórmula Matemática
$$E = mc^2$$

## Diagrama de Fluxo
\`\`\`mermaid
graph TD
A[Entrada] --> B(Processamento)
B --> C[Saída]
\`\`\`

## Imagem Externa Bloqueada
![Tracker](https://example.com/tracking-pixel.png)

Fim do relatório.
`;

  it('generates a complete single-file HTML document with embedded CSS', async () => {
    const { html, warnings } = await buildSelfContainedHtml(sampleMarkdown, {
      title: 'Manual de Engenharia',
      theme: 'auto',
    });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain('<title>Manual de Engenharia</title>');
    expect(html).toContain('<style id="md-studio-editorial-styles">');
    expect(html).toContain('Relatório Técnico Autocontido');
    expect(warnings.length).toBeGreaterThanOrEqual(1); // Imagem remota bloqueada
  });

  it('enforces offline audit passing for self-contained documents and failing on remote CDNs', () => {
    const cleanDoc = `<!DOCTYPE html><html><head><style>body{color:#000}</style></head><body><h1>Offline</h1></body></html>`;
    const auditClean = auditSelfContainedHtml(cleanDoc);
    expect(auditClean.ok).toBe(true);
    expect(auditClean.violations).toHaveLength(0);

    const dirtyDocWithCDN = `<!DOCTYPE html><html><head><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome.css"><script src="https://cdn.example.com/app.js"></script></head><body><img src="https://example.com/img.png"/></body></html>`;
    const auditDirty = auditSelfContainedHtml(dirtyDocWithCDN);
    expect(auditDirty.ok).toBe(false);
    expect(auditDirty.violations.length).toBeGreaterThanOrEqual(3);
  });

  it('blocks remote images to guarantee offline privacy and reliability', () => {
    const htmlWithRemote = '<p>Texto</p><img src="https://analytics.com/pixel.png" alt="Pixel"/>';
    const { processedHtml, warnings } = sanitizeAndEmbedImages(htmlWithRemote);

    expect(processedHtml).not.toContain('https://analytics.com/pixel.png');
    expect(processedHtml).toContain('[Imagem remota omitida offline: Pixel]');
    expect(warnings).toHaveLength(1);
    expect(warnings[0].code).toBe('REMOTE_IMAGE_BLOCKED');
  });

  it('renders Mermaid statically or provides readable fallback code block', async () => {
    const rawHtmlWithMermaid = `<div><div class="mermaid-diagram-container" data-mermaid-code="graph%20TD%0AA%20--%3E%20B"><pre class="mermaid-code-fallback">graph TD\nA --> B</pre></div></div>`;
    const { processedHtml, warnings } = await preRenderMermaidBlocks(rawHtmlWithMermaid);

    // Deve substituir o container provisório do preview por SVG estático ou fallback legível
    expect(processedHtml).not.toContain('mermaid-diagram-container');
    expect(
      processedHtml.includes('mermaid-diagram-static') ||
      processedHtml.includes('mermaid-fallback')
    ).toBe(true);
  });

  it('includes comprehensive editorial typography, Shiki tokens and print media rules', () => {
    expect(EMBEDDED_EDITORIAL_CSS).toContain('@media print');
    expect(EMBEDDED_EDITORIAL_CSS).toContain('--font-main');
    expect(EMBEDDED_EDITORIAL_CSS).toContain('--font-mono');
    expect(EMBEDDED_EDITORIAL_CSS).toContain('.mermaid-fallback');
  });
});
