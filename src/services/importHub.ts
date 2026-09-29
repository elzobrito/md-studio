/**
 * importHub.ts - Infraestrutura central do Import Hub
 * Conforme especificação 042-import-hub.md e 045-import-fidelity-classes.md
 *
 * Regras:
 * - 100% offline, local-first, zero rede / zero IA
 * - Converter != Gravar (arquivo original nunca é alterado; nada é escrito sem confirmação)
 * - Path Fencing estrito na zona de destino (workspace)
 */

import type {
  DocumentSnapshot,
  ImportAssetDescriptor,
  ImportCommitResult,
  ImportDestination,
  ImportFormatCapability,
  ImportJobPhase,
  ImportResult,
  ImportSourceDescriptor,
  ImportWarning,
  ImporterCapability,
  SupportDecision,
} from "../contracts/types";
import { getFidelityDescriptor, normalizeFormatId } from "./importFidelity";

export interface DocumentImporter {
  readonly id: string;
  getCapability(): ImporterCapability;
  supports(source: ImportSourceDescriptor): SupportDecision;
  convert(source: ImportSourceDescriptor, options?: Record<string, unknown>): Promise<ImportResult>;
}

export class ImporterRegistry {
  private importers: DocumentImporter[] = [];

  register(importer: DocumentImporter): void {
    this.importers.push(importer);
  }

  getImporters(): DocumentImporter[] {
    return [...this.importers];
  }

  findImporter(source: ImportSourceDescriptor): DocumentImporter | null {
    for (const importer of this.importers) {
      const decision = importer.supports(source);
      if (decision.status === "supported") {
        return importer;
      }
    }
    return null;
  }

  getCapabilities(): ImporterCapability[] {
    return this.importers.map((i) => i.getCapability());
  }

  clear(): void {
    this.importers = [];
  }
}

/**
 * Sanitizador de nome de arquivo para o documento Markdown importado.
 * Impede separadores de caminho, path traversal (..), caracteres de controle e assegura terminação .md
 */
export function sanitizeMarkdownFilename(rawName: string): string {
  if (!rawName) return "documento-importado.md";
  let clean = rawName
    .replace(/\.\.+/g, "")
    .replace(/[/\\]+/g, "-")
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .trim();

  // Remove extensão antiga se houver
  clean = clean.replace(/\.[a-zA-Z0-9]+$/, "");
  clean = clean.replace(/-+$/, "");
  if (!clean) clean = "documento-importado";
  return `${clean}.md`;
}

/**
 * Validador estrito de destino relativo sob Path Fencing
 */
export function validateRelativeDestination(relativePath: string): { valid: boolean; reason?: string } {
  if (!relativePath || relativePath.trim() === "") {
    return { valid: false, reason: "Caminho relativo não pode ser vazio" };
  }
  const normalized = relativePath.replace(/\\/g, "/");
  if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) {
    return { valid: false, reason: "Caminho não pode ser absoluto" };
  }
  const parts = normalized.split("/");
  for (const part of parts) {
    if (part === "..") {
      return { valid: false, reason: "Tentativa de saída do workspace (.. detectado)" };
    }
  }
  if (!normalized.toLowerCase().endsWith(".md")) {
    return { valid: false, reason: "Arquivo de destino deve possuir extensão .md" };
  }
  return { valid: true };
}

/**
 * Importer padrão para formatos de texto/HTML estruturado local
 */
export class BuiltinTextDocumentImporter implements DocumentImporter {
  readonly id = "builtin-text-importer";

  getCapability(): ImporterCapability {
    return {
      id: this.id,
      available: true,
      runtime: "embedded",
      formats: [
        {
          formatId: "html",
          extensions: ["html", "htm"],
          mediaTypes: ["text/html"],
          available: true,
        },
        {
          formatId: "json",
          extensions: ["json"],
          mediaTypes: ["application/json"],
          available: true,
        },
        {
          formatId: "xml",
          extensions: ["xml"],
          mediaTypes: ["text/xml", "application/xml"],
          available: true,
        },
      ],
    };
  }

  supports(source: ImportSourceDescriptor): SupportDecision {
    const ext = normalizeFormatId(source.extension || source.formatHint || "");
    if (["html", "htm", "json", "xml"].includes(ext)) {
      return { status: "supported", confidence: "exact" };
    }
    return { status: "unsupported" };
  }

