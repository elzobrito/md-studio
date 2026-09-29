/**
 * diagramEngineRegistry.ts
 *
 * Registry extensível de Diagram Engines adicionais para o MD Studio.
 * Conforme especificação 052 e docs/spec/ADR-diagram-engines.md.
 */

import { renderMermaid, type RenderMermaidOptions } from "../markdown/mermaid";

export interface DiagramRenderOptions {
  isDark?: boolean;
  theme?: string;
  [key: string]: unknown;
}

export interface DiagramRenderResult {
  svg?: string;
  error?: string;
}

export interface DiagramEngine {
  /** Identificador único da engine */
  id: string;
  /** Linguagens de fenced code block que esta engine atende (ex: ['dot', 'graphviz']) */
  languages: string[];
  /** Renderiza o código-fonte em SVG */
  render(source: string, options?: DiagramRenderOptions): Promise<DiagramRenderResult>;
  /** Indica se a engine está disponível localmente */
  available: boolean;
  /** Rótulo legível para interface */
  label: string;
}

// Cache singleton para instância WASM do Graphviz
let graphvizInstancePromise: Promise<any> | null = null;

async function getGraphvizInstance() {
  if (!graphvizInstancePromise) {
    const { Graphviz } = await import("@hpcc-js/wasm-graphviz");
    graphvizInstancePromise = Graphviz.load();
  }
  return graphvizInstancePromise;
}

export class DiagramEngineRegistry {
  private engines = new Map<string, DiagramEngine>();
  private languageMap = new Map<string, DiagramEngine>();

  constructor() {
    this.registerDefaults();
  }

  /**
   * Registra uma nova DiagramEngine
   */
  public register(engine: DiagramEngine): void {
    this.engines.set(engine.id, engine);
    for (const lang of engine.languages) {
      this.languageMap.set(lang.toLowerCase(), engine);
    }
  }

  /**
   * Localiza engine por linguagem de fenced code block (case-insensitive)
   */
  public findByLanguage(language: string): DiagramEngine | null {
    if (!language) return null;
    return this.languageMap.get(language.toLowerCase().trim()) ?? null;
  }

  /**
   * Retorna todas as engines registradas
   */
  public getEngines(): DiagramEngine[] {
    return Array.from(this.engines.values());
  }

  /**
   * Retorna todas as linguagens suportadas
   */
  public getSupportedLanguages(): string[] {
    return Array.from(this.languageMap.keys());
  }

  /**
   * Verifica se uma linguagem possui engine registrada
   */
  public isSupported(language: string): boolean {
    return this.findByLanguage(language) !== null;
  }

  /**
   * Renderiza código de diagrama de acordo com a linguagem informada
   */
  public async render(
    language: string,
    source: string,
    options?: DiagramRenderOptions,
  ): Promise<DiagramRenderResult> {
    const engine = this.findByLanguage(language);
    if (!engine) {
      return {
        error: `Engine não encontrada para a linguagem: "${language}"`,
      };
    }

    if (!engine.available) {
      return {
        error: `A engine "${engine.label}" (${engine.id}) está indisponível ou temporariamente adiada.`,
      };
    }

    const trimmed = source.trim();
    if (!trimmed) {
      return { error: "Diagrama vazio" };
    }

    try {
      return await engine.render(trimmed, options);
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private registerDefaults(): void {
    // 1. Mermaid (canônica)
    this.register({
      id: "mermaid",
      languages: ["mermaid"],
      label: "Mermaid",
      available: true,
      render: async (source, options) => {
        const mermaidOpts: RenderMermaidOptions = {
          isDark: options?.isDark,
          theme: options?.theme as any,
        };
        return renderMermaid(`diag-${Date.now()}`, source, mermaidOpts);
      },
    });

    // 2. Graphviz (DOT)
    this.register({
      id: "graphviz",
      languages: ["dot", "graphviz"],
      label: "Graphviz",
      available: true,
      render: async (source) => {
        try {
          const gv = await getGraphvizInstance();
          const svg = gv.dot(source);
          return { svg };
        } catch (e) {
          return {
            error: e instanceof Error ? e.message : "Erro na compilação Graphviz/DOT",
          };
        }
      },
    });

    // 3. WaveDrom (timing diagrams em WaveJSON)
    this.register({
      id: "wavedrom",
      languages: ["wavedrom"],
      label: "WaveDrom",
      available: true,
      render: async (source) => {
        try {
          let parsed: unknown;
          try {
            parsed = JSON.parse(source);
          } catch (jsonErr) {
            return {
              error: `Sintaxe WaveJSON inválida: ${jsonErr instanceof Error ? jsonErr.message : String(jsonErr)}`,
            };
          }

          if (typeof document === "undefined") {
            return { error: "Ambiente DOM indisponível para renderização do WaveDrom" };
          }

          const wavedromModule = await import("wavedrom");
          const wd = (wavedromModule as any).default || wavedromModule;
          const container = document.createElement("div");
          wd.renderWaveElement(0, parsed, container, wd.waveSkin);

          const svgEl = container.querySelector("svg");
          const svg = svgEl?.outerHTML || container.innerHTML;
          if (!svg) {
            return { error: "Nenhum SVG gerado pelo WaveDrom" };
          }
          return { svg };
        } catch (e) {
          return {
            error: e instanceof Error ? e.message : "Erro na renderização WaveDrom",
          };
        }
      },
    });

    // 4. D2 (Adiado conforme ADR-diagram-engines.md)
    this.register({
      id: "d2",
      languages: ["d2"],
      label: "D2",
      available: false,
      render: async () => {
        return {
          error: "D2 está temporariamente adiado conforme ADR-diagram-engines.md (bundle > budget)",
        };
      },
    });
  }
}

/** Instância singleton global padrão */
export const diagramEngineRegistry = new DiagramEngineRegistry();
