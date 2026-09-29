/**
 * 053-C — Testes do Spike do Untitled Recovery Store
 */

import { describe, it, expect, vi } from "vitest";
import {
  UntitledStore,
  MemoryStorageAdapter,
} from "../../src/services/runtime/untitledStore";
import { computeContentIdentitySync } from "../../src/services/runtime/contentIdentity";

describe("053-C: Untitled Recovery Store Lifecycle", () => {
  it("cria documentos untitled com identidades estáveis sequenciais", () => {
    const storage = new MemoryStorageAdapter();
    const store = new UntitledStore(storage);

    const doc1 = store.createUntitled();
    const doc2 = store.createUntitled("# Template Note", "tmpl-meeting");

    expect(doc1.id).toBe("untitled-1");
    expect(doc1.title).toBe("Sem título 1");
    expect(doc1.content).toBe("");
    expect(doc1.contentIdentity).toBe(computeContentIdentitySync(""));

    expect(doc2.id).toBe("untitled-2");
    expect(doc2.title).toBe("Sem título 2");
    expect(doc2.content).toBe("# Template Note");
    expect(doc2.templateId).toBe("tmpl-meeting");
    expect(doc2.contentIdentity).toBe(computeContentIdentitySync("# Template Note"));
  });

  it("atualiza conteúdo, contentIdentity e timestamps corretamente", () => {
    const storage = new MemoryStorageAdapter();
    const store = new UntitledStore(storage);

    const doc = store.createUntitled();
    const originalTime = doc.updatedAt;

    const updated = store.updateContent(doc.id, "## Novo conteúdo digitado");
    expect(updated).not.toBeNull();
    expect(updated!.content).toBe("## Novo conteúdo digitado");
    expect(updated!.contentIdentity).toBe(computeContentIdentitySync("## Novo conteúdo digitado"));
    expect(updated!.updatedAt).toBeGreaterThanOrEqual(originalTime);

    // O storage privado foi sincronizado com o snapshot atualizado
    const rawSnapshot = storage.getItem(`mdstudio:untitled:recovery:${doc.id}`);
    expect(rawSnapshot).not.toBeNull();
    expect(JSON.parse(rawSnapshot!).content).toBe("## Novo conteúdo digitado");
  });

  it("Crash recovery: simulação de reinicialização restaura rascunhos intactos", () => {
    const sharedStorage = new MemoryStorageAdapter();

    // Sessão 1 (antes do crash/fechamento)
    {
      const store1 = new UntitledStore(sharedStorage);
      const doc = store1.createUntitled("# Rascunho Crítico\n\nTexto que precisa sobreviver");
      store1.updateContent(doc.id, "# Rascunho Crítico\n\nTexto que precisa sobreviver com mais notas.");
    }

    // Sessão 2 (após reinicialização)
    {
      const store2 = new UntitledStore(sharedStorage);
      const recoverable = store2.listRecoverableSnapshots();

      expect(recoverable).toHaveLength(1);
      expect(recoverable[0].id).toBe("untitled-1");
      expect(recoverable[0].title).toBe("Sem título 1");
      expect(recoverable[0].content).toContain("Texto que precisa sobreviver com mais notas.");

      // Recupera o documento para o store ativo
      const restored = store2.recoverSnapshot(recoverable[0]);
      expect(restored.id).toBe("untitled-1");
      expect(store2.getDocument("untitled-1")).toEqual(restored);
    }
  });

  it("Save As: promove o documento para arquivo formal e limpa o snapshot privado", () => {
    const storage = new MemoryStorageAdapter();
    const store = new UntitledStore(storage);

    const doc = store.createUntitled("Conteúdo para salvar formalmente");
    expect(store.listRecoverableSnapshots()).toHaveLength(1);

    // Usuário seleciona o destino no Save As
    const promoteResult = store.promoteToSaved(doc.id, "/workspace/notes/nova-nota.md");
    expect(promoteResult.promoted).toBe(true);
    expect(promoteResult.targetPath).toBe("/workspace/notes/nova-nota.md");

    // Limpeza atômica comprovada: documento deixa de existir no UntitledStore e no storage privado
    expect(store.getDocument(doc.id)).toBeNull();
    expect(storage.getItem(`mdstudio:untitled:recovery:${doc.id}`)).toBeNull();
    expect(store.listRecoverableSnapshots()).toHaveLength(0);
  });

  it("Purge de retenção expira apenas rascunhos anteriores a 90 dias", () => {
    const storage = new MemoryStorageAdapter();
    const store = new UntitledStore(storage);

    const now = Date.now();
    const ninetyOneDaysMs = 91 * 24 * 60 * 60 * 1000;

    const recentDoc = store.createUntitled("Recente");
    const oldDoc = store.createUntitled("Antigo");

    // Simula data antiga no storage para o oldDoc
    const oldRecord = JSON.parse(storage.getItem(`mdstudio:untitled:recovery:${oldDoc.id}`)!);
    oldRecord.updatedAt = now - ninetyOneDaysMs;
    storage.setItem(`mdstudio:untitled:recovery:${oldDoc.id}`, JSON.stringify(oldRecord));

    const purged = store.purgeExpiredSnapshots();
    expect(purged).toBe(1);

    const remaining = store.listRecoverableSnapshots();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(recentDoc.id);
  });

  it("Tolerância a falhas: sobrevive a QuotaExceededError sem quebrar operações em memória", () => {
    const storage = new MemoryStorageAdapter();
    const store = new UntitledStore(storage);

    const doc = store.createUntitled("Texto inicial");

    // Simula esgotamento de quota de storage do navegador
    storage.simulateFailure(true);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Operação não deve lançar exceção!
    expect(() => {
      store.updateContent(doc.id, "Texto modificado sob quota excedida");
    }).not.toThrow();

    // Memória continua perfeitamente íntegra
    expect(store.getDocument(doc.id)?.content).toBe("Texto modificado sob quota excedida");
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
