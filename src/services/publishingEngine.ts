/**
 * publishingEngine.ts - Infraestrutura central do Publishing Engine
 * Conforme especificação 046-publishing-engine.md
 *
 * Regras:
 * - Abstração unificada DocumentExporter e ExporterRegistry
 * - Desacoplado do DOM de preview (opera sobre ExportSourceSnapshot)
 * - 100% offline, local-first, zero chamadas de rede ou telemetria
 */

import type {
  ExportArtifactDescriptor,
  ExportCapabilityDecision,
  ExportContext,
  ExportDestination,
  ExportJobPhase,
  ExportRequest,
  ExportResult,
  ExportSourceSnapshot,
  ExportWarning,
  ExporterCapability,
} from "../contracts/publishingTypes";
import { exportHtmlDocument } from "./export";
import { exportActiveDocumentEpub } from "./exportEpub";
import { buildSelfContainedHtml } from "./htmlSelfContainedExporter";
import { confirmOverwrite, ipc, isTauriRuntime } from "../lib/ipc/client";

export interface DocumentExporter<TOptions = Record<string, unknown>> {
  readonly id: string;
  readonly label: string;
  readonly extension: string;

  canExport(context: ExportContext): ExportCapabilityDecision;
  defaultOptions(context: ExportContext): TOptions;
  export(request: ExportRequest<TOptions>, context: ExportContext): Promise<ExportResult>;
}

export class ExporterRegistry {
  private exporters: DocumentExporter[] = [];

  register(exporter: DocumentExporter): void {
    const existingIdx = this.exporters.findIndex((e) => e.id === exporter.id);
    if (existingIdx >= 0) {
      this.exporters[existingIdx] = exporter;
    } else {
      this.exporters.push(exporter);
    }
  }

  getExporters(): DocumentExporter[] {
    return [...this.exporters];
  }

  findExporter(id: string): DocumentExporter | null {
    return this.exporters.find((e) => e.id === id) || null;
  }

  getCapabilities(context: ExportContext): ExporterCapability[] {
    return this.exporters.map((exporter) => {
      const decision = exporter.canExport(context);
      return {
        id: exporter.id,
        label: exporter.label,
        extension: exporter.extension,
        status: decision.status,
        reason: "reason" in decision ? decision.reason : undefined,
        supportsProgress: false,
        supportsCancellation: true,
        optionsVersion: 1,
      };
    });
  }

  clear(): void {
    this.exporters = [];
  }
}

/**
 * Exporter HTML baseado em AST e processMarkdown, independente do DOM de preview
 */
export class HtmlDocumentExporter implements DocumentExporter<{ title?: string }> {
  readonly id = "html";
  readonly label = "HTML";
  readonly extension = "html";

  canExport(context: ExportContext): ExportCapabilityDecision {
    if (!context.activeDocument) {
      return { status: "disabled", reason: "Nenhum documento aberto para exportar" };
    }
    return { status: "available" };
  }

  defaultOptions(context: ExportContext): { title?: string } {
    return {
      title: context.activeDocument?.displayName || "Documento MD Studio",
    };
  }

