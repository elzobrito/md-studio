/**
 * editorialFallback.ts - Política transversal de Fallback Editorial
 * Conforme especificação 049-fallback-editorial.md
 *
 * Regra mestra:
 * "Máxima fidelidade -> degradação legível -> nunca perda silenciosa"
 */

import type {
  ExportEditorialWarning,
  ExportNodeType,
  RenderOutcome,
  SourceLocation,
} from "../contracts/publishingTypes";

export interface FallbackHandler<T = string> {
  handle(
    sourceContent: string,
    location?: SourceLocation,
    context?: Record<string, unknown>
  ): RenderOutcome<T>;
}

export class FallbackPolicyRegistry {
  private handlers = new Map<string, FallbackHandler>();

  private makeKey(exporterId: string, nodeType: ExportNodeType): string {
    return `${exporterId}:${nodeType}`;
  }

  register(exporterId: string, nodeType: ExportNodeType, handler: FallbackHandler): void {
    this.handlers.set(this.makeKey(exporterId, nodeType), handler);
  }

  resolve(exporterId: string, nodeType: ExportNodeType): FallbackHandler | undefined {
    // 1. Tenta específico por exporter
    const specific = this.handlers.get(this.makeKey(exporterId, nodeType));
    if (specific) return specific;
    // 2. Fallback para handler genérico universal '*'
    return this.handlers.get(this.makeKey("*", nodeType));
  }

  clear(): void {
    this.handlers.clear();
  }
}

/**
 * Escapa caracteres HTML para garantir segurança ao injetar código puro
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Handler padrão para diagramas Mermaid
 * Nunca exibe cache obsoleto; em caso de falha, degrada para bloco de código legível
 */
export class MermaidFallbackHandler implements FallbackHandler<string> {
  handle(
    sourceContent: string,
    location?: SourceLocation,
    context?: Record<string, unknown>
  ): RenderOutcome<string> {
    const errorMsg = context?.error ? String(context.error) : "Sintaxe Mermaid inválida";

    return {
      status: "fallback",
      value: `<pre class="mermaid-fallback"><code class="language-mermaid">${escapeHtml(sourceContent)}</code></pre>`,
      warning: {
        code: "FALLBACK_MERMAID_SOURCE",
        nodeType: "mermaid",
        message: `Diagrama Mermaid inválido (${errorMsg}) degradado para código-fonte legível`,
        sourceLocation: location,
        fallbackKind: "source-code",
        fallbackValue: sourceContent,
      },
    };
  }
}

/**
 * Handler padrão para expressões matemáticas KaTeX/MathML
 * Degrada para código LaTeX puro entre tags de código
 */
export class MathFallbackHandler implements FallbackHandler<string> {
  private isBlock: boolean;

  constructor(isBlock: boolean = false) {
    this.isBlock = isBlock;
  }

  handle(
    sourceContent: string,
    location?: SourceLocation,
    context?: Record<string, unknown>
  ): RenderOutcome<string> {
    const errorMsg = context?.error ? String(context.error) : "Erro de sintaxe matemática";
    const tag = this.isBlock ? "pre" : "code";

    return {
      status: "fallback",
      value: `<${tag} class="math-fallback">${escapeHtml(sourceContent)}</${tag}>`,
      warning: {
        code: "FALLBACK_MATH_SOURCE",
        nodeType: this.isBlock ? "math-block" : "math-inline",
        message: `Expressão matemática (${errorMsg}) degradada para código LaTeX puro`,
        sourceLocation: location,
        fallbackKind: "source-code",
        fallbackValue: sourceContent,
      },
    };
  }
}

/**
 * Handler padrão para imagens ausentes ou não resolvíveis
 * Degrada para texto alternativo ou placeholder explicativo
 */
export class ImageFallbackHandler implements FallbackHandler<string> {
  handle(
    sourceContent: string,
    location?: SourceLocation,
    context?: Record<string, unknown>
  ): RenderOutcome<string> {
    const alt = (context?.alt as string) || "imagem";
    return {
      status: "fallback",
      value: `<span class="image-fallback" role="img" aria-label="${escapeHtml(alt)}">[Imagem indisponível: ${escapeHtml(alt)}]</span>`,
      warning: {
        code: "FALLBACK_IMAGE_MISSING",
        nodeType: "image",
        message: `Imagem '${sourceContent}' não encontrada localmente; degradada para texto alternativo`,
        sourceLocation: location,
        fallbackKind: "placeholder",
        fallbackValue: alt,
      },
    };
  }
}

/**
 * Handler padrão para blocos de código com falha no syntax highlighter
 * Degrada para bloco de código HTML padrão sem estilização
 */
export class CodeBlockFallbackHandler implements FallbackHandler<string> {
  handle(
    sourceContent: string,
    location?: SourceLocation,
    context?: Record<string, unknown>
  ): RenderOutcome<string> {
    const lang = (context?.lang as string) || "text";
    return {
      status: "fallback",
      value: `<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(sourceContent)}</code></pre>`,
      warning: {
        code: "FALLBACK_CODE_PLAIN",
        nodeType: "code-block",
        message: `Realce de sintaxe indisponível para linguagem '${lang}'; degradado para texto puro`,
        sourceLocation: location,
        fallbackKind: "source-code",
        fallbackValue: sourceContent,
      },
    };
  }
}

/**
 * Handler para adaptação intencional de Wiki Links
 * ATENÇÃO: Adaptações planejadas retornam 'adapted' sem emitir warning ruidoso
 */
export class WikiLinkAdaptationHandler implements FallbackHandler<string> {
  handle(
    sourceContent: string,
    _location?: SourceLocation,
    context?: Record<string, unknown>
  ): RenderOutcome<string> {
    const label = (context?.label as string) || sourceContent;
    return {
      status: "adapted",
      value: escapeHtml(label),
      adaptation: "wiki-link-to-plain-text",
    };
  }
}

// Instância singleton global do registry de políticas editoriais
export const fallbackPolicyRegistry = new FallbackPolicyRegistry();

// Registros universais default
fallbackPolicyRegistry.register("*", "mermaid", new MermaidFallbackHandler());
fallbackPolicyRegistry.register("*", "math-inline", new MathFallbackHandler(false));
fallbackPolicyRegistry.register("*", "math-block", new MathFallbackHandler(true));
fallbackPolicyRegistry.register("*", "image", new ImageFallbackHandler());
fallbackPolicyRegistry.register("*", "code-block", new CodeBlockFallbackHandler());
fallbackPolicyRegistry.register("*", "wiki-link", new WikiLinkAdaptationHandler());
