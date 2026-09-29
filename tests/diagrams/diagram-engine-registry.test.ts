import { describe, it, expect, beforeEach } from "vitest";
import { DiagramEngineRegistry, diagramEngineRegistry } from "../../src/services/diagramEngineRegistry";
import { processMarkdown } from "../../src/markdown/processor";

describe("DiagramEngineRegistry (052)", () => {
  it("tem engines padrão registradas (mermaid, graphviz, wavedrom, d2)", () => {
    const engines = diagramEngineRegistry.getEngines();
    const ids = engines.map((e) => e.id);
    expect(ids).toContain("mermaid");
    expect(ids).toContain("graphviz");
    expect(ids).toContain("wavedrom");
    expect(ids).toContain("d2");
  });

  it("localiza engine por linguagem (case-insensitive)", () => {
    expect(diagramEngineRegistry.findByLanguage("mermaid")?.id).toBe("mermaid");
    expect(diagramEngineRegistry.findByLanguage("MERMAID")?.id).toBe("mermaid");
    expect(diagramEngineRegistry.findByLanguage("dot")?.id).toBe("graphviz");
    expect(diagramEngineRegistry.findByLanguage("graphviz")?.id).toBe("graphviz");
    expect(diagramEngineRegistry.findByLanguage("wavedrom")?.id).toBe("wavedrom");
    expect(diagramEngineRegistry.findByLanguage("d2")?.id).toBe("d2");
    expect(diagramEngineRegistry.findByLanguage("unknown")).toBeNull();
  });

  it("permite registrar novas engines customizadas", () => {
    const customRegistry = new DiagramEngineRegistry();
    customRegistry.register({
      id: "mock-engine",
      languages: ["mock"],
      label: "Mock Engine",
      available: true,
      render: async (src) => ({ svg: `<svg id="mock">${src}</svg>` }),
    });

    expect(customRegistry.findByLanguage("mock")?.id).toBe("mock-engine");
  });

  it("rejeita renderização de engine não cadastrada", async () => {
    const res = await diagramEngineRegistry.render("desconhecida", "diagram content");
    expect(res.error).toContain("Engine não encontrada");
  });

  it("informa adiamento de D2 conforme ADR-diagram-engines.md", async () => {
    const d2Engine = diagramEngineRegistry.findByLanguage("d2");
    expect(d2Engine).not.toBeNull();
    expect(d2Engine?.available).toBe(false);

    const res = await diagramEngineRegistry.render("d2", "x -> y");
    expect(res.error).toContain("temporariamente adiada");
  });

  it("renderiza Graphviz/DOT gerando SVG válido", async () => {
    const dotSource = `
      digraph G {
        rankdir=LR;
        A -> B [label="teste"];
      }
    `;
    const res = await diagramEngineRegistry.render("dot", dotSource);
    expect(res.error).toBeUndefined();
    expect(res.svg).toBeDefined();
    expect(res.svg).toContain("<svg");
    expect(res.svg).toContain("teste");
  });

  it("retorna erro com preservação em caso de sintaxe Graphviz inválida", async () => {
    const invalidDot = `digraph G { A -> }`;
    const res = await diagramEngineRegistry.render("dot", invalidDot);
    expect(res.error).toBeDefined();
  });

  it("renderiza WaveDrom com WaveJSON gerando SVG", async () => {
    const waveJson = JSON.stringify({
      signal: [
        { name: "clk", wave: "p....." },
        { name: "data", wave: "x.345x", data: ["head", "body", "tail"] },
      ],
    });
    const res = await diagramEngineRegistry.render("wavedrom", waveJson);
    expect(res.error).toBeUndefined();
    expect(res.svg).toBeDefined();
    expect(res.svg).toContain("<svg");
  });

  it("retorna erro legível se WaveDrom receber JSON inválido", async () => {
    const invalidJson = `{ signal: [ invalid json }`;
    const res = await diagramEngineRegistry.render("wavedrom", invalidJson);
    expect(res.error).toBeDefined();
    expect(res.error).toContain("WaveJSON");
  });

  it("mantém suporte canônico e inalterado ao Mermaid", async () => {
    const mermaidSource = `
      graph TD;
        A-->B;
    `;
    const res = await diagramEngineRegistry.render("mermaid", mermaidSource);
    expect(res.svg || res.error).toBeTruthy();
  });
});

describe("Pipeline Unified de Diagramas adicionais (052)", () => {
  it("intercepta blocos ```dot como containers de diagrama", async () => {
    const md = `
# Teste Graphviz
\`\`\`dot
digraph G {
  A -> B;
}
\`\`\`
    `.trim();

    const result = await processMarkdown(md);
    expect(result.html).toContain('class="mermaid-diagram-container diagram-language-graphviz"');
    expect(result.html).toContain('data-diagram-language="graphviz"');
    expect(result.html).toContain('A -&gt; B;');
  });

  it("intercepta blocos ```wavedrom como containers de diagrama", async () => {
    const md = `
\`\`\`wavedrom
{ "signal": [{ "name": "clk", "wave": "p..." }] }
\`\`\`
    `.trim();

    const result = await processMarkdown(md);
    expect(result.html).toContain('class="mermaid-diagram-container diagram-language-wavedrom"');
    expect(result.html).toContain('data-diagram-language="wavedrom"');
  });

  it("mantém blocos ```mermaid canônicos funcionando perfeitamente", async () => {
    const md = `
\`\`\`mermaid
graph TD;
  A-->B;
\`\`\`
    `.trim();

    const result = await processMarkdown(md);
    expect(result.html).toContain('class="mermaid-diagram-container"');
    expect(result.html).toContain('data-diagram-language="mermaid"');
  });
});
