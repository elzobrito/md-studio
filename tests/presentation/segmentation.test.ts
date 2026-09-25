import { describe, expect, it } from 'vitest';
import {
  createPresentationModel,
  extractFrontmatter,
  segmentMarkdown,
} from '../../src/presentation/segmentation';

describe('Presentation Markdown Segmentation', () => {
  it('extracts frontmatter correctly', () => {
    const md = `---
title: Teste de Apresentação
presentation:
  theme: dark
---
# Conteúdo
`;
    const res = extractFrontmatter(md);
    expect(res.data).toEqual({
      title: 'Teste de Apresentação',
      presentation: { theme: 'dark' },
    });
    expect(res.endOffset).toBeGreaterThan(0);
  });

  it('keeps an H1 that is immediately followed by an H2 on the first content slide', () => {
    const md = `# INSTRUCAO-DESIGN-SYSTEM-PALETA

## MD Studio — Sistema de Cores Coerente

**Versão base:** v0.2.3
`;
    const { segments } = segmentMarkdown(md);
    expect(segments).toHaveLength(1);
    expect(segments[0]!.markdown).toContain('# INSTRUCAO-DESIGN-SYSTEM-PALETA');
    expect(segments[0]!.markdown).toContain('## MD Studio — Sistema de Cores Coerente');
    expect(segments[0]!.markdown).toContain('**Versão base:** v0.2.3');
  });

  it('segments by H1 and H2 boundaries as standard', () => {
    const md = `# Arquitetura do MD Studio

Introdução da apresentação.

## Frontend

React 19 + CodeMirror 6.

## Backend

Tauri 2 + Rust.

### Persistência

Atomic save e WatcherHub.
`;
    const { segments, documentTitle } = segmentMarkdown(md);
    expect(documentTitle).toBe('Arquitetura do MD Studio');
    expect(segments).toHaveLength(3);

    // Slide 1: H1 + Intro
    expect(segments[0]!.title).toBe('Arquitetura do MD Studio');
    expect(segments[0]!.markdown).toContain('Introdução da apresentação.');

    // Slide 2: H2 Frontend
    expect(segments[1]!.title).toBe('Frontend');
    expect(segments[1]!.markdown).toContain('React 19 + CodeMirror 6.');

    // Slide 3: H2 Backend + H3 Persistência
    expect(segments[2]!.title).toBe('Backend');
    expect(segments[2]!.markdown).toContain('Tauri 2 + Rust.');
    expect(segments[2]!.markdown).toContain('### Persistência');
    expect(segments[2]!.markdown).toContain('Atomic save e WatcherHub.');
  });

  it('splits explicitly with <!-- md-studio:slide -->', () => {
    const md = `## Arquitetura

Primeira parte.

<!-- md-studio:slide -->

Continuação em outro slide.
`;
    const { segments } = segmentMarkdown(md);
    expect(segments).toHaveLength(2);
    expect(segments[0]!.title).toBe('Arquitetura');
    expect(segments[0]!.markdown).toContain('Primeira parte.');
    expect(segments[1]!.markdown).toContain('Continuação em outro slide.');
    expect(segments[1]!.markdown).not.toContain('<!-- md-studio:slide -->');
  });

  it('preserves horizontal rule --- as content and NEVER splits slides on it', () => {
    const md = `## Slide Único com HR

Linha 1

---

Linha 2 após divisor.
`;
    const { segments } = segmentMarkdown(md);
    expect(segments).toHaveLength(1);
    expect(segments[0]!.markdown).toContain('---');
    expect(segments[0]!.markdown).toContain('Linha 2 após divisor.');
  });

  it('does NOT split on headings or markers inside fenced code blocks', () => {
    const md = `## Slide com Código

\`\`\`markdown
## Isto não deve quebrar slide
<!-- md-studio:slide -->
\`\`\`

Texto final do slide.
`;
    const { segments } = segmentMarkdown(md);
    expect(segments).toHaveLength(1);
    expect(segments[0]!.markdown).toContain('## Isto não deve quebrar slide');
    expect(segments[0]!.markdown).toContain('<!-- md-studio:slide -->');
    expect(segments[0]!.markdown).toContain('Texto final do slide.');
  });

  it('handles documents without any headings as a single slide', () => {
    const md = `Este é um documento sem nenhum título.
Ele contém apenas parágrafos explicativos.
`;
    const { segments, documentTitle } = segmentMarkdown(md);
    expect(documentTitle).toBeNull();
    expect(segments).toHaveLength(1);
    expect(segments[0]!.markdown).toContain('Este é um documento sem nenhum título.');
  });

  it('handles empty document gracefully', () => {
    const { segments, warnings } = segmentMarkdown('   \n\n  ');
    expect(segments).toHaveLength(0);
    expect(warnings).toHaveLength(0);

    const model = createPresentationModel({
      documentId: 'doc-empty',
      markdown: '   ',
      workspaceRoot: null,
      relativePath: 'empty.md',
    });
    expect(model.slides).toHaveLength(0);
    expect(model.warnings.some((w) => w.code === 'empty_document')).toBe(true);
  });

  it('constructs a deterministic PresentationModel with stable IDs and metadata', () => {
    const md = `---
title: Apresentação Técnica
presentation:
  theme: light
  transition: slide
---
# Apresentação Técnica

Boas-vindas.

## Tópico 1

Detalhes do tópico 1.

## Tópico 2

Detalhes do tópico 2.
`;
    const model = createPresentationModel({
      documentId: 'doc-1',
      markdown: md,
      workspaceRoot: '/workspace',
      relativePath: 'slides.md',
    });

    expect(model.metadata.title).toBe('Apresentação Técnica');
    expect(model.metadata.theme).toBe('light');
    expect(model.metadata.transition).toBe('slide');
    expect(model.slides).toHaveLength(3);

    expect(model.slides[0]!.id).toBe('slide-1');
    expect(model.slides[0]!.index).toBe(0);
    expect(model.slides[0]!.title).toBe('Apresentação Técnica');

    expect(model.slides[1]!.id).toBe('slide-2');
    expect(model.slides[1]!.index).toBe(1);
    expect(model.slides[1]!.title).toBe('Tópico 1');

    expect(model.slides[2]!.id).toBe('slide-3');
    expect(model.slides[2]!.index).toBe(2);
    expect(model.slides[2]!.title).toBe('Tópico 2');
  });
});
