/**
 * 053-E — Testes do Spike de Workspace Filesystem Reconciliation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  WorkspaceFsReconciler,
  type IReconcilerDocumentHost,
  type ReconciledDocEntry,
  type ReconciledDocStatus,
} from "../../src/services/runtime/workspaceFsReconciler";

describe("053-E: Workspace Filesystem Reconciler", () => {
  const workspaceId = "ws-test-1";
  let openDocs: ReconciledDocEntry[];
  let host: IReconcilerDocumentHost;

  beforeEach(() => {
    openDocs = [
      {
        documentId: "doc-1",
        relativePath: "notes/daily.md",
        isDirty: false,
        status: "clean",
      },
      {
        documentId: "doc-2",
        relativePath: "notes/project.md",
        isDirty: true,
        status: "modified",
      },
      {
        documentId: "doc-3",
        relativePath: "docs/arch/overview.md",
        isDirty: false,
        status: "clean",
      },
      {
        documentId: "doc-4",
        relativePath: "docs/arch/diagrams.md",
        isDirty: true,
        status: "modified",
      },
    ];

    host = {
      getOpenDocuments: () => openDocs,
      updateDocumentPath: vi.fn((docId: string, newPath: string) => {
        const d = openDocs.find((x) => x.documentId === docId);
        if (d) d.relativePath = newPath;
      }),
      setDocumentStatus: vi.fn((docId: string, newStatus: ReconciledDocStatus) => {
        const d = openDocs.find((x) => x.documentId === docId);
        if (d) d.status = newStatus;
      }),
      reloadCleanDocument: vi.fn(async () => {}),
    };
  });

  it("normaliza caminhos Linux e Windows com precisão", () => {
    const reconciler = new WorkspaceFsReconciler(workspaceId, host, 10);
    expect(reconciler.normalizePath("notes\\daily.md")).toBe("notes/daily.md");
    expect(reconciler.normalizePath("./notes/daily.md/")).toBe("notes/daily.md");
    expect(reconciler.normalizePath("notes//sub///doc.md")).toBe("notes/sub/doc.md");
    reconciler.destroy();
  });

  it("ignora eventos de outros workspaces", () => {
    const reconciler = new WorkspaceFsReconciler(workspaceId, host, 10);
    reconciler.onEvent({
      workspaceId: "other-workspace",
      type: "modified",
      relativePath: "notes/daily.md",
    });
    reconciler.flushBatch();

    expect(host.setDocumentStatus).not.toHaveBeenCalled();
    expect(host.reloadCleanDocument).not.toHaveBeenCalled();
    reconciler.destroy();
  });

  describe("Renomeação de arquivos e diretórios", () => {
    it("renomeação de arquivo único atualiza o relativePath do documento", () => {
      const reconciler = new WorkspaceFsReconciler(workspaceId, host, 10);
      reconciler.onEvent({
        workspaceId,
        type: "renamed",
        from: "notes/daily.md",
        relativePath: "notes/journal.md",
      });
      reconciler.flushBatch();

      expect(host.updateDocumentPath).toHaveBeenCalledWith("doc-1", "notes/journal.md");
      expect(openDocs.find((d) => d.documentId === "doc-1")?.relativePath).toBe("notes/journal.md");
      reconciler.destroy();
    });

    it("renomeação de diretório atualiza todos os documentos abertos abaixo dele", () => {
      const reconciler = new WorkspaceFsReconciler(workspaceId, host, 10);
      reconciler.onEvent({
        workspaceId,
        type: "renamed",
        from: "docs/arch",
        relativePath: "architecture/specs",
      });
      reconciler.flushBatch();

      expect(host.updateDocumentPath).toHaveBeenCalledWith("doc-3", "architecture/specs/overview.md");
      expect(host.updateDocumentPath).toHaveBeenCalledWith("doc-4", "architecture/specs/diagrams.md");
      reconciler.destroy();
    });
  });

  describe("Exclusão externa (removed / missing)", () => {
    it("exclusão externa de documento clean marca status como missing", () => {
      const reconciler = new WorkspaceFsReconciler(workspaceId, host, 10);
      reconciler.onEvent({
        workspaceId,
        type: "removed",
        relativePath: "notes/daily.md",
      });
      reconciler.flushBatch();

      expect(host.setDocumentStatus).toHaveBeenCalledWith("doc-1", "missing");
      reconciler.destroy();
    });

    it("exclusão externa de documento dirty NUNCA descarta o buffer e marca status missing", () => {
      const reconciler = new WorkspaceFsReconciler(workspaceId, host, 10);
      reconciler.onEvent({
        workspaceId,
        type: "removed",
        relativePath: "notes/project.md",
      });
      reconciler.flushBatch();

      expect(host.setDocumentStatus).toHaveBeenCalledWith("doc-2", "missing");
      const doc2 = openDocs.find((d) => d.documentId === "doc-2");
      // PROVA R3: O buffer permanece dirty e acessível para o usuário salvar como novo
      expect(doc2?.isDirty).toBe(true);
      expect(doc2?.status).toBe("missing");
      reconciler.destroy();
    });

    it("remoção de pasta pai marca todos os arquivos filhos como missing", () => {
      const reconciler = new WorkspaceFsReconciler(workspaceId, host, 10);
      reconciler.onEvent({
        workspaceId,
        type: "removed",
        relativePath: "docs/arch",
      });
      reconciler.flushBatch();

      expect(host.setDocumentStatus).toHaveBeenCalledWith("doc-3", "missing");
      expect(host.setDocumentStatus).toHaveBeenCalledWith("doc-4", "missing");
      reconciler.destroy();
    });
  });

  describe("Modificação externa (modified / conflict)", () => {
    it("modificação externa em documento clean dispara reload", () => {
      const reconciler = new WorkspaceFsReconciler(workspaceId, host, 10);
      reconciler.onEvent({
        workspaceId,
        type: "modified",
        relativePath: "notes/daily.md",
      });
      reconciler.flushBatch();

      expect(host.reloadCleanDocument).toHaveBeenCalledWith("doc-1");
      expect(host.setDocumentStatus).not.toHaveBeenCalledWith("doc-1", "conflicted");
      reconciler.destroy();
    });

    it("modificação externa em documento dirty transiciona para conflicted", () => {
      const reconciler = new WorkspaceFsReconciler(workspaceId, host, 10);
      reconciler.onEvent({
        workspaceId,
        type: "modified",
        relativePath: "notes/project.md",
      });
      reconciler.flushBatch();

      expect(host.setDocumentStatus).toHaveBeenCalledWith("doc-2", "conflicted");
      reconciler.destroy();
    });
  });

  describe("Absorção de rajada de eventos (burst coalescing)", () => {
    it("coalesce rajada de eventos em lote único", async () => {
      let batchCount = 0;
      let totalProcessedEvents = 0;

      const reconciler = new WorkspaceFsReconciler(
        workspaceId,
        host,
        30,
        (events) => {
          batchCount += 1;
          totalProcessedEvents += events.length;
        }
      );

      // Dispara 20 eventos rápidos simulando git checkout
      for (let i = 0; i < 20; i++) {
        reconciler.onEvent({
          workspaceId,
          type: "modified",
          relativePath: `notes/file-${i}.md`,
        });
      }

      // Aguarda janela de debounce do lote
      await new Promise((r) => setTimeout(r, 60));

      expect(batchCount).toBe(1);
      expect(totalProcessedEvents).toBe(20);
      reconciler.destroy();
    });
  });
});
