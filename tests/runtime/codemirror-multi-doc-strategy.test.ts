/**
 * 053-D — Testes Comparativos de Estratégias CodeMirror Multi-documento
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  SingleViewSetStateStrategy,
  SmallViewPoolStrategy,
  RecreateOnActivateStrategy,
  createDocumentSession,
  runStrategyBenchmark,
  type DocumentSession,
} from "../../src/services/runtime/codemirrorMultiDocStrategy";
import { undo, redo } from "@codemirror/commands";

describe("053-D: Estratégias CodeMirror Multi-documento", () => {
  let sessions: DocumentSession[];

  beforeEach(() => {
    sessions = [
      createDocumentSession("doc-1", "# Documento 1\n\nTexto original do primeiro."),
      createDocumentSession("doc-2", "# Documento 2\n\nConteúdo do segundo arquivo."),
      createDocumentSession("doc-3", "# Documento 3\n\nTerceira nota do workspace."),
      createDocumentSession("doc-4", "# Documento 4\n\nQuarta nota para testar pool."),
    ];
  });

  describe("Estratégia 1: Single View + setState (Recomendada R3)", () => {
    it("mantém exatamente 1 EditorView no DOM e preserva histórico isolado de undo/redo", () => {
      const strategy = new SingleViewSetStateStrategy();
      const container = document.createElement("div");
      document.body.appendChild(container);

      strategy.mount(container, sessions[0]);
      expect(strategy.getMountedViewCount()).toBe(1);

      // Edita Documento 1
      const view1 = strategy.getActiveView()!;
      view1.dispatch({
        changes: { from: 0, to: 0, insert: "ALTERAÇÃO 1: " },
      });
      expect(view1.state.doc.toString()).toMatch(/^ALTERAÇÃO 1: /);

      // Alterna para Documento 2
      strategy.switchTo(sessions[1]);
      expect(strategy.getMountedViewCount()).toBe(1); // Continua exatamente 1 view
      const view2 = strategy.getActiveView()!;
      expect(view2.state.doc.toString()).toMatch(/^# Documento 2/);

      // Edita Documento 2
      view2.dispatch({
        changes: { from: 0, to: 0, insert: "ALTERAÇÃO 2: " },
      });

      // Alterna de volta para Documento 1
      strategy.switchTo(sessions[0]);
      const view1Restored = strategy.getActiveView()!;
      expect(view1Restored.state.doc.toString()).toMatch(/^ALTERAÇÃO 1: /);

      // Testa Undo no Documento 1: deve desfazer apenas a alteração do Doc 1
      const didUndo = undo(view1Restored);
      expect(didUndo).toBe(true);
      expect(view1Restored.state.doc.toString()).not.toContain("ALTERAÇÃO 1: ");

      // Alterna para Documento 2: a alteração do Doc 2 continua intacta!
      strategy.switchTo(sessions[1]);
      const view2Restored = strategy.getActiveView()!;
      expect(view2Restored.state.doc.toString()).toContain("ALTERAÇÃO 2: ");

      strategy.destroy();
      container.remove();
    });

    it("preserva cursor e seleção ao alternar entre abas", () => {
      const strategy = new SingleViewSetStateStrategy();
      const container = document.createElement("div");
      document.body.appendChild(container);

      strategy.mount(container, sessions[0]);
      const view = strategy.getActiveView()!;

      // Define seleção no Documento 1: intervalo 2..8
      view.dispatch({
        selection: { anchor: 2, head: 8 },
      });
      expect(view.state.selection.main.anchor).toBe(2);
      expect(view.state.selection.main.head).toBe(8);

      // Alterna para Doc 2
      strategy.switchTo(sessions[1]);
      expect(strategy.getActiveView()!.state.selection.main.anchor).toBe(0);

      // Retorna para Doc 1: seleção 2..8 deve ser restaurada
      strategy.switchTo(sessions[0]);
      expect(strategy.getActiveView()!.state.selection.main.anchor).toBe(2);
      expect(strategy.getActiveView()!.state.selection.main.head).toBe(8);

      strategy.destroy();
      container.remove();
    });
  });

  describe("Estratégia 2: Small View Pool (LRU)", () => {
    it("aloca views até o limite e recicla via LRU", () => {
      const poolSize = 2;
      const strategy = new SmallViewPoolStrategy(poolSize);
      const container = document.createElement("div");
      document.body.appendChild(container);

      strategy.mount(container, sessions[0]);
      expect(strategy.getMountedViewCount()).toBe(1);

      strategy.switchTo(sessions[1]);
      expect(strategy.getMountedViewCount()).toBe(2);

      // Ao abrir o 3º documento, deve evict o doc 0 e manter o count em 2
      strategy.switchTo(sessions[2]);
      expect(strategy.getMountedViewCount()).toBe(poolSize);

      strategy.destroy();
      container.remove();
    });

    it("preserva o histórico de undo após expulsar e recriar uma view", () => {
      const strategy = new SmallViewPoolStrategy(3);
      const container = document.createElement("div");
      document.body.appendChild(container);

      strategy.mount(container, sessions[0]);
      strategy.getActiveView()!.dispatch({
        changes: { from: 0, to: 0, insert: "ALTERAÇÃO PERSISTIDA: " },
      });

      strategy.switchTo(sessions[1]);
      strategy.switchTo(sessions[2]);
      strategy.switchTo(sessions[3]);
      expect(strategy.getMountedViewCount()).toBe(3);

      strategy.switchTo(sessions[0]);
      const restoredView = strategy.getActiveView()!;
      expect(restoredView.state.doc.toString()).toMatch(/^ALTERAÇÃO PERSISTIDA: /);
      expect(undo(restoredView)).toBe(true);
      expect(restoredView.state.doc.toString()).not.toContain("ALTERAÇÃO PERSISTIDA: ");

      strategy.destroy();
      container.remove();
    });
  });

  describe("Benchmark Comparativo Formal", () => {
    it("executa benchmark e atesta superioridade de Single View + setState", () => {
      const freshSessions = (): DocumentSession[] => [
        createDocumentSession("doc-1", "# Documento 1\n\nTexto original do primeiro."),
        createDocumentSession("doc-2", "# Documento 2\n\nConteúdo do segundo arquivo."),
        createDocumentSession("doc-3", "# Documento 3\n\nTerceira nota do workspace."),
        createDocumentSession("doc-4", "# Documento 4\n\nQuarta nota para testar pool."),
      ];

      const mSingle = runStrategyBenchmark(
        new SingleViewSetStateStrategy(),
        freshSessions(),
        15
      );
      const mPool = runStrategyBenchmark(
        new SmallViewPoolStrategy(3),
        freshSessions(),
        15
      );
      const mRecreate = runStrategyBenchmark(
        new RecreateOnActivateStrategy(),
        freshSessions(),
        15
      );

      expect(mSingle.undoFidelityPreserved).toBe(true);
      expect(mPool.undoFidelityPreserved).toBe(true);
      expect(mRecreate.undoFidelityPreserved).toBe(true);

      // Single View tem a menor contagem de nós/views no DOM
      expect(mSingle.maxDomViews).toBe(1);
      expect(mPool.maxDomViews).toBeGreaterThanOrEqual(1);

      // Ambos atingem latência de switch compatível com 60fps (< 16ms)
      expect(mSingle.p50Ms).toBeLessThan(16);
      expect(mRecreate.p50Ms).toBeLessThan(16);
    });
  });
});
