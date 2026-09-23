import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processPresentation } from '../../src/presentation/processor';
import { createPresentationDeck } from '../../src/presentation/presentation-deck';
import { DEFAULT_PRESENTATION_CONFIG } from '../../src/presentation/config';
import { createPresentationModel } from '../../src/presentation/segmentation';
import * as mermaidModule from '../../src/markdown/mermaid';

describe('Presentation Mode Lifecycle & Performance QA (MD-PRES-007)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Non-Mutation & Immutability Guarantee', () => {
    it('does not alter the source markdown string or trigger side effects', async () => {
      const sourceMarkdown = Object.freeze(
        `---\ntheme: dark\ntransition: fade\n---\n\n# Slide 1\n\nOriginal Text\n\n## Slide 2\n\nUnchanged`
      );

      const model = await processPresentation({
        documentId: 'test-immutability.md',
        markdown: sourceMarkdown,
        workspaceRoot: null,
        relativePath: 'test.md',
      });

      expect(model.slides.length).toBe(2);
      expect(sourceMarkdown).toBe(
        `---\ntheme: dark\ntransition: fade\n---\n\n# Slide 1\n\nOriginal Text\n\n## Slide 2\n\nUnchanged`
      );
      expect(model.metadata.theme).toBe('dark');
      expect(model.metadata.transition).toBe('fade');
    });
  });

  describe('Stress Testing: Rapid Deck Mount / Destroy Cycles', () => {
    it('survives 20 consecutive mount and destroy cycles without unhandled errors', async () => {
      for (let i = 0; i < 20; i++) {
        const container = document.createElement('div');
        container.className = 'reveal';
        const slides = document.createElement('div');
        slides.className = 'slides';
        const section = document.createElement('section');
        section.innerHTML = `<h1>Cycle ${i}</h1>`;
        slides.appendChild(section);
        container.appendChild(slides);
        document.body.appendChild(container);

        const onSlideChanged = vi.fn();
        const controller = await createPresentationDeck(
          container,
          DEFAULT_PRESENTATION_CONFIG,
          0,
          onSlideChanged
        );

        expect(controller).toBeDefined();
        controller.next();
        controller.prev();
        controller.layout();
        controller.destroy();

        document.body.removeChild(container);
      }
    });
  });

  describe('Large Document Performance & Scalability', () => {
    it('segments and models 60 slides within performance budget (< 150ms)', () => {
      const slideChunks: string[] = ['# Apresentação Corporativa\n\nVisão Geral'];
      for (let i = 2; i <= 60; i++) {
        slideChunks.push(
          `## Slide ${i}: Arquitetura de Módulo\n\nConteúdo explicativo com código:\n\n\`\`\`typescript\nconst mod${i} = { id: ${i}, active: true };\n\`\`\`\n`
        );
      }
      const massiveMarkdown = slideChunks.join('\n\n');

      const start = performance.now();
      const model = createPresentationModel({
        documentId: 'massive.md',
        markdown: massiveMarkdown,
        workspaceRoot: null,
        relativePath: 'massive.md',
      });
      const duration = performance.now() - start;

      expect(model.slides.length).toBe(60);
      expect(duration).toBeLessThan(150);
      expect(model.slides[0].title).toBe('Apresentação Corporativa');
      expect(model.slides[59].title).toBe('Slide 60: Arquitetura de Módulo');
    });
  });

  describe('Fault Isolation and Diagnostic Reporting', () => {
    it('isolates syntax and compilation issues without crashing presentation model', async () => {
      vi.spyOn(mermaidModule, 'renderMermaid').mockResolvedValue({
        error: 'Syntax error in graph definition',
      });

      const mixedContent = `
# Slide Válido

Texto de introdução.

## Slide com Mermaid Inválido

\`\`\`mermaid
graph Invalid ====> Syntax
\`\`\`

## Slide Final

Tudo funcionando normalmente.
      `.trim();

      const model = await processPresentation({
        documentId: 'fault-isolation.md',
        markdown: mixedContent,
        workspaceRoot: null,
        relativePath: 'fault.md',
      });

      expect(model.slides.length).toBe(3);
      expect(model.slides[0].html).toContain('Slide Válido');
      expect(model.slides[1].html).toContain('mermaid-diagram-container');
      expect(model.slides[2].html).toContain('Slide Final');
    });
  });
});
