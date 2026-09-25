import { beforeEach, describe, expect, it, vi } from "vitest";

const tauriInvoke = vi.fn();
const saveDialog = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: tauriInvoke,
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: saveDialog,
}));

import { ipc, pickSaveEpubFile } from "../../src/lib/ipc/client";

describe("IPC export_epub", () => {
  beforeEach(() => {
    tauriInvoke.mockReset();
    saveDialog.mockReset();
    delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it("envia o payload camelCase no envelope req", async () => {
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    tauriInvoke.mockResolvedValue({
      outputPath: "/tmp/livro.epub",
      imageCount: 1,
      mermaidCount: 0,
      mermaidFallbackCount: 0,
      warnings: [],
    });
    const payload = {
      metadata: { title: "Arquitetura", lang: "pt-BR", date: "2026-09-24" },
      bodyHtml: "<h1>Intro</h1>",
      mermaidSlots: [],
      imageRefs: ["/tmp/figura.png"],
    };

    await ipc.exportEpub(payload, "/tmp/livro.epub", false, "ws-1");

    expect(tauriInvoke).toHaveBeenCalledWith("export_epub", {
      req: {
        workspaceId: "ws-1",
        destination: "/tmp/livro.epub",
        overwrite: false,
        payload,
      },
    });
  });

  it("devolve null quando o diálogo de destino é cancelado", async () => {
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    saveDialog.mockResolvedValue(null);

    await expect(pickSaveEpubFile("livro.epub")).resolves.toBeNull();
    expect(tauriInvoke).not.toHaveBeenCalled();
  });
});
