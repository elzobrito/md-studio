/**
 * markitdownAdapter.ts - Adapter local do MarkItDown para o Import Hub
 * Conforme especificação 043-markitdown-adapter.md e 045-import-fidelity-classes.md
 *
 * Regras:
 * - 100% offline, zero chamadas de rede, zero cloud
 * - Somente arquivos locais (convert_local)
 * - Allowlist positiva estrita de formatos
 * - Sem plugins externos, sem OCR em nuvem, sem LLM
 */

import type {
  ImportAssetDescriptor,
  ImportFormatCapability,
  ImportResult,
  ImportSourceDescriptor,
  ImportWarning,
  ImporterCapability,
  SupportDecision,
} from "../contracts/types";
import { type DocumentImporter, importHub } from "./importHub";
import { getFidelityDescriptor, normalizeFormatId } from "./importFidelity";
import { isTauriRuntime } from "../lib/ipc/client";

export const MARKITDOWN_ALLOWED_FORMATS: readonly string[] = [
  "docx",
  "html",
  "htm",
  "epub",
  "pptx",
  "xls",
  "xlsx",
  "csv",
  "json",
  "xml",
  "pdf",
] as const;

export class MarkItDownDocumentImporter implements DocumentImporter {
  readonly id = "markitdown";

  getCapability(): ImporterCapability {
    const formats: ImportFormatCapability[] = MARKITDOWN_ALLOWED_FORMATS.map((fmt) => ({
      formatId: fmt,
      extensions: [fmt],
      available: true,
    }));

    return {
      id: this.id,
      available: true,
      runtime: "external-local",
      formats,
    };
  }

  supports(source: ImportSourceDescriptor): SupportDecision {
    const ext = normalizeFormatId(source.extension || source.formatHint || "");
    if (MARKITDOWN_ALLOWED_FORMATS.includes(ext)) {
      return { status: "supported", confidence: "exact" };
    }
    return { status: "unsupported" };
  }

  async convert(
    source: ImportSourceDescriptor,
    _options?: Record<string, unknown>
  ): Promise<ImportResult> {
    const ext = normalizeFormatId(source.extension || source.formatHint || "");
    if (!MARKITDOWN_ALLOWED_FORMATS.includes(ext)) {
      throw new Error(`Formato '${ext}' não suportado pelo MarkItDown adapter`);
    }

    // Validação de segurança: rejeitar URLs e protocolos remotos
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(source.sourceId)) {
      throw new Error("Fontes remotas ou URLs são proibidas pelo contrato local-first");
    }

    const fidelity = getFidelityDescriptor(ext, this.id);
    const warnings: ImportWarning[] = [];
    const assets: ImportAssetDescriptor[] = [];
    let markdown = "";
    let title: string | undefined = source.displayName.replace(/\.[^/.]+$/, "");

    if (isTauriRuntime()) {
      const { invoke } = await import("@tauri-apps/api/core");
      const resp = (await invoke("import_convert_source", {
        sourcePath: source.sourceId,
        formatHint: ext,
      })) as {
        ok: boolean;
        markdown?: string;
        title?: string | null;
        warnings?: ImportWarning[];
        code?: string;
        message?: string;
      };

      if (!resp.ok) {
        throw new Error(resp.message || "Falha na conversão com MarkItDown local");
      }

      markdown = resp.markdown || "";
      if (resp.title) {
        title = resp.title;
      }
      if (resp.warnings && Array.isArray(resp.warnings)) {
        warnings.push(...resp.warnings);
      }
    } else {
      // Fallback para ambiente de teste / navegador
      markdown = `# ${title}\n\nDocumento convertido localmente (${ext.toUpperCase()}) via MarkItDown.\n\nFidelidade estrutural esperada: ${fidelity.label}.\n`;
    }

    if (!markdown.trim()) {
      warnings.push({
        code: "EMPTY_OUTPUT",
        message: "O documento convertido não produziu conteúdo de texto",
        scope: "document",
      });
    }

    return {
      markdown,
      title,
      assets,
      warnings,
      fidelity,
      metadata: {
        importer: this.id,
        sizeBytes: source.sizeBytes,
        originalName: source.displayName,
        format: ext,
      },
    };
  }
}

// Registro automático do MarkItDown adapter no Import Hub
export const markitdownImporter = new MarkItDownDocumentImporter();
importHub.getRegistry().register(markitdownImporter);
