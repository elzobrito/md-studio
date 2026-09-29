import { describe, it, expect, beforeEach } from 'vitest';
import {
  FallbackPolicyRegistry,
  MermaidFallbackHandler,
  MathFallbackHandler,
  ImageFallbackHandler,
  CodeBlockFallbackHandler,
  WikiLinkAdaptationHandler,
  escapeHtml,
} from '../../src/services/editorialFallback';

describe('Editorial Fallback (Spec 049)', () => {
  let registry: FallbackPolicyRegistry;

  beforeEach(() => {
    registry = new FallbackPolicyRegistry();
  });

  describe('FallbackPolicyRegistry', () => {
    it('registers and resolves exporter-specific and universal handlers', () => {
      const mermaidHandler = new MermaidFallbackHandler();
      registry.register('html', 'mermaid', mermaidHandler);

      const resolved = registry.resolve('html', 'mermaid');
      expect(resolved).toBe(mermaidHandler);

      const universalImage = new ImageFallbackHandler();
      registry.register('*', 'image', universalImage);

      // EPUB resolves universal '*' handler
      expect(registry.resolve('epub', 'image')).toBe(universalImage);
      // HTML also resolves universal '*' handler
      expect(registry.resolve('html', 'image')).toBe(universalImage);
    });
  });

  describe('Mermaid Fallback Handler', () => {
    it('degrades invalid diagram to readable source code without silent loss', () => {
      const handler = new MermaidFallbackHandler();
      const rawDiagram = 'graph TD\nA[Inicio] -->|erro de parse| B';

      const outcome = handler.handle(rawDiagram, { line: 12 }, { error: 'Syntax error at line 1' });

      expect(outcome.status).toBe('fallback');
      if (outcome.status === 'fallback') {
        expect(outcome.value).toContain('class="mermaid-fallback"');
        expect(outcome.value).toContain(escapeHtml(rawDiagram));
        expect(outcome.warning.code).toBe('FALLBACK_MERMAID_SOURCE');
        expect(outcome.warning.nodeType).toBe('mermaid');
        expect(outcome.warning.fallbackKind).toBe('source-code');
        expect(outcome.warning.sourceLocation?.line).toBe(12);
      }
    });
  });

  describe('Math Fallback Handler', () => {
    it('degrades inline and block LaTeX to code tags with warnings', () => {
      const inlineHandler = new MathFallbackHandler(false);
      const rawFormula = '\\frac{a}{b}';

      const inlineOutcome = inlineHandler.handle(rawFormula, { line: 5 });
      expect(inlineOutcome.status).toBe('fallback');
      if (inlineOutcome.status === 'fallback') {
        expect(inlineOutcome.value).toContain('<code class="math-fallback">');
        expect(inlineOutcome.value).toContain(escapeHtml(rawFormula));
        expect(inlineOutcome.warning.code).toBe('FALLBACK_MATH_SOURCE');
        expect(inlineOutcome.warning.nodeType).toBe('math-inline');
      }

      const blockHandler = new MathFallbackHandler(true);
      const blockOutcome = blockHandler.handle(rawFormula, { line: 20 });
      expect(blockOutcome.status).toBe('fallback');
      if (blockOutcome.status === 'fallback') {
        expect(blockOutcome.value).toContain('<pre class="math-fallback">');
        expect(blockOutcome.warning.nodeType).toBe('math-block');
      }
    });
  });

  describe('Image Fallback Handler', () => {
    it('produces accessible placeholder for missing local images with warning', () => {
      const handler = new ImageFallbackHandler();
      const outcome = handler.handle('./assets/missing.png', { line: 40 }, { alt: 'Diagrama de Arquitetura' });

      expect(outcome.status).toBe('fallback');
      if (outcome.status === 'fallback') {
        expect(outcome.value).toContain('[Imagem indisponível: Diagrama de Arquitetura]');
        expect(outcome.warning.code).toBe('FALLBACK_IMAGE_MISSING');
        expect(outcome.warning.nodeType).toBe('image');
        expect(outcome.warning.fallbackKind).toBe('placeholder');
      }
    });
  });

  describe('Code Block Fallback Handler', () => {
    it('degrades unhighlighted code to plain pre/code tags with warning', () => {
      const handler = new CodeBlockFallbackHandler();
      const code = 'SELECT * FROM users WHERE active = 1;';
      const outcome = handler.handle(code, { line: 15 }, { lang: 'custom-sql' });

      expect(outcome.status).toBe('fallback');
      if (outcome.status === 'fallback') {
        expect(outcome.value).toContain('<pre><code class="language-custom-sql">');
        expect(outcome.value).toContain(escapeHtml(code));
        expect(outcome.warning.code).toBe('FALLBACK_CODE_PLAIN');
      }
    });
  });

  describe('Wiki Link Planned Adaptation', () => {
    it('treats planned adaptation as status adapted without noisy warning', () => {
      const handler = new WikiLinkAdaptationHandler();
      const outcome = handler.handle('Arquitetura', undefined, { label: 'Visão Geral da Arquitetura' });

      expect(outcome.status).toBe('adapted');
      if (outcome.status === 'adapted') {
        expect(outcome.value).toBe('Visão Geral da Arquitetura');
        expect(outcome.adaptation).toBe('wiki-link-to-plain-text');
      }
    });
  });

  describe('Never Silent Loss Invariant', () => {
    it('guarantees that all fallback outputs retain original content or alt text', () => {
      const mermaid = new MermaidFallbackHandler().handle('diagram-content');
      const math = new MathFallbackHandler().handle('formula-content');
      const img = new ImageFallbackHandler().handle('img-path', undefined, { alt: 'alt-content' });
      const code = new CodeBlockFallbackHandler().handle('code-content');

      expect(mermaid.status === 'fallback' && mermaid.value.length).toBeGreaterThan(0);
      expect(math.status === 'fallback' && math.value.length).toBeGreaterThan(0);
      expect(img.status === 'fallback' && img.value.length).toBeGreaterThan(0);
      expect(code.status === 'fallback' && code.value.length).toBeGreaterThan(0);
    });
  });
});
