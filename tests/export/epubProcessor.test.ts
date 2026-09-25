import { describe, it, expect } from "vitest";
import {
  processEpubMarkdown,
  transformAlertsForEpub,
} from "../../src/export/epubProcessor";

describe("MD-EPUB-001: Frontend EPUB Processor (md_epub_001_processor_pass)", () => {
  it("KaTeX emite MathML puro para compatibilidade EPUB 3", async () => {
    const md = `
# Matemática

Equação inline: $E = mc^2$

Equação em bloco:
$$
\\frac{a}{b} = c
$$
`;
    const payload = await processEpubMarkdown(md);

    // MathML tags must be present in bodyHtml
    expect(payload.bodyHtml).toContain("<math");
    expect(payload.bodyHtml).toContain("xmlns=\"http://www.w3.org/1998/Math/MathML\"");
    expect(payload.bodyHtml).toContain("<mi>E</mi>");
    expect(payload.bodyHtml).toContain("<msup>");
    expect(payload.bodyHtml).toContain("<mfrac>");

    // Ensure no raw KaTeX HTML span clutter is produced
    expect(payload.bodyHtml).not.toContain("class=\"katex-html\"");
  });

  it("Shiki emite estilos inline sem dependência de classes de tema dinâmico", async () => {
    const md = `
\`\`\`typescript
const greeting: string = "Hello EPUB";
console.log(greeting);
\`\`\`
`;
    const payload = await processEpubMarkdown(md);

    // Code blocks and tokens must have inline style attributes
    expect(payload.bodyHtml).toContain("<pre");
    expect(payload.bodyHtml).toContain("style=\"");
    expect(payload.bodyHtml).toContain("color:#");
    expect(payload.bodyHtml).toContain("<span style=\"color:#");
    expect(payload.bodyHtml).toContain("data-language=\"typescript\"");
  });

  it("Wiki Links são convertidos para texto simples", async () => {
    const md = `
Veja a documentação em [[Arquitetura]] e também em [[Guia de Estilo|Guia Visual]].
Não perca [[Nota 1#Secao|Seção Especial]].

\`\`\`markdown
[[LinkDentroDeCodigo|Ignorado]]
\`\`\`

Código inline: \`[[LinkInline]]\`
`;
    const payload = await processEpubMarkdown(md);

    // Wiki links in normal text must be plain text
    expect(payload.bodyHtml).toContain("Veja a documentação em Arquitetura");
    expect(payload.bodyHtml).toContain("e também em Guia Visual.");
    expect(payload.bodyHtml).toContain("Não perca Seção Especial.");

    // No anchor links with data-wiki-target should remain for wiki links
    expect(payload.bodyHtml).not.toContain("data-wiki-target");
    expect(payload.bodyHtml).not.toContain("href=\"Arquitetura\"");

    // Code blocks and inline code preserve literal brackets and content
    expect(payload.bodyHtml).toContain("LinkDentroDeCodigo|Ignorado");
    expect(payload.bodyHtml).toContain("[[LinkInline]]");
  });

  it("Alerts recebem prefixo textual legível", async () => {
    const md = `
> [!NOTE]
> Esta é uma nota de esclarecimento.

> [!TIP]
> Dica de performance.

> [!WARNING]
> Atenção com caminhos relativos.
`;
    const transformedAlerts = transformAlertsForEpub(md);
    expect(transformedAlerts).toContain("> **[NOTE]**");
    expect(transformedAlerts).toContain("> **[TIP]**");
    expect(transformedAlerts).toContain("> **[WARNING]**");

    const payload = await processEpubMarkdown(md);
    expect(payload.bodyHtml).toContain("<blockquote>");
    expect(payload.bodyHtml).toContain("<strong>[NOTE]</strong>");
    expect(payload.bodyHtml).toContain("<strong>[TIP]</strong>");
    expect(payload.bodyHtml).toContain("<strong>[WARNING]</strong>");
  });

  it("Frontmatter extrai metadados completos com fallback seguro", async () => {
    const mdWithFm = `---
title: "Manual do Desenvolvedor"
author: "Equipe MD Studio"
lang: "pt-BR"
description: "Guia completo de arquitetura do produto"
date: "2026-09-24"
---

# Conteúdo Principal
Texto de introdução.
`;
    const payload1 = await processEpubMarkdown(mdWithFm);
    expect(payload1.metadata.title).toBe("Manual do Desenvolvedor");
    expect(payload1.metadata.author).toBe("Equipe MD Studio");
    expect(payload1.metadata.lang).toBe("pt-BR");
    expect(payload1.metadata.description).toBe("Guia completo de arquitetura do produto");
    expect(payload1.metadata.date).toBe("2026-09-24");

    // Fallback: no frontmatter, extract title from first H1
    const mdNoFm = `# Título Derivado do H1

Parágrafo normal.
`;
    const payload2 = await processEpubMarkdown(mdNoFm);
    expect(payload2.metadata.title).toBe("Título Derivado do H1");
    expect(payload2.metadata.lang).toBe("pt-BR");
    expect(payload2.metadata.author).toBeUndefined();
    expect(payload2.metadata.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Fallback: completely empty or no headings
    const mdEmpty = `Apenas texto sem cabeçalhos.`;
    const payload3 = await processEpubMarkdown(mdEmpty);
    expect(payload3.metadata.title).toBe("Sem título");
    expect(payload3.metadata.lang).toBe("pt-BR");
  });

  it("Extrai slots de Mermaid com placeholders para injeção no backend Rust", async () => {
    const md = `
# Fluxo de Trabalho

\`\`\`mermaid
flowchart TD
    A[Início] --> B[Fim]
\`\`\`

Outro texto intermediário.

\`\`\`mermaid
sequenceDiagram
    Alice->>Bob: Olá
\`\`\`
`;
    const payload = await processEpubMarkdown(md);

    expect(payload.mermaidSlots).toHaveLength(2);
    expect(payload.mermaidSlots[0].id).toBe("mermaid-0");
    expect(payload.mermaidSlots[0].placeholder).toBe("{{MERMAID:mermaid-0}}");
    expect(payload.mermaidSlots[0].source).toContain("flowchart TD");

    expect(payload.mermaidSlots[1].id).toBe("mermaid-1");
    expect(payload.mermaidSlots[1].placeholder).toBe("{{MERMAID:mermaid-1}}");
    expect(payload.mermaidSlots[1].source).toContain("sequenceDiagram");

    // The bodyHtml contains the placeholders where diagrams belong
    expect(payload.bodyHtml).toContain("{{MERMAID:mermaid-0}}");
    expect(payload.bodyHtml).toContain("{{MERMAID:mermaid-1}}");
  });

  it("Coleta referências de imagens locais ignorando links externos e data URIs", async () => {
    const md = `
![Logo local](assets/logo.png)
![Diagrama relativo](./diagrams/arch.svg)
![Imagem externa](https://example.com/foto.jpg)
![Data URI](data:image/png;base64,iVBORw0KGgo=)
<img src="figures/fig1.webp" alt="Figura 1"/>
`;
    const payload = await processEpubMarkdown(md);

    expect(payload.imageRefs).toContain("assets/logo.png");
    expect(payload.imageRefs).toContain("./diagrams/arch.svg");
    expect(payload.imageRefs).toContain("figures/fig1.webp");

    // External and data URIs should not be collected in local imageRefs
    expect(payload.imageRefs).not.toContain("https://example.com/foto.jpg");
    expect(payload.imageRefs).not.toContain("data:image/png;base64,iVBORw0KGgo=");
  });

  it("Atribui IDs estáveis aos cabeçalhos para o sumário do EPUB", async () => {
    const md = `
# Seção Inicial
## Subseção Detalhada
### Ponto 1
## Subseção Detalhada
`;
    const payload = await processEpubMarkdown(md);

    expect(payload.bodyHtml).toMatch(/<h1 id="secao-inicial"[^>]*>Seção Inicial<\/h1>/);
    expect(payload.bodyHtml).toMatch(/<h2 id="subsecao-detalhada"[^>]*>Subseção Detalhada<\/h2>/);
    expect(payload.bodyHtml).toMatch(/<h3 id="ponto-1"[^>]*>Ponto 1<\/h3>/);
    expect(payload.bodyHtml).toMatch(/<h2 id="subsecao-detalhada-1"[^>]*>Subseção Detalhada<\/h2>/);
  });

  it("Estrutura completa do EpubExportPayload é compatível com o contrato de serialização", async () => {
    const md = `---
title: "Documento Integrado"
author: "Antigravity & Grok"
date: "2026-09-24"
---

# Capítulo 1

Texto com $x + y = z$, [[Referência]] e imagem ![Foto](images/cover.jpg).

\`\`\`python
def main():
    return 42
\`\`\`

> [!NOTE]
> Nota final.
`;
    const payload = await processEpubMarkdown(md);

    // Verify all keys expected by Rust EpubExportPayload (camelCase)
    expect(payload).toHaveProperty("metadata");
    expect(payload).toHaveProperty("bodyHtml");
    expect(payload).toHaveProperty("mermaidSlots");
    expect(payload).toHaveProperty("imageRefs");

    expect(payload.metadata).toEqual({
      title: "Documento Integrado",
      author: "Antigravity & Grok",
      lang: "pt-BR",
      description: undefined,
      date: "2026-09-24",
    });

    expect(payload.imageRefs).toEqual(["images/cover.jpg"]);
    expect(typeof payload.bodyHtml).toBe("string");
    expect(Array.isArray(payload.mermaidSlots)).toBe(true);

    // JSON round-trip serialization check
    const serialized = JSON.stringify(payload);
    const parsed = JSON.parse(serialized);
    expect(parsed.metadata.title).toBe("Documento Integrado");
    expect(parsed.bodyHtml).toContain("<math");
  });
});
