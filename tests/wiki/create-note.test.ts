import { describe, expect, it } from "vitest";
import {
  notePathForTarget,
  safeWikiNotePath,
  sanitizeWikiFileName,
} from "../../src/components/wiki/CreateNoteFromWiki";

describe("create note from wiki", () => {
  it("sanitizes target and keeps the current document directory", () => {
    expect(sanitizeWikiFileName("Visão Geral.md")).toBe("visao-geral");
    expect(notePathForTarget("Visão Geral", "docs/current.md")).toBe("docs/visao-geral.md");
  });

  it("does not preserve traversal or separators", () => {
    expect(notePathForTarget("../../secrets", "docs/current.md")).toBe("docs/secrets.md");
    expect(notePathForTarget("///", "docs/current.md")).toBeNull();
    expect(safeWikiNotePath("../secrets.md")).toBeNull();
    expect(safeWikiNotePath("/tmp/secrets.md")).toBeNull();
    expect(safeWikiNotePath("docs/New Note.md")).toBe("docs/new-note.md");
  });
});
