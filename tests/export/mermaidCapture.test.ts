import { describe, it, expect, beforeEach } from "vitest";
import {
  cleanSvgForEpub,
  captureMermaidSvgsFromDom,
  isPreviewActive,
  getMermaidPromptDecision,
} from "../../src/export/mermaidCapture";
import type { MermaidSlot } from "../../src/export/epubTypes";

describe("MD-EPUB-002: Mermaid Capture & Sanitization (md_epub_002_mermaid_capture_pass)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  describe("Limpeza do SVG (sem scripts, com viewBox, largura responsiva)", () => {
    it("remove scripts e atributos on* maliciosos", () => {
      const maliciousSvg = `
<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg" onclick="alert('pwned')">
  <script>alert('xss');</script>
  <circle cx="50" cy="50" r="40" onload="badCode()" onmouseover="steal()"/>
  <a href="javascript:doEvil()">
    <text x="10" y="20">Clique aqui</text>
  </a>
</svg>
`;
      const cleaned = cleanSvgForEpub(maliciousSvg);

      expect(cleaned).not.toContain("<script>");
      expect(cleaned).not.toContain("alert('xss')");
      expect(cleaned).not.toContain("onclick");
      expect(cleaned).not.toContain("onload");
      expect(cleaned).not.toContain("onmouseover");
      expect(cleaned).not.toContain("javascript:");
      expect(cleaned).toContain("<circle");
      expect(cleaned).toContain("Clique aqui");
    });

    it("garante existência de viewBox quando ausente e normaliza largura", () => {
      const svgWithoutViewBox = `
<svg width="600" height="350" style="max-width: 600px; display: block;">
  <rect x="0" y="0" width="100" height="100" fill="blue"/>
</svg>
`;
      const cleaned = cleanSvgForEpub(svgWithoutViewBox);

      expect(cleaned).toContain('viewBox="0 0 600 350"');
      expect(cleaned).toContain('width="100%"');
      expect(cleaned).not.toContain("max-width: 600px");
      expect(cleaned).toContain('xmlns="http://www.w3.org/2000/svg"');
    });

    it("preserva viewBox existente e embute estilos de defs", () => {
      const styleEl = document.createElement("style");
      styleEl.id = "mermaid-svg-theme";
      styleEl.textContent = ".node text { fill: #4c4f69; } .edgePath { stroke: #1e66f5; }";
      document.head.appendChild(styleEl);

      const svgWithViewBox = `
<svg viewBox="0 0 800 400" width="800" height="400">
  <g class="node"><text>Node A</text></g>
</svg>
`;
      const cleaned = cleanSvgForEpub(svgWithViewBox, document);

      expect(cleaned).toContain('viewBox="0 0 800 400"');
      expect(cleaned).toContain("<defs");
      expect(cleaned).toContain("<style>");
      expect(cleaned).toContain(".node text { fill: #4c4f69; }");

      styleEl.remove();
    });
  });

  describe("Captura de SVG do DOM", () => {
    it("captura SVGs montados no DOM para preencher mermaidSlots", () => {
      // Setup mock preview DOM
      document.body.innerHTML = `
        <div class="preview" aria-label="Preview">
          <div class="preview-body">
            <div class="mermaid-diagram-container" data-mermaid-code="flowchart TD\n  A --> B">
              <figure class="mermaid-chrome">
                <div class="mermaid-panzoom-target">
                  <svg id="mmd-1" width="300" height="150" viewBox="0 0 300 150">
                    <text>Fluxo A para B</text>
                  </svg>
                </div>
              </figure>
            </div>
            <div class="mermaid-diagram-container" data-mermaid-code="sequenceDiagram\n  A->>B: Hi">
              <figure class="mermaid-chrome">
                <div class="mermaid-panzoom-target">
                  <svg id="mmd-2" width="400" height="200" viewBox="0 0 400 200">
                    <text>Sequencia</text>
                  </svg>
                </div>
              </figure>
            </div>
          </div>
        </div>
      `;

      const slots: MermaidSlot[] = [
        {
          id: "mermaid-0",
          placeholder: "{{MERMAID:mermaid-0}}",
          source: "flowchart TD\n  A --> B",
        },
        {
          id: "mermaid-1",
          placeholder: "{{MERMAID:mermaid-1}}",
          source: "sequenceDiagram\n  A->>B: Hi",
        },
      ];

      const summary = captureMermaidSvgsFromDom(slots, document);

      expect(summary.totalSlots).toBe(2);
      expect(summary.capturedCount).toBe(2);
      expect(summary.missingCount).toBe(0);
      expect(summary.previewActive).toBe(true);
      expect(summary.needsPrompt).toBe(false);

      expect(slots[0].svgContent).toBeDefined();
      expect(slots[0].svgContent).toContain("Fluxo A para B");
      expect(slots[0].svgContent).toContain('viewBox="0 0 300 150"');

      expect(slots[1].svgContent).toBeDefined();
      expect(slots[1].svgContent).toContain("Sequencia");
      expect(slots[1].svgContent).toContain('viewBox="0 0 400 200"');
    });
  });

  describe("Detecção e Prompt quando Preview Inativo", () => {
    it("detecta quando preview não está ativo no DOM", () => {
      // Empty document -> no preview element
      document.body.innerHTML = `
        <div class="editor-pane">
          <textarea>Documento Markdown</textarea>
        </div>
      `;

      expect(isPreviewActive(document)).toBe(false);

      const slots: MermaidSlot[] = [
        {
          id: "mermaid-0",
          placeholder: "{{MERMAID:mermaid-0}}",
          source: "graph TD; A-->B;",
        },
      ];

      const summary = captureMermaidSvgsFromDom(slots, document);

      expect(summary.previewActive).toBe(false);
      expect(summary.capturedCount).toBe(0);
      expect(summary.missingCount).toBe(1);
      expect(summary.needsPrompt).toBe(true);
      expect(slots[0].svgContent).toBeUndefined();

      const decision = getMermaidPromptDecision(summary);
      expect(decision.shouldPrompt).toBe(true);
      expect(decision.message).toContain("pré-visualização não está ativa");
    });

    it("não solicita prompt quando não há diagramas Mermaid", () => {
      document.body.innerHTML = `
        <div class="editor-pane">
          <textarea>Texto simples</textarea>
        </div>
      `;

      const summary = captureMermaidSvgsFromDom([], document);
      expect(summary.needsPrompt).toBe(false);

      const decision = getMermaidPromptDecision(summary);
      expect(decision.shouldPrompt).toBe(false);
      expect(decision.message).toBe("");
    });

    it("solicita prompt se algum diagrama falhou ou não renderizou", () => {
      document.body.innerHTML = `
        <div class="preview">
          <div class="preview-body">
            <div class="mermaid-diagram-container" data-mermaid-code="flowchart TD\n  A --> B">
              <svg id="mmd-1"><text>Diagrama 1</text></svg>
            </div>
            <!-- Diagrama 2 falhou ou está carregando -->
            <div class="mermaid-diagram-container" data-mermaid-code="broken diagram">
              <div class="mermaid-error">Erro de sintaxe</div>
            </div>
          </div>
        </div>
      `;

      const slots: MermaidSlot[] = [
        {
          id: "mermaid-0",
          placeholder: "{{MERMAID:mermaid-0}}",
          source: "flowchart TD\n  A --> B",
        },
        {
          id: "mermaid-1",
          placeholder: "{{MERMAID:mermaid-1}}",
          source: "broken diagram",
        },
      ];

      const summary = captureMermaidSvgsFromDom(slots, document);
      expect(summary.previewActive).toBe(true);
      expect(summary.capturedCount).toBe(1);
      expect(summary.missingCount).toBe(1);
      expect(summary.needsPrompt).toBe(true);

      const decision = getMermaidPromptDecision(summary);
      expect(decision.shouldPrompt).toBe(true);
      expect(decision.message).toContain("Foram encontrados 2 diagramas Mermaid, mas apenas 1");
    });
  });
});
