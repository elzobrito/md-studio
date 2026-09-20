import { beforeEach, describe, expect, it, vi } from "vitest";

const tauriInvoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: tauriInvoke,
}));

import * as ipcClient from "../../src/lib/ipc/client";
import { exportActiveDocumentHtml } from "../../src/services/exportHtml";

describe("Exportar HTML — contrato e fluxo completo", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    tauriInvoke.mockReset();
    delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it("envia o request no envelope req exigido pelo comando Tauri", async () => {
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    tauriInvoke.mockResolvedValue(undefined);

    await ipcClient.ipc.exportHtml("<p>ok</p>", "/tmp/ok.html", false);

    expect(tauriInvoke).toHaveBeenCalledWith("export_html", {
      req: {
        html: "<p>ok</p>",
        destination: "/tmp/ok.html",
        overwrite: false,
      },
    });
  });

  it("trata cancelamento sem tentar gravar", async () => {
    vi.spyOn(ipcClient, "pickSaveHtmlFile").mockResolvedValue(null);
    const write = vi.spyOn(ipcClient.ipc, "exportHtml");

    await expect(exportActiveDocumentHtml("# Título")).resolves.toEqual({
      ok: false,
      cancelled: true,
    });
    expect(write).not.toHaveBeenCalled();
  });

  it("grava pelo IPC no Tauri", async () => {
    vi.spyOn(ipcClient, "isTauriRuntime").mockReturnValue(true);
    vi.spyOn(ipcClient, "pickSaveHtmlFile").mockResolvedValue("/tmp/documento.html");
    const write = vi.spyOn(ipcClient.ipc, "exportHtml").mockResolvedValue(undefined);

    const result = await exportActiveDocumentHtml("# Documento", "documento.html");

    expect(result).toEqual({ ok: true, path: "/tmp/documento.html" });
    expect(write).toHaveBeenCalledWith(expect.stringContaining("Documento"), "/tmp/documento.html", false);
  });

  it("confirma e repete a gravação quando o destino existe", async () => {
    vi.spyOn(ipcClient, "isTauriRuntime").mockReturnValue(true);
    vi.spyOn(ipcClient, "pickSaveHtmlFile").mockResolvedValue("/tmp/existe.html");
    vi.spyOn(ipcClient, "confirmOverwrite").mockResolvedValue(true);
    const write = vi
      .spyOn(ipcClient.ipc, "exportHtml")
      .mockRejectedValueOnce(new Error("ExportTargetExists"))
      .mockResolvedValueOnce(undefined);

    await expect(exportActiveDocumentHtml("texto")).resolves.toEqual({
      ok: true,
      path: "/tmp/existe.html",
    });
    expect(write).toHaveBeenLastCalledWith(expect.any(String), "/tmp/existe.html", true);
  });

  it("propaga falha real para a interface", async () => {
    vi.spyOn(ipcClient, "isTauriRuntime").mockReturnValue(true);
    vi.spyOn(ipcClient, "pickSaveHtmlFile").mockResolvedValue("/tmp/falha.html");
    vi.spyOn(ipcClient.ipc, "exportHtml").mockRejectedValue(new Error("disco cheio"));

    await expect(exportActiveDocumentHtml("texto")).resolves.toEqual({
      ok: false,
      error: "disco cheio",
    });
  });

  it("faz download real no navegador sem chamar IPC", async () => {
    vi.spyOn(ipcClient, "isTauriRuntime").mockReturnValue(false);
    vi.spyOn(ipcClient, "pickSaveHtmlFile").mockResolvedValue("pagina.html");
    const write = vi.spyOn(ipcClient.ipc, "exportHtml");
    const createUrl = vi.fn(() => "blob:export");
    const revokeUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeUrl,
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await expect(exportActiveDocumentHtml("# Página", "pagina.html")).resolves.toEqual({
      ok: true,
      path: "pagina.html",
    });
    expect(write).not.toHaveBeenCalled();
    expect(createUrl).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeUrl).toHaveBeenCalledWith("blob:export");
  });
});