  async export(
    request: ExportRequest<{ title?: string }>,
    _context: ExportContext
  ): Promise<ExportResult> {
    const { html, warnings } = await buildSelfContainedHtml(request.source.markdown, {
      title: request.options.title || request.source.displayName,
    });

    if (request.destination.kind === "memory") {
      return {
        ok: true,
        exporterId: this.id,
        artifacts: [
          {
            kind: "file",
            mediaType: "text/html",
            content: html,
            byteLength: new TextEncoder().encode(html).length,
          },
        ],
        warnings: [],
      };
    }

    if (request.destination.kind === "browser-download") {
      if (typeof window !== "undefined" && typeof document !== "undefined") {
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = request.destination.fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      }
      return {
        ok: true,
        exporterId: this.id,
        artifacts: [
          {
            kind: "file",
            path: request.destination.fileName,
            byteLength: new TextEncoder().encode(html).length,
          },
        ],
        warnings: [],
      };
    }

    // Native file destination
    const destPath = request.destination.absolutePath;
    const overwrite = Boolean(request.destination.overwrite);

    if (isTauriRuntime()) {
      try {
        await ipc.exportHtml(html, destPath, overwrite);
        return {
          ok: true,
          exporterId: this.id,
          artifacts: [{ kind: "file", path: destPath, byteLength: html.length }],
          warnings: [],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("ExportTargetExists") || msg.includes("exists")) {
          const confirmed = await confirmOverwrite(destPath);
          if (!confirmed) {
            return { ok: false, exporterId: this.id, artifacts: [], warnings: [], cancelled: true };
          }
          await ipc.exportHtml(html, destPath, true);
          return {
            ok: true,
            exporterId: this.id,
            artifacts: [{ kind: "file", path: destPath, byteLength: html.length }],
            warnings: [],
          };
        }
        return { ok: false, exporterId: this.id, artifacts: [], warnings: [], error: msg };
      }
    }

    return {
      ok: true,
      exporterId: this.id,
      artifacts: [{ kind: "file", path: destPath, byteLength: html.length }],
      warnings: [],
    };
  }
}

/**
 * Adapter de compatibilidade com window.print()
 * NOTA: Não satisfaz o gate do 050 (PDF exporter futuro standalone).
 */
export class LegacyPrintPdfExporter implements DocumentExporter {
  readonly id = "pdf-legacy";
  readonly label = "PDF (Impressão do Sistema)";
  readonly extension = "pdf";

  canExport(context: ExportContext): ExportCapabilityDecision {
    if (!context.activeDocument) {
      return { status: "disabled", reason: "Nenhum documento aberto para imprimir" };
    }
    return { status: "available" };
  }

  defaultOptions(_context: ExportContext): Record<string, unknown> {
    return {};
  }

  async export(
    _request: ExportRequest,
    _context: ExportContext
  ): Promise<ExportResult> {
    if (typeof window !== "undefined") {
      window.print();
      return {
        ok: true,
        exporterId: this.id,
        artifacts: [],
        warnings: [
          {
            code: "LEGACY_PRINT_PDF",
            message: "A exportação PDF atual utiliza o diálogo de impressão nativo do navegador.",
            scope: "format",
          },
        ],
      };
    }
    return {
      ok: false,
      exporterId: this.id,
      artifacts: [],
      warnings: [],
      error: "Ambiente não suporta window.print",
    };
  }
}

/**
 * Exporter EPUB 3 integrado ao Publishing Engine
 * Conforme especificação 048-epub-3.md
 */
export class EpubDocumentExporter implements DocumentExporter<{ defaultName?: string; ignoreMermaidPrompt?: boolean }> {
  readonly id = "epub";
  readonly label = "EPUB";
  readonly extension = "epub";

  canExport(context: ExportContext): ExportCapabilityDecision {
    if (!context.activeDocument) {
      return { status: "disabled", reason: "Nenhum documento aberto para exportar" };
    }
    if (!isTauriRuntime()) {
      return {
        status: "unavailable",
        reason: "A exportação EPUB 3 está disponível apenas no aplicativo Desktop (Tauri).",
      };
    }
    return { status: "available" };
  }

  defaultOptions(context: ExportContext): { defaultName?: string; ignoreMermaidPrompt?: boolean } {
    const rawName = context.activeDocument?.displayName || "documento";
    const baseName = rawName.replace(/\.md$/i, "");
    return {
      defaultName: `${baseName}.epub`,
      ignoreMermaidPrompt: false,
    };
  }

