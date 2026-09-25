import { describe, expect, it, vi, beforeEach } from "vitest";
import { exportActiveDocumentEpub } from "../../src/services/exportEpub";
import * as ipcClient from "../../src/lib/ipc/client";

vi.mock("../../src/lib/ipc/client", async () => {
  const actual = await vi.importActual<typeof ipcClient>("../../src/lib/ipc/client");
  return {
    ...actual,
    isTauriRuntime: vi.fn(),
    pickSaveEpubFile: vi.fn(),
    confirmOverwrite: vi.fn(),
    ipc: {
      ...actual.ipc,
      exportEpub: vi.fn(),
    },
  };
});

describe("exportActiveDocumentEpub", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an informative error when executed outside Tauri runtime", async () => {
    vi.mocked(ipcClient.isTauriRuntime).mockReturnValue(false);

    const outcome = await exportActiveDocumentEpub({
      markdown: "# Test Document",
    });

    expect(outcome.ok).toBe(false);
    expect(outcome.error).toContain("Tauri");
  });

  it("handles user cancellation during destination picker", async () => {
    vi.mocked(ipcClient.isTauriRuntime).mockReturnValue(true);
    vi.mocked(ipcClient.pickSaveEpubFile).mockResolvedValue(null);

    const outcome = await exportActiveDocumentEpub({
      markdown: "# Test Document",
    });

    expect(outcome.ok).toBe(false);
    expect(outcome.cancelled).toBe(true);
    expect(ipcClient.ipc.exportEpub).not.toHaveBeenCalled();
  });

  it("successfully invokes ipc.exportEpub and returns result", async () => {
    vi.mocked(ipcClient.isTauriRuntime).mockReturnValue(true);
    vi.mocked(ipcClient.pickSaveEpubFile).mockResolvedValue("/home/user/livro.epub");
    vi.mocked(ipcClient.ipc.exportEpub).mockResolvedValue({
      outputPath: "/home/user/livro.epub",
      imageCount: 0,
      mermaidCount: 0,
      mermaidFallbackCount: 0,
      warnings: [],
    });

    const outcome = await exportActiveDocumentEpub({
      markdown: "# Livro de Teste\n\nConteúdo explicativo.",
      defaultName: "livro.epub",
      workspaceId: "ws-123",
    });

    expect(outcome.ok).toBe(true);
    expect(outcome.path).toBe("/home/user/livro.epub");
    expect(outcome.result?.outputPath).toBe("/home/user/livro.epub");
    expect(ipcClient.ipc.exportEpub).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ title: "Livro de Teste" }),
      }),
      "/home/user/livro.epub",
      false,
      "ws-123"
    );
  });

  it("prompts for confirmation and retries with overwrite=true when target exists", async () => {
    vi.mocked(ipcClient.isTauriRuntime).mockReturnValue(true);
    vi.mocked(ipcClient.pickSaveEpubFile).mockResolvedValue("/home/user/livro.epub");
    vi.mocked(ipcClient.confirmOverwrite).mockResolvedValue(true);

    vi.mocked(ipcClient.ipc.exportEpub)
      .mockRejectedValueOnce(new Error("ExportTargetExists"))
      .mockResolvedValueOnce({
        outputPath: "/home/user/livro.epub",
        imageCount: 0,
        mermaidCount: 0,
        mermaidFallbackCount: 0,
        warnings: [],
      });

    const outcome = await exportActiveDocumentEpub({
      markdown: "# Livro Existente",
      destinationOverride: "/home/user/livro.epub",
    });

    expect(ipcClient.confirmOverwrite).toHaveBeenCalledWith("/home/user/livro.epub");
    expect(outcome.ok).toBe(true);
    expect(ipcClient.ipc.exportEpub).toHaveBeenCalledTimes(2);
    expect(ipcClient.ipc.exportEpub).toHaveBeenLastCalledWith(
      expect.anything(),
      "/home/user/livro.epub",
      true,
      undefined
    );
  });
});
