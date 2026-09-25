import { describe, expect, it } from 'vitest';
import { processPresentation } from '../../src/presentation/processor';
import type { PresentationSource } from '../../src/presentation/types';

describe('Presentation Processor', () => {
  it('compiles slides to sanitized HTML', async () => {
    const md = `---
title: Apresentação Demo
presentation:
  theme: dark
---
# Título Principal

Texto de introdução.

## Segundo Slide

Item da lista:
- Opção A
- Opção B
`;
    const source: PresentationSource = {
      documentId: 'doc-demo',
      markdown: md,
      workspaceRoot: '/workspace',
      relativePath: 'demo.md',
    };

    const model = await processPresentation(source);
    expect(model.metadata.title).toBe('Apresentação Demo');
    expect(model.metadata.theme).toBe('dark');
    expect(model.slides).toHaveLength(2);

    // Slide 1
    expect(model.slides[0]!.title).toBe('Título Principal');
    expect(model.slides[0]!.html).toContain('<h1');
    expect(model.slides[0]!.html).toContain('Texto de introdução.');

    // Slide 2
    expect(model.slides[1]!.title).toBe('Segundo Slide');
    expect(model.slides[1]!.html).toContain('<h2');
    expect(model.slides[1]!.html).toMatch(/<li[^>]*>Opção A<\/li>/);
  });

  it('sanitizes unsafe HTML in slides (zero-XSS enforcement)', async () => {
    const md = `## Slide Seguro

<script>alert("xss")</script>
<img src="x" onerror="alert(1)" />
Texto seguro.
`;
    const source: PresentationSource = {
      documentId: 'doc-sec',
      markdown: md,
      workspaceRoot: null,
      relativePath: 'sec.md',
    };

    const model = await processPresentation(source);
    const html = model.slides[0]!.html || '';
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('onerror=');
    expect(html).toContain('Texto seguro.');
  });

  it('handles KaTeX formulas and Mermaid blocks without failure', async () => {
    const md = `## Slide Matemático e Diagrama

Fórmula: $E = mc^2$

\`\`\`mermaid
graph TD
  A --> B
\`\`\`
`;
    const source: PresentationSource = {
      documentId: 'doc-rich',
      markdown: md,
      workspaceRoot: null,
      relativePath: 'rich.md',
    };

    const model = await processPresentation(source);
    const html = model.slides[0]!.html || '';
    expect(html).toContain('katex');
    expect(html).toContain('mermaid-diagram-container');
  });

  it('handles empty documents without crashing', async () => {
    const source: PresentationSource = {
      documentId: 'doc-empty',
      markdown: '',
      workspaceRoot: null,
      relativePath: 'empty.md',
    };

    const model = await processPresentation(source);
    expect(model.slides).toHaveLength(0);
    expect(model.warnings.some((w) => w.code === 'empty_document')).toBe(true);
  });
});
