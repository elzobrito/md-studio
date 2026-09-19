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

/** Same sanitized HTML as preview, then atomic write via Rust `export_html`. */
export async function exportActiveDocumentHtml(
  markdown: string,
  defaultName: string = "export.html",
): Promise<ExportHtmlResult> {
  const html = await exportHtmlDocument(markdown);
  const destination = await pickSaveHtmlFile(defaultName);
  if (!destination) return { ok: false, cancelled: true };

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
    if (!isTauriRuntime()) {
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = defaultName;
      a.click();
      URL.revokeObjectURL(url);
      return { ok: true, path: defaultName };
    }
    return { ok: false, error: msg };
  }
}