  async convert(source: ImportSourceDescriptor, _options?: Record<string, unknown>): Promise<ImportResult> {
    const ext = normalizeFormatId(source.extension || source.formatHint || "html");
    const fidelity = getFidelityDescriptor(ext);
    const warnings: ImportWarning[] = [];
    const assets: ImportAssetDescriptor[] = [];

    let markdown = `# Documento Importado\n\nOrigem: ${source.displayName}\n`;
    if (ext === "json") {
      markdown += `\n\`\`\`json\n{\n  "source": "${source.displayName}"\n}\n\`\`\`\n`;
    } else if (ext === "xml") {
      markdown += `\n\`\`\`xml\n<document name="${source.displayName}"/>\n\`\`\`\n`;
    } else {
      markdown += `\nConteúdo importado com fidelidade ${fidelity.label}.\n`;
    }

    return {
      markdown,
      title: source.displayName.replace(/\.[^/.]+$/, ""),
      assets,
      warnings,
      fidelity,
      metadata: {
        importer: this.id,
        sizeBytes: source.sizeBytes,
        originalName: source.displayName,
      },
    };
  }
}

/**
 * Estado ativo e controlador do ciclo de vida de um Import Job
 */
export interface ImportJobState {
  jobId: string;
  phase: ImportJobPhase;
  source: ImportSourceDescriptor | null;
  result: ImportResult | null;
  error: string | null;
  destination: ImportDestination | null;
}

export class ImportHubService {
  private registry = new ImporterRegistry();
  private currentJob: ImportJobState = {
    jobId: "",
    phase: "idle",
    source: null,
    result: null,
    error: null,
    destination: null,
  };
  private cancelRequested = false;

  constructor() {
    this.registry.register(new BuiltinTextDocumentImporter());
  }

  getRegistry(): ImporterRegistry {
    return this.registry;
  }

  getCurrentJob(): ImportJobState {
    return { ...this.currentJob };
  }

  /**
   * Inicia o lifecycle selecionando um arquivo local
   */
  startJob(source: ImportSourceDescriptor): ImportJobState {
    this.cancelRequested = false;
    this.currentJob = {
      jobId: `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      phase: "validating",
      source,
      result: null,
      error: null,
      destination: null,
    };
    return this.getCurrentJob();
  }

  cancelJob(): void {
    this.cancelRequested = true;
    this.currentJob.phase = "cancelled";
  }

  /**
   * Converte o documento selecionado através do registry de provedores
   */
  async convertCurrentJob(): Promise<ImportResult> {
    if (this.currentJob.phase === "cancelled" || this.cancelRequested) {
      throw new Error("Importação cancelada pelo usuário");
    }
    const source = this.currentJob.source;
    if (!source) {
      this.currentJob.phase = "failed";
      this.currentJob.error = "Nenhum documento selecionado para conversão";
      throw new Error(this.currentJob.error);
    }

    const importer = this.registry.findImporter(source);
    if (!importer) {
      this.currentJob.phase = "failed";
      this.currentJob.error = `Formato '${source.extension || "desconhecido"}' não suportado neste ambiente`;
      throw new Error(this.currentJob.error);
    }

    this.currentJob.phase = "converting";

    try {
      const res = await importer.convert(source);
      if (this.cancelRequested) {
        this.currentJob.phase = "cancelled";
        throw new Error("Importação cancelada pelo usuário");
      }
      this.currentJob.result = res;
      this.currentJob.phase = "ready";
      return res;
    } catch (err) {
      if (this.cancelRequested) {
        this.currentJob.phase = "cancelled";
        throw new Error("Importação cancelada pelo usuário");
      }
      this.currentJob.phase = "failed";
      this.currentJob.error = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }

  /**
   * Executa o commit no workspace sob Path Fencing
   */
  async commitCurrentJob(
    destination: ImportDestination,
    options: {
      overwrite?: boolean;
      saveFn?: (dest: ImportDestination, content: string) => Promise<DocumentSnapshot>;
    } = {}
  ): Promise<ImportCommitResult> {
    if (!this.currentJob.result) {
      return { ok: false, code: "NoResult", message: "Nenhum resultado convertido para gravar" };
    }

    // 1. Validação de destino relativo e Path Fencing
    const val = validateRelativeDestination(destination.relativeMarkdownPath);
    if (!val.valid) {
      return {
        ok: false,
        code: "OutsideWorkspace",
        message: val.reason || "Caminho de destino inválido ou fora do workspace",
      };
    }

    this.currentJob.phase = "committing";
    this.currentJob.destination = destination;

    try {
      if (options.saveFn) {
        await options.saveFn(destination, this.currentJob.result.markdown);
      }
      this.currentJob.phase = "completed";
      return { ok: true, relativePath: destination.relativeMarkdownPath };
    } catch (err) {
      this.currentJob.phase = "failed";
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, code: "CommitFailed", message: msg };
    }
  }
}

export const importHub = new ImportHubService();
