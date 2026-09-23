import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as mermaidModule from '../../src/markdown/mermaid';
import {
  renderMermaidInPresentation,
  createMissingImagePlaceholder,
  handleMissingImagesInPresentation,
  decoratePresentationCodeBlocks,
  enhancePresentationContent,
} from '../../src/presentation/rich-content';

describe('Presentation Rich Content Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('Mermaid in Presentation', () => {
    it('renders valid Mermaid containers with SVG', async () => {
      vi.spyOn(mermaidModule, 'renderMermaid').mockResolvedValue({
        svg: '<svg data-testid="mermaid-svg"><g><text>Node</text></g></svg>',
      });

      const container = document.createElement('div');
      container.innerHTML = `
        <div class="mermaid-diagram-container" data-mermaid-code="graph TD\\nA-->B">
          <pre class="mermaid-code-fallback"><code>graph TD\\nA-->B</code></pre>
        </div>
      `;
      document.body.appendChild(container);

      await renderMermaidInPresentation(container, true);

      const mmd = container.querySelector('.mermaid-diagram-container') as HTMLElement;
      expect(mmd.dataset.rendered).toBe('true');
      expect(mmd.classList.contains('mermaid-rendered')).toBe(true);
      expect(mmd.querySelector('svg')).not.toBeNull();
      expect(mmd.innerHTML).toContain('data-testid="mermaid-svg"');
    });

    it('falls back to code block with error badge on invalid Mermaid syntax', async () => {
      vi.spyOn(mermaidModule, 'renderMermaid').mockResolvedValue({
        error: 'Parse error on line 1: Syntax error',
      });

      const container = document.createElement('div');
      container.innerHTML = `
        <div class="mermaid-diagram-container" data-mermaid-code="invalid mermaid code">
          <pre class="mermaid-code-fallback"><code>invalid mermaid code</code></pre>
        </div>
      `;
      document.body.appendChild(container);

      await renderMermaidInPresentation(container, false);

      const mmd = container.querySelector('.mermaid-diagram-container') as HTMLElement;
      expect(mmd.dataset.rendered).toBe('error');
      expect(mmd.querySelector('.mermaid-presentation-error')).not.toBeNull();
      expect(mmd.querySelector('.mermaid-error-badge')?.textContent).toContain('Syntax error');
      expect(mmd.querySelector('.mermaid-code-fallback')?.textContent).toContain('invalid mermaid code');
    });

    it('isolates unexpected exceptions without throwing or breaking presentation', async () => {
      vi.spyOn(mermaidModule, 'renderMermaid').mockRejectedValue(new Error('Mermaid crashed unexpectedly'));

      const container = document.createElement('div');
      container.innerHTML = `
        <div class="mermaid-diagram-container" data-mermaid-code="graph LR\\nA-->B">
          <pre>fallback</pre>
        </div>
      `;
      document.body.appendChild(container);

      await expect(renderMermaidInPresentation(container)).resolves.not.toThrow();

      const mmd = container.querySelector('.mermaid-diagram-container') as HTMLElement;
      expect(mmd.dataset.rendered).toBe('error');
      expect(mmd.querySelector('.mermaid-error-badge')?.textContent).toContain('Mermaid crashed unexpectedly');
    });

    it('skips already rendered containers', async () => {
      const spy = vi.spyOn(mermaidModule, 'renderMermaid');

      const container = document.createElement('div');
      container.innerHTML = `
        <div class="mermaid-diagram-container" data-rendered="true">
          <svg>Already rendered</svg>
        </div>
      `;
      document.body.appendChild(container);

      await renderMermaidInPresentation(container);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Missing Images Handling', () => {
    it('creates explicit fallback placeholder with path and alt', () => {
      const placeholder = createMissingImagePlaceholder('assets/diagram.png', 'Diagrama de Arquitetura');
      expect(placeholder.className).toBe('presentation-image-fallback');
      expect(placeholder.getAttribute('role')).toBe('figure');
      expect(placeholder.querySelector('.fallback-title')?.textContent).toBe('[Imagem não encontrada]');
      expect(placeholder.querySelector('.fallback-src')?.textContent).toBe('assets/diagram.png');
      expect(placeholder.querySelector('.fallback-alt')?.textContent).toBe('Alt: Diagrama de Arquitetura');
    });

    it('replaces image with fallback placeholder when error event fires', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="slide-content">
          <img src="missing-image.png" alt="Foto ausente" />
        </div>
      `;
      document.body.appendChild(container);

      handleMissingImagesInPresentation(container);

      const img = container.querySelector('img') as HTMLImageElement;
      expect(img.getAttribute('loading')).toBe('lazy');

      // Simula erro de carregamento
      img.dispatchEvent(new Event('error'));

      expect(container.querySelector('img')).toBeNull();
      const fallback = container.querySelector('.presentation-image-fallback');
      expect(fallback).not.toBeNull();
      expect(fallback?.textContent).toContain('missing-image.png');
      expect(fallback?.textContent).toContain('Foto ausente');
    });
  });

  describe('Code Block Decoration', () => {
    it('adds language badge to code blocks and avoids duplicates', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <pre data-language="rust"><code>fn main() {}</code></pre>
        <pre class="shiki language-typescript"><code>const x = 1;</code></pre>
        <pre class="mermaid-code-fallback"><code>graph TD</code></pre>
      `;
      document.body.appendChild(container);

      decoratePresentationCodeBlocks(container);

      const rustPre = container.querySelectorAll('pre')[0];
      const tsPre = container.querySelectorAll('pre')[1];
      const mermaidPre = container.querySelectorAll('pre')[2];

      expect(rustPre.querySelector('.presentation-code-badge')?.textContent).toBe('rust');
      expect(tsPre.querySelector('.presentation-code-badge')?.textContent).toBe('typescript');
      expect(mermaidPre.querySelector('.presentation-code-badge')).toBeNull();

      // Segunda execução não duplica badges
      decoratePresentationCodeBlocks(container);
      expect(rustPre.querySelectorAll('.presentation-code-badge').length).toBe(1);
    });
  });

  describe('Full Enhancement Pipeline', () => {
    it('executes code decoration, image fallbacks, and mermaid rendering together', async () => {
      vi.spyOn(mermaidModule, 'renderMermaid').mockResolvedValue({
        svg: '<svg>Diagram</svg>',
      });

      const container = document.createElement('div');
      container.innerHTML = `
        <pre data-language="python"><code>print("hello")</code></pre>
        <img src="offline.png" />
        <div class="mermaid-diagram-container" data-mermaid-code="graph TD\\nA-->B">
          <pre class="mermaid-code-fallback"><code>code</code></pre>
        </div>
      `;
      document.body.appendChild(container);

      await enhancePresentationContent(container, { isDark: true });

      expect(container.querySelector('.presentation-code-badge')?.textContent).toBe('python');
      expect(container.querySelector('.mermaid-diagram-container')?.getAttribute('data-rendered')).toBe('true');

      const img = container.querySelector('img') as HTMLImageElement;
      img.dispatchEvent(new Event('error'));
      expect(container.querySelector('.presentation-image-fallback')).not.toBeNull();
    });
  });
});
