import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  toggleBold,
  toggleItalic,
  toggleStrikethrough,
  setHeading,
  insertLink,
  toggleCode,
  toggleList,
  insertDivider,
  insertBlockquote,
} from "../../src/editor/formatting";
import { SLASH_ITEMS } from "../../src/editor/slash/slash-items";
import { filterSlashItems } from "../../src/editor/slash/slash-search";
import { detectSlashCommand, executeSlashItem } from "../../src/editor/slash/slash-plugin";
import { htmlToMarkdown } from "../../src/editor/paste/html-to-md";
import { TEMPLATES, today, findFirstEditablePosition } from "../../src/templates";
import { CHEATSHEET_ITEMS } from "../../src/components/help/cheatsheet-items";
import { matchHintAtPosition } from "../../src/editor/hints/markdown-hints";
import {
  isTableLine,
  parseTable,
  serializeTable,
  addColumn,
  addRow,
} from "../../src/editor/table/table-helpers";

function createView(doc: string, anchor = 0, head = anchor): EditorView {
  const state = EditorState.create({
    doc,
    selection: { anchor, head },
  });
  const parent = document.createElement("div");
  return new EditorView({ state, parent });
}

describe("Guided Markdown Integration Suite (Onda 0B Gate)", () => {
  describe("WBS-GM-001: Formatting Toolbar CM6", () => {
    it("applies and toggles bold", () => {
      const v = createView("palavra", 0, 7);
      toggleBold(v);
      expect(v.state.doc.toString()).toBe("**palavra**");
      v.dispatch({ selection: { anchor: 0, head: 11 } });
      toggleBold(v);
      expect(v.state.doc.toString()).toBe("palavra");
    });

    it("applies and toggles italic", () => {
      const v = createView("texto", 0, 5);
      toggleItalic(v);
      expect(v.state.doc.toString()).toBe("_texto_");
      v.dispatch({ selection: { anchor: 0, head: 7 } });
      toggleItalic(v);
      expect(v.state.doc.toString()).toBe("texto");
    });

    it("applies strikethrough", () => {
      const v = createView("riscado", 0, 7);
      toggleStrikethrough(v);
      expect(v.state.doc.toString()).toBe("~~riscado~~");
    });

    it("applies headings and toggles", () => {
      const v = createView("Secao", 2);
      setHeading(v, 2);
      expect(v.state.doc.toString()).toBe("## Secao");
      setHeading(v, 2);
      expect(v.state.doc.toString()).toBe("Secao");
    });

    it("applies lists, links, inline code and blockquotes", () => {
      const v = createView("Item", 0);
      toggleList(v, "unordered");
      expect(v.state.doc.toString()).toBe("- Item");

      const v2 = createView("Link", 0, 4);
      insertLink(v2);
      expect(v2.state.doc.toString()).toBe("[Link](url)");

      const v3 = createView("var x", 0, 5);
      toggleCode(v3);
      expect(v3.state.doc.toString()).toBe("`var x`");

      const v4 = createView("Citando", 0);
      insertBlockquote(v4);
      expect(v4.state.doc.toString()).toBe("> Citando");
    });
  });

  describe("WBS-GM-002: Slash Commands", () => {
    it("provides complete catalog of 17 items", () => {
      expect(SLASH_ITEMS).toHaveLength(17);
    });

    it("activates slash detection only at line start", () => {
      const v1 = createView("/h1", 3);
      const d1 = detectSlashCommand(v1);
      expect(d1).not.toBeNull();
      expect(d1?.query).toBe("h1");

      const v2 = createView("palavra /h1", 11);
      expect(detectSlashCommand(v2)).toBeNull();
    });

    it("filters slash items by keyword", () => {
      const results = filterSlashItems("tabela", SLASH_ITEMS);
      expect(results.some((r) => r.id === "table")).toBe(true);
    });

    it("replaces slash command upon item execution", () => {
      const v = createView("/h1", 3);
      const d = detectSlashCommand(v);
      const h1Item = SLASH_ITEMS.find((i) => i.id === "h1")!;
      executeSlashItem(v, h1Item, d!);
      expect(v.state.doc.toString()).toBe("# Título 1");
    });
  });

  describe("WBS-GM-003: Smart Paste HTML to MD", () => {
    it("converts rich HTML to clean Markdown", () => {
      const html = "<h1>Título</h1><p>Texto <strong>negrito</strong> e <em>itálico</em></p><ul><li>A</li><li>B</li></ul>";
      const md = htmlToMarkdown(html);
      expect(md).toContain("# Título");
      expect(md).toContain("**negrito**");
      expect(md).toContain("_itálico_");
      expect(md).toContain("- A");
      expect(md).toContain("- B");
    });

    it("preserves plain text without modification", () => {
      expect(htmlToMarkdown("Apenas texto puro")).toBe("Apenas texto puro");
    });
  });

  describe("WBS-GM-004: Document Templates", () => {
    it("provides 7 templates plus blank with dynamic date", () => {
      expect(TEMPLATES.length).toBeGreaterThanOrEqual(7);
      const meeting = TEMPLATES.find((t) => t.id === "meeting")!;
      expect(meeting.content()).toContain(today());
    });

    it("calculates first editable position", () => {
      const tpl = "# Título\n\nPrimeiro parágrafo";
      expect(findFirstEditablePosition(tpl)).toBe(9);
    });
  });

  describe("WBS-GM-005: Markdown Cheatsheet", () => {
    it("contains 20 reference items with copyText", () => {
      expect(CHEATSHEET_ITEMS).toHaveLength(20);
      for (const item of CHEATSHEET_ITEMS) {
        expect(item.copyText.length).toBeGreaterThan(0);
      }
    });
  });

  describe("WBS-GM-006: Markdown Hints", () => {
    it("identifies tokens and generates contextual hints", () => {
      const boldHint = matchHintAtPosition("veja **negrito** aqui", 7, 0);
      expect(boldHint?.message).toBe("Negrito — Ctrl+B");

      const wikiHint = matchHintAtPosition("link [[nota-alvo]]", 7, 0);
      expect(wikiHint?.message).toBe("Wiki Link → nota-alvo");
    });
  });

  describe("WBS-GM-007: Table Editor Assistido", () => {
    it("detects, manipulates, and serializes tables", () => {
      expect(isTableLine("| A | B |")).toBe(true);
      const v = createView("| Col 1 | Col 2 |\n| --- | --- |\n| 1 | 2 |", 5);
      const data = parseTable(v);
      expect(data).not.toBeNull();
      addColumn(v, 0);
      expect(v.state.doc.toString()).toContain("Coluna 3");
      addRow(v, 1);
      const updated = parseTable(v);
      expect(updated?.rows).toHaveLength(3);
    });
  });
});
