/**
 * 053-B — Testes do Spike de Content Identity, Dirty State e Save Queue
 */

import { describe, it, expect, vi } from "vitest";
import {
  computeContentIdentitySync,
  computeContentIdentity,
  isContentDirty,
  OperationGenerationManager,
} from "../../src/services/runtime/contentIdentity";
import {
  DocumentSaveQueue,
  type SaveTicket,
  type SaveResult,
} from "../../src/services/runtime/saveQueue";

describe("053-B: Content Identity & Operation Generation", () => {
  it("calcula hash SHA-256 determinístico de forma síncrona e assíncrona", async () => {
    const text = "# Heading\n\nSome test markdown content.";
    const syncHash = computeContentIdentitySync(text);
    const asyncHash = await computeContentIdentity(text);

    expect(syncHash).toBe(asyncHash);
    expect(syncHash).toHaveLength(64);
    expect(syncHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("identifica corretamente equivalência e divergência de conteúdo", () => {
    const hashA = computeContentIdentitySync("Hello World");
    const hashB = computeContentIdentitySync("Hello World!");
    const hashA2 = computeContentIdentitySync("Hello World");

    expect(isContentDirty(hashA, hashA2)).toBe(false);
    expect(isContentDirty(hashA, hashB)).toBe(true);
  });

  it("OperationGenerationManager incrementa monotônicamente e detecta stale", () => {
    const gen = new OperationGenerationManager(1);
    expect(gen.generation).toBe(1);

    expect(gen.next()).toBe(2);
    expect(gen.next()).toBe(3);
    expect(gen.generation).toBe(3);

    expect(gen.isStale(1)).toBe(true);
    expect(gen.isStale(2)).toBe(true);
    expect(gen.isStale(3)).toBe(false);
    expect(gen.isStale(4)).toBe(false);
  });
});

describe("053-B: Invariante Fundamental: Undo-to-Clean e Redo-to-Dirty", () => {
  it("Undo que retorna ao texto salvo em disco restaura estado clean, mesmo com avanço de geração", () => {
    const initialText = "# Meu Documento\n\nConteúdo original persistido.";
    const initialHash = computeContentIdentitySync(initialText);

    const mockWriter = vi.fn(async () => ({ ok: true, newDiskHash: "mock-hash-1" }));
    const queue = new DocumentSaveQueue(
      "doc-1",
      "/workspace/notes/test.md",
      initialText,
      initialHash,
      mockWriter
    );

    // Estado inicial: clean
    let state = queue.getState();
    expect(state.isDirty).toBe(false);
    expect(state.status).toBe("clean");
    expect(state.generation).toBe(1);

    // 1. Edição para texto B
    const textB = "# Meu Documento\n\nConteúdo original persistido com alteração.";
    queue.edit(textB);
    state = queue.getState();
    expect(state.isDirty).toBe(true);
    expect(state.status).toBe("modified");
    expect(state.generation).toBe(2);

    // 2. Edição para texto C
    const textC = "# Meu Documento\n\nConteúdo C.";
    queue.edit(textC);
    state = queue.getState();
    expect(state.isDirty).toBe(true);
    expect(state.generation).toBe(3);

    // 3. Undo de volta para texto B
    queue.stepHistory(textB);
    state = queue.getState();
    expect(state.isDirty).toBe(true);
    expect(state.generation).toBe(4);

    // 4. Undo de volta para initialText (equivalente ao gravado em disco)
    queue.stepHistory(initialText);
    state = queue.getState();

    // PROVA OBRIGATÓRIA DA R3:
    // O documento DEVE voltar a ser clean (dirty = false), mesmo que generation seja 5!
    expect(state.isDirty).toBe(false);
    expect(state.status).toBe("clean");
    expect(state.generation).toBe(5);

    // 5. Redo para texto B
    queue.stepHistory(textB);
    state = queue.getState();
    expect(state.isDirty).toBe(true);
    expect(state.status).toBe("modified");
    expect(state.generation).toBe(6);
  });
});

describe("053-B: SaveQueue, One-Write-In-Flight e Coalescing", () => {
  it("assegura apenas um write em voo por vez e coalescência de auto-save", async () => {
    let resolveWrite1: (res: SaveResult) => void = () => {};
    const writePromise1 = new Promise<SaveResult>((resolve) => {
      resolveWrite1 = resolve;
    });

    let resolveWrite2: (res: SaveResult) => void = () => {};
    const writePromise2 = new Promise<SaveResult>((resolve) => {
      resolveWrite2 = resolve;
    });

    const calls: SaveTicket[] = [];
    const mockWriter = vi.fn((ticket: SaveTicket) => {
      calls.push(ticket);
      if (calls.length === 1) return writePromise1;
      return writePromise2;
    });

    const queue = new DocumentSaveQueue(
      "doc-1",
      "/workspace/test.md",
      "Initial",
      "hash-0",
      mockWriter
    );

    // Edição 1 e primeiro save
    queue.edit("Edit 1");
    const savePromise1 = queue.requestSave();

    let state = queue.getState();
    expect(state.status).toBe("saving");
    expect(state.hasInFlightWrite).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].content).toBe("Edit 1");

    // Edição 2 e Edição 3 enquanto save 1 ainda está in-flight
    queue.edit("Edit 2");
    void queue.requestSave();

    queue.edit("Edit 3 (Final)");
    void queue.requestSave();

    state = queue.getState();
    expect(state.hasInFlightWrite).toBe(true);
    expect(state.hasPendingWrite).toBe(true);
    // Não chamou o writer novamente enquanto o 1 está ativo!
    expect(calls).toHaveLength(1);

    // Conclui o write 1 com sucesso
    resolveWrite1({ ok: true, newDiskHash: "hash-1" });
    await savePromise1;

    // O write 2 agora foi disparado e contém o conteúdo coalescido (Edit 3)
    expect(calls).toHaveLength(2);
    expect(calls[1].content).toBe("Edit 3 (Final)");
    expect(calls[1].expectedDiskHash).toBe("hash-1"); // Encademento de expectedDiskHash

    // Conclui o write 2
    resolveWrite2({ ok: true, newDiskHash: "hash-2" });
    // Aguarda microtask queue
    await new Promise((r) => setTimeout(r, 10));

    state = queue.getState();
    expect(state.isDirty).toBe(false);
    expect(state.status).toBe("clean");
    expect(state.hasInFlightWrite).toBe(false);
    expect(state.hasPendingWrite).toBe(false);
    expect(state.persistedDiskHash).toBe("hash-2");
  });

  it("Late write acknowledgment guard: nova edição durante o save mantém o documento dirty", async () => {
    let resolveWrite: (res: SaveResult) => void = () => {};
    const writePromise = new Promise<SaveResult>((resolve) => {
      resolveWrite = resolve;
    });

    const mockWriter = vi.fn(async () => writePromise);
    const queue = new DocumentSaveQueue(
      "doc-1",
      "/workspace/test.md",
      "Content A",
      "hash-a",
      mockWriter
    );

    queue.edit("Content B");
    const savePromise = queue.requestSave();

    expect(queue.getState().status).toBe("saving");

    // O usuário continua digitando "Content C" enquanto Content B está sendo gravado
    queue.edit("Content C");
    expect(queue.getState().currentContent).toBe("Content C");

    // O backend confirma que Content B foi gravado
    resolveWrite({ ok: true, newDiskHash: "hash-b" });
    await savePromise;

    const finalState = queue.getState();
    // PROVA DO LATE WRITE GUARD:
    // O ACK do Content B gravado NÃO pode resetar o dirty, pois o buffer atual é Content C!
    expect(finalState.isDirty).toBe(true);
    expect(finalState.currentContent).toBe("Content C");
    expect(finalState.persistedContentIdentity).toBe(computeContentIdentitySync("Content B"));
    expect(finalState.persistedDiskHash).toBe("hash-b");
  });

  it("detecta conflito externo quando o expectedDiskHash falha no backend", async () => {
    const mockWriter = vi.fn(async (ticket: SaveTicket) => {
      if (ticket.expectedDiskHash !== "latest-disk-hash") {
        return { ok: false, error: "conflict" };
      }
      return { ok: true, newDiskHash: "new-hash" };
    });

    const queue = new DocumentSaveQueue(
      "doc-1",
      "/workspace/test.md",
      "Initial Content",
      "stale-disk-hash",
      mockWriter
    );

    queue.edit("Altered Content");
    await queue.requestSave();

    const state = queue.getState();
    expect(state.status).toBe("conflicted");
    expect(state.isDirty).toBe(true);
  });
});
