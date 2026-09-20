import { exportHtmlDocument } from "./export";
import {
  confirmOverwrite,
  ipc,
  isTauriRuntime,
  pickSaveHtmlFile,
} from "../lib/ipc/client";

export interface ExportHtmlResult {
  ok: boolean;
  path?: string;
  cancelled?: boolean;
  error?: string;
}

function downloadHtml(html: string, fileName: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Same sanitized HTML as preview, then atomic write via Rust `export_html`. */
export async function exportActiveDocumentHtml(
  markdown: string,
  defaultName: string = "export.html",
): Promise<ExportHtmlResult> {
  const html = await exportHtmlDocument(markdown);
  const destination = await pickSaveHtmlFile(defaultName);
  if (!destination) return { ok: false, cancelled: true };

  if (!isTauriRuntime()) {
    const fileName = destination.split(/[\\/]/).pop() || defaultName;
    downloadHtml(html, fileName);
    return { ok: true, path: fileName };
  }

  try {
    await ipc.exportHtml(html, destination, false);
    return { ok: true, path: destination };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ExportTargetExists") || msg.includes("exists")) {
      const ok = await confirmOverwrite(destination);
      if (!ok) return { ok: false, cancelled: true };
      try {
        await ipc.exportHtml(html, destination, true);
        return { ok: true, path: destination };
      } catch (e2) {
        return { ok: false, error: e2 instanceof Error ? e2.message : String(e2) };
      }
    }
    return { ok: false, error: msg };
  }
}
