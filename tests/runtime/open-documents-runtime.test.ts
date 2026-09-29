/**
 * 053-F — Testes do Multi-document Runtime (DocumentRuntime + OpenDocumentsRuntime)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenDocumentsRuntime } from "../../src/services/runtime/openDocumentsRuntime";
import { MemoryStorageAdapter, UntitledStore } from "../../src/services/runtime/untitledStore";
import type { SaveTicket, SaveResult } from "../../src/services/runtime/saveQueue";

describe("053-F: OpenDocumentsRuntime Multi-document Core", () => {
  let runtime: OpenDocumentsRuntime;
  let mockWriteProvider: (ticket: SaveTicket) => Promise<SaveResult>;
  let writes: SaveTicket[];

  beforeEach(() => {
    writes = [];
    mockWriteProvider = vi.fn(async (ticket: SaveTicket) => {
      writes.push(ticket);
      return { ok: true, newDiskHash: `hash-for-${ticket.contentIdentity.slice(0, 8)}` };
    });

    const storage = new MemoryStorageAdapter();
    const untitledStore = new UntitledStore(storage);

    runtime = new OpenDocumentsRuntime({
      workspaceId: "ws-1",
      workspaceRoot: "/workspace",
      writeProvider: mockWriteProvider,
      untitledStore,
    });
  });

  it("abre múltiplos documentos isolando editorState e saveQueue por documentId", () => {
    const resA = runtime.openDocument("docs/a.md", "# Doc A", "hash-a");
    const resB = runtime.openDocument("docs/b.md", "# Doc B", "hash-b");

    expect(resA.newlyOpened).toBe(true);
    expect(resB.newlyOpened).toBe(true);
    expect(resA.documentId).not.toBe(resB.documentId);

    const openDocs = runtime.getOpenDocuments();
    expect(openDocs).toHaveLength(2);
    expect(runtime.getActiveDocumentId()).toBe(resB.documentId);

    const docA = runtime.getDocument(resA.documentId)!;
    const docB = runtime.getDocument(resB.documentId)!;

    expect(docA.getContent()).toBe("# Doc A");
    expect(docB.getContent()).toBe("# Doc B");

    // Edição em A não afeta B
    docA.editContent("# Doc A Modificado");
    expect(docA.isDirty()).toBe(true);
    expect(docB.isDirty()).toBe(false);
  });

  it("Path Index deduplica abertura de arquivos para o mesmo path físico", () => {
    const res1 = runtime.openDocument("notes/daily.md", "Content 1", "hash-1");
    expect(res1.newlyOpened).toBe(true);

    // Tenta abrir o mesmo caminho novamente (com possíveis variações de barra)
    const res2 = runtime.openDocument("./notes/daily.md", "Content 1", "hash-1");
    expect(res2.newlyOpened).toBe(false);
    expect(res2.documentId).toBe(res1.documentId);

    // Contagem de abas permanece em exatamente 1
    expect(runtime.getOpenDocuments()).toHaveLength(1);
    expect(runtime.getActiveDocumentId()).toBe(res1.documentId);
  });

  it("preserva cursor, seleção e scroll ao alternar entre abas", () => {
    const resA = runtime.openDocument("a.md", "Linha 1\nLinha 2\nLinha 3", "h-a");
    const resB = runtime.openDocument("b.md", "Outro arquivo", "h-b");

    const docA = runtime.getDocument(resA.documentId)!;
    docA.setSelection(3, 7);
    docA.setScroll(120, 0);

    // Troca para B
    runtime.switchActiveDocument(resB.documentId);
    expect(runtime.getActiveDocument()?.documentId).toBe(resB.documentId);

    // Retorna para A
    runtime.switchActiveDocument(resA.documentId);
    const restoredA = runtime.getActiveDocument()!;
    expect(restoredA.documentId).toBe(resA.documentId);
    expect(restoredA.selection).toEqual({ anchor: 3, head: 7 });
    expect(restoredA.scrollPosition).toEqual({ top: 120, left: 0 });
  });

  it("Undo-to-clean funciona de forma independente no runtime multi-documento", () => {
    const resA = runtime.openDocument("a.md", "Original A", "h-a");
    const docA = runtime.getDocument(resA.documentId)!;

    docA.editContent("Altered A");
    expect(docA.isDirty()).toBe(true);

    // Undo restaura clean
    docA.stepHistory("Original A");
    expect(docA.isDirty()).toBe(false);
    expect(docA.getStatus()).toBe("clean");
  });

  it("Close guard: impede fechamento acidental de documento dirty sem force", () => {
    const res = runtime.openDocument("a.md", "Original", "h-a");
    const doc = runtime.getDocument(res.documentId)!;

    doc.editContent("Modificado sem salvar");

    // Tentativa de fechar sem forçar
    const closeAttempt = runtime.closeDocument(res.documentId, false);
    expect(closeAttempt.closed).toBe(false);
    expect(closeAttempt.requiresConfirmation).toBe(true);
    expect(closeAttempt.isDirty).toBe(true);
    expect(runtime.getOpenDocuments()).toHaveLength(1);

    // Fechamento forçado (ou pós-confirmação)
    const forcedClose = runtime.closeDocument(res.documentId, true);
    expect(forcedClose.closed).toBe(true);
    expect(runtime.getOpenDocuments()).toHaveLength(0);
    expect(runtime.getActiveDocumentId()).toBeNull();
  });

  it("Untitled lifecycle e promoção via Save As", async () => {
    const untitledId = runtime.createUntitled("Conteúdo de rascunho");
    const doc = runtime.getDocument(untitledId)!;

    expect(doc.kind).toBe("untitled");
    expect(doc.title).toBe("Sem título 1");
    expect(doc.relativePath).toBeNull();

    // Rascunho está no UntitledStore privado
    expect(runtime.untitledStore.listRecoverableSnapshots()).toHaveLength(1);

    // Usuário executa Save As formal
    const saveAsResult = await runtime.saveAs(untitledId, "notes/minha-nota.md", "/workspace/notes/minha-nota.md");
    expect(saveAsResult?.ok).toBe(true);

    expect(doc.kind as string).toBe("persisted");
    expect(doc.relativePath).toBe("notes/minha-nota.md");
    expect(doc.isDirty()).toBe(false);

    // O rascunho privado foi limpo
    expect(runtime.untitledStore.listRecoverableSnapshots()).toHaveLength(0);
    // E o path index agora aponta para o novo arquivo
    expect(runtime.getDocumentByPath("notes/minha-nota.md")?.documentId).toBe(untitledId);
  });

  it("Salva documento ativo através do SaveQueue", async () => {
    const res = runtime.openDocument("doc.md", "Texto Inicial", "hash-0");
    const doc = runtime.getDocument(res.documentId)!;

    doc.editContent("Texto Alterado");
    expect(doc.isDirty()).toBe(true);

    const saveResult = await runtime.saveActiveDocument();
    expect(saveResult?.ok).toBe(true);
    expect(doc.isDirty()).toBe(false);
    expect(writes).toHaveLength(1);
    expect(writes[0].content).toBe("Texto Alterado");
  });
});
