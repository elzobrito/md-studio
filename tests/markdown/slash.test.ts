import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { SLASH_ITEMS } from "../../src/editor/slash/slash-items";
import { filterSlashItems } from "../../src/editor/slash/slash-search";
import {
  detectSlashCommand,
  executeSlashItem,
} from "../../src/editor/slash/slash-plugin";

function createTestView(doc: string, pos: number): EditorView {
  const state = EditorState.create({
    doc,
    selection: { anchor: pos, head: pos },
  });
  const parent = document.createElement("div");
  return new EditorView({ state, parent });
}

describe("Slash Commands", () => {
  it("has exactly 17 items in the catalog", () => {
    expect(SLASH_ITEMS).toHaveLength(17);
  });

  describe("filterSlashItems", () => {
    it("returns all items when query is empty", () => {
      const filtered = filterSlashItems("", SLASH_ITEMS);
      expect(filtered).toHaveLength(17);
    });

    it("filters items by label or keyword", () => {
      const filtered = filterSlashItems("tabela", SLASH_ITEMS);
      expect(filtered.some((i) => i.id === "table")).toBe(true);
    });

    it("filters items by heading keywords", () => {
      const filtered = filterSlashItems("h1", SLASH_ITEMS);
      expect(filtered.some((i) => i.id === "h1")).toBe(true);
    });
  });

  describe("detectSlashCommand", () => {
    it("detects slash at empty line", () => {
      const view = createTestView("/", 1);
      const detected = detectSlashCommand(view);
      expect(detected).not.toBeNull();
      expect(detected?.query).toBe("");
      expect(detected?.slashFrom).toBe(0);
      expect(detected?.slashTo).toBe(1);
    });

    it("detects slash with query at line start", () => {
      const view = createTestView("/h1", 3);
      const detected = detectSlashCommand(view);
      expect(detected).not.toBeNull();
      expect(detected?.query).toBe("h1");
    });

    it("does not detect slash in the middle of text", () => {
      const view = createTestView("hello /world", 12);
      const detected = detectSlashCommand(view);
      expect(detected).toBeNull();
    });

    it("detects slash after indentation", () => {
      const view = createTestView("  /list", 7);
      const detected = detectSlashCommand(view);
      expect(detected).not.toBeNull();
      expect(detected?.query).toBe("list");
      expect(detected?.slashFrom).toBe(2);
      expect(detected?.slashTo).toBe(7);
    });
  });

  describe("executeSlashItem", () => {
    it("removes the slash command text and inserts heading", () => {
      const view = createTestView("/h1", 3);
      const detected = detectSlashCommand(view);
      expect(detected).not.toBeNull();
      const h1Item = SLASH_ITEMS.find((i) => i.id === "h1")!;
      executeSlashItem(view, h1Item, detected!);
      expect(view.state.doc.toString()).toBe("# Título 1");
    });

    it("removes the slash command text and inserts table", () => {
      const view = createTestView("/table", 6);
      const detected = detectSlashCommand(view);
      expect(detected).not.toBeNull();
      const tableItem = SLASH_ITEMS.find((i) => i.id === "table")!;
      executeSlashItem(view, tableItem, detected!);
      expect(view.state.doc.toString()).toContain("| Coluna 1 | Coluna 2 | Coluna 3 |");
    });
  });
});
