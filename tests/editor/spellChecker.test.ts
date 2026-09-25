import { describe, expect, it } from "vitest";
import { LocalSpellChecker } from "../../src/editor/spellcheck/spellChecker";
import { scanSpellIssues } from "../../src/editor/spellcheck/spellLinter";

describe("Writing Quality fase 1 - Spell Checker (MD-V03-015)", () => {
  it("validates correct words in pt-BR and detects misspelled words", () => {
    const checker = new LocalSpellChecker();

    expect(checker.checkWord("documento", "pt-BR")).toBe(true);
    expect(checker.checkWord("palavra", "pt-BR")).toBe(true);
    expect(checker.checkWord("erradoxz", "pt-BR")).toBe(false);
  });

  it("provides relevant suggestions using Levenshtein distance", () => {
    const checker = new LocalSpellChecker();
    const suggestions = checker.getSuggestions("palvra", "pt-BR");

    expect(suggestions).toContain("palavra");
  });

  it("adds word to user dictionary and persists across checks", () => {
    const checker = new LocalSpellChecker();
    const customWord = "neologismoespecifico";

    expect(checker.checkWord(customWord, "pt-BR")).toBe(false);

    checker.addToUserDictionary(customWord);
    expect(checker.checkWord(customWord, "pt-BR")).toBe(true);
  });

  it("ignores word when added to ignore list", () => {
    const checker = new LocalSpellChecker();
    const ignoredWord = "temporariamentesignorado";

    expect(checker.checkWord(ignoredWord, "pt-BR")).toBe(false);

    checker.ignoreWord(ignoredWord);
    expect(checker.isIgnored(ignoredWord)).toBe(true);
    expect(checker.checkWord(ignoredWord, "pt-BR")).toBe(true);
  });

  it("scans document and ignores words inside code fences", () => {
    const checker = new LocalSpellChecker();
    const markdown = [
      "Este é um texto com erradoxz no parágrafo.",
      "```rust",
      "fn main() { let erradoxz = 123; }",
      "```",
      "E aqui continua o texto com outracoisaerrada.",
    ].join("\n");

    const issues = scanSpellIssues(
      markdown,
      { enabled: true, language: "pt-BR", ignoreCodeBlocks: true },
      checker
    );

    const issueWords = issues.map((i) => i.word);
    expect(issueWords).toContain("erradoxz");
    expect(issueWords).toContain("outracoisaerrada");
    // O erradoxz dentro do bloco de código não deve ser duplicado
    expect(issueWords.filter((w) => w === "erradoxz")).toHaveLength(1);
  });

  it("ignores inline code and URLs", () => {
    const checker = new LocalSpellChecker();
    const markdown = "Veja o código `erradoxz` e o link https://erradoxz.com/page para mais detalhes.";

    const issues = scanSpellIssues(
      markdown,
      { enabled: true, language: "pt-BR", ignoreCodeBlocks: true },
      checker
    );

    expect(issues.some((i) => i.word === "erradoxz")).toBe(false);
  });

  it("fails gracefully and returns empty issues when disabled", () => {
    const checker = new LocalSpellChecker();
    const markdown = "Texto completamente erradoxz.";

    const issues = scanSpellIssues(
      markdown,
      { enabled: false, language: "pt-BR", ignoreCodeBlocks: true },
      checker
    );

    expect(issues).toHaveLength(0);
  });
});