  async export(
    request: ExportRequest<{ defaultName?: string; ignoreMermaidPrompt?: boolean }>,
    context: ExportContext
  ): Promise<ExportResult> {
    const defaultName = request.options?.defaultName || this.defaultOptions(context).defaultName;
    const destinationOverride =
      request.destination.kind === "native-file" ? request.destination.absolutePath : undefined;

    const outcome = await exportActiveDocumentEpub({
      markdown: request.source.markdown,
      defaultName,
      workspaceId: (request.source.workspaceId || context.workspaceRoot) ?? undefined,
      destinationOverride,
      ignoreMermaidPrompt: request.options?.ignoreMermaidPrompt,
    });

    const warnings: ExportWarning[] = [];
    if (outcome.mermaidSummary && outcome.mermaidSummary.missingCount > 0) {
      warnings.push({
        code: "MERMAID_EDITORIAL_FALLBACK",
        message: `${outcome.mermaidSummary.missingCount} diagrama(s) Mermaid não puderam ser capturados e utilizaram fallback editorial.`,
        scope: "format",
      });
    }

    if (outcome.result?.warnings) {
      for (const w of outcome.result.warnings) {
        warnings.push({
          code: "EPUB_BACKEND_WARNING",
          message: w,
          scope: "format",
        });
      }
    }

    const artifacts: ExportArtifactDescriptor[] = outcome.path
      ? [
          {
            kind: "file",
            path: outcome.path,
            mediaType: "application/epub+zip",
          },
        ]
      : [];

    return {
      ok: outcome.ok,
      exporterId: this.id,
      artifacts,
      warnings,
      cancelled: outcome.cancelled,
      error: outcome.error,
    };
  }
}

export interface PublishingEngineState {
  phase: ExportJobPhase;
  currentJobId: string | null;
  lastResult: ExportResult | null;
  error: string | null;
}

export class PublishingEngineService {
  private registry = new ExporterRegistry();
  private state: PublishingEngineState = {
    phase: "idle",
    currentJobId: null,
    lastResult: null,
    error: null,
  };
  private cancelRequested = false;

  constructor() {
    this.registry.register(new HtmlDocumentExporter());
    this.registry.register(new LegacyPrintPdfExporter());
    this.registry.register(new EpubDocumentExporter());
  }

  getRegistry(): ExporterRegistry {
    return this.registry;
  }

  getState(): PublishingEngineState {
    return { ...this.state };
  }

  cancelJob(): void {
    this.cancelRequested = true;
    this.state.phase = "cancelled";
  }

  async exportDocument(
    exporterId: string,
    source: ExportSourceSnapshot,
    destination: ExportDestination,
    options: Record<string, unknown> = {}
  ): Promise<ExportResult> {
    const exporter = this.registry.findExporter(exporterId);
    if (!exporter) {
      const err = `Exporter '${exporterId}' não encontrado no registry`;
      this.state.phase = "failed";
      this.state.error = err;
      return { ok: false, exporterId, artifacts: [], warnings: [], error: err };
    }

    const context: ExportContext = {
      activeDocument: source,
      isDirty: false,
      workspaceRoot: source.workspaceId,
    };

    const decision = exporter.canExport(context);
    if (decision.status !== "available") {
      const err = `Exporter '${exporterId}' não está disponível: ${"reason" in decision ? decision.reason : "indisponível"}`;
      this.state.phase = "failed";
      this.state.error = err;
      return { ok: false, exporterId, artifacts: [], warnings: [], error: err };
    }

    this.cancelRequested = false;
    const jobId = `export-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.state = {
      phase: "exporting",
      currentJobId: jobId,
      lastResult: null,
      error: null,
    };

    const request: ExportRequest = {
      jobId,
      exporterId,
      source,
      destination,
      options,
    };

    try {
      const result = await exporter.export(request, context);
      if (this.cancelRequested) {
        this.state.phase = "cancelled";
        return { ok: false, exporterId, artifacts: [], warnings: [], cancelled: true };
      }
      this.state.phase = result.ok ? "completed" : "failed";
      this.state.lastResult = result;
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.state.phase = "failed";
      this.state.error = msg;
      return { ok: false, exporterId, artifacts: [], warnings: [], error: msg };
    }
  }
}

export const publishingEngine = new PublishingEngineService();
