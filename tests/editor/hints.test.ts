import { describe, expect, it } from "vitest";
import { matchHintAtPosition, HINT_DEFINITIONS } from "../../src/editor/hints/markdown-hints";
import { settingsStore } from "../../src/state/settings";

describe("Markdown Hints", () => {
  it("matches bold syntax", () => {
    const hint = matchHintAtPosition("um **texto em negrito** aqui", 7, 0);
    expect(hint).not.toBeNull();
    expect(hint?.message).toBe("Negrito — Ctrl+B");
  });

  it("matches italic syntax", () => {
    const hint = matchHintAtPosition("um _texto em itálico_ aqui", 6, 0);
    expect(hint).not.toBeNull();
    expect(hint?.message).toBe("Itálico — Ctrl+I");
  });

  it("matches headings levels", () => {
    const h1 = matchHintAtPosition("# Título principal", 1, 0);
    expect(h1).not.toBeNull();
    expect(h1?.message).toBe("Cabeçalho nível 1");

    const h3 = matchHintAtPosition("### Subseção", 2, 0);
    expect(h3).not.toBeNull();
    expect(h3?.message).toBe("Cabeçalho nível 3");
  });

  it("matches wiki links", () => {
    const hint = matchHintAtPosition("veja [[minha-nota]] para mais", 8, 0);
    expect(hint).not.toBeNull();
    expect(hint?.message).toBe("Wiki Link → minha-nota");
  });

  it("matches external URLs", () => {
    const hint = matchHintAtPosition("acesse https://google.com para buscar", 10, 0);
    expect(hint).not.toBeNull();
    expect(hint?.message).toBe("Link externo — Ctrl+Click para abrir");
  });

  it("matches inline code", () => {
    const hint = matchHintAtPosition("execute `npm run test` agora", 12, 0);
    expect(hint).not.toBeNull();
    expect(hint?.message).toBe("Código inline — Ctrl+E");
  });

  it("matches GitHub alerts", () => {
    const note = matchHintAtPosition("> [!NOTE]", 3, 0);
    expect(note).not.toBeNull();
    expect(note?.message).toBe("Alerta GitHub: NOTE");

    const warning = matchHintAtPosition("> [!WARNING]", 3, 0);
    expect(warning).not.toBeNull();
    expect(warning?.message).toBe("Alerta GitHub: WARNING");
  });

  it("returns null for normal text", () => {
    const hint = matchHintAtPosition("apenas texto comum sem formatação", 10, 0);
    expect(hint).toBeNull();
  });

  it("handles settings toggle for markdown hints", () => {
    settingsStore.setMarkdownHints(false);
    expect(settingsStore.getState().markdownHints).toBe(false);

    settingsStore.setMarkdownHints(true);
    expect(settingsStore.getState().markdownHints).toBe(true);
  });
});
