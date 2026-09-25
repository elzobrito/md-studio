import { processEpubMarkdown } from "../export/epubProcessor";
import { captureMermaidSvgsFromDom, type MermaidCaptureSummary } from "../export/mermaidCapture";
import type { EpubExportPayload, EpubExportResult, EpubProcessOptions } from "../export/epubTypes";
import {
  confirmOverwrite,
  ipc,
  isTauriRuntime,
  pickSaveEpubFile,
} from "../lib/ipc/client";

export interface ExportEpubOptions {
  markdown: string;
  defaultName?: string;
  workspaceId?: string;
  options?: EpubProcessOptions;
  destinationOverride?: string;
  ignoreMermaidPrompt?: boolean;
}

export interface ExportEpubOutcome {
  ok: boolean;
  path?: string;
  cancelled?: boolean;
  error?: string;
  result?: EpubExportResult;
  mermaidSummary?: MermaidCaptureSummary;
}

export async function exportActiveDocumentEpub({
  markdown,
  defaultName = "documento.epub",
  workspaceId,
  options,
  destinationOverride,
  ignoreMermaidPrompt = false,
}: ExportEpubOptions): Promise<ExportEpubOutcome> {
  if (!isTauriRuntime()) {
    return {
      ok: false,
      error: "A exportação EPUB 3 está disponível apenas no aplicativo Desktop (Tauri).",
    };
  }

  const payload: EpubExportPayload = await processEpubMarkdown(markdown, options);

  // Capture SVGs from DOM for any Mermaid diagrams
  let mermaidSummary: MermaidCaptureSummary | undefined;
  if (payload.mermaidSlots.length > 0 && typeof document !== "undefined") {
    mermaidSummary = captureMermaidSvgsFromDom(payload.mermaidSlots, document);
  }

  const destination = destinationOverride || (await pickSaveEpubFile(defaultName));
  if (!destination) {
    return { ok: false, cancelled: true, mermaidSummary };
  }

  try {
    const res = await ipc.exportEpub(payload, destination, false, workspaceId);
    return { ok: true, path: destination, result: res, mermaidSummary };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ExportTargetExists") || msg.includes("exists")) {
      const ok = await confirmOverwrite(destination);
      if (!ok) return { ok: false, cancelled: true, mermaidSummary };
      try {
        const res = await ipc.exportEpub(payload, destination, true, workspaceId);
        return { ok: true, path: destination, result: res, mermaidSummary };
      } catch (e2) {
        return { ok: false, error: e2 instanceof Error ? e2.message : String(e2), mermaidSummary };
      }
    }
    return { ok: false, error: msg, mermaidSummary };
  }
}
