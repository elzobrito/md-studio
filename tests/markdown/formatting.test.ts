import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  toggleBold,
  toggleItalic,
  toggleStrikethrough,
  setHeading,
  insertLink,
  insertImage,
  toggleCode,
  insertCodeBlock,
  toggleList,
  insertBlockquote,
  insertDivider,
} from "../../src/editor/formatting";

function createTestView(doc: string, selection?: { anchor: number; head?: number }): EditorView {
  const state = EditorState.create({
    doc,
    selection: selection ? { anchor: selection.anchor, head: selection.head ?? selection.anchor } : undefined,
  });
  const parent = document.createElement("div");
  return new EditorView({ state, parent });
}

describe("Markdown Formatting Functions", () => {
  describe("toggleBold", () => {
    it("wraps selected text with **", () => {
      const view = createTestView("hello world", { anchor: 6, head: 11 });
      toggleBold(view);
      expect(view.state.doc.toString()).toBe("hello **world**");
    });

    it("removes ** when already bold", () => {
      const view = createTestView("hello **world**", { anchor: 6, head: 15 });
      toggleBold(view);
      expect(view.state.doc.toString()).toBe("hello world");
    });

    it("inserts placeholder when nothing selected", () => {
      const view = createTestView("hello ", { anchor: 6, head: 6 });
      toggleBold(view);
      expect(view.state.doc.toString()).toBe("hello **texto**");
    });
  });

  describe("toggleItalic", () => {
    it("wraps selected text with _", () => {
      const view = createTestView("hello world", { anchor: 6, head: 11 });
      toggleItalic(view);
      expect(view.state.doc.toString()).toBe("hello _world_");
    });

    it("removes _ when already italic", () => {
      const view = createTestView("hello _world_", { anchor: 6, head: 13 });
      toggleItalic(view);
      expect(view.state.doc.toString()).toBe("hello world");
    });
  });

  describe("toggleStrikethrough", () => {
    it("wraps selected text with ~~", () => {
      const view = createTestView("hello world", { anchor: 6, head: 11 });
      toggleStrikethrough(view);
      expect(view.state.doc.toString()).toBe("hello ~~world~~");
    });

    it("removes ~~ when already strikethrough", () => {
      const view = createTestView("hello ~~world~~", { anchor: 6, head: 15 });
      toggleStrikethrough(view);
      expect(view.state.doc.toString()).toBe("hello world");
    });
  });

  describe("setHeading", () => {
    it("converts line to heading 1", () => {
      const view = createTestView("Título aqui", { anchor: 3 });
      setHeading(view, 1);
      expect(view.state.doc.toString()).toBe("# Título aqui");
    });

    it("converts heading 1 to heading 2", () => {
      const view = createTestView("# Título aqui", { anchor: 3 });
      setHeading(view, 2);
      expect(view.state.doc.toString()).toBe("## Título aqui");
    });

    it("toggles off heading when level is the same", () => {
      const view = createTestView("## Título aqui", { anchor: 4 });
      setHeading(view, 2);
      expect(view.state.doc.toString()).toBe("Título aqui");
    });
  });

  describe("insertLink and insertImage", () => {
    it("inserts link with selected text as label", () => {
      const view = createTestView("Clique aqui agora", { anchor: 7, head: 11 });
      insertLink(view);
      expect(view.state.doc.toString()).toBe("Clique [aqui](url) agora");
    });

    it("inserts image syntax", () => {
      const view = createTestView("", { anchor: 0 });
      insertImage(view);
      expect(view.state.doc.toString()).toBe("![descrição](caminho/imagem.png)");
    });
  });

  describe("toggleCode and insertCodeBlock", () => {
    it("wraps selected text in inline code", () => {
      const view = createTestView("const a = 1;", { anchor: 6, head: 11 });
      toggleCode(view);
      expect(view.state.doc.toString()).toBe("const `a = 1`;");
    });

    it("inserts fenced code block", () => {
      const view = createTestView("", { anchor: 0 });
      insertCodeBlock(view);
      expect(view.state.doc.toString()).toBe("```\ncódigo\n```\n");
    });
  });

  describe("toggleList", () => {
    it("prefixes unordered list", () => {
      const view = createTestView("Item 1", { anchor: 2 });
      toggleList(view, "unordered");
      expect(view.state.doc.toString()).toBe("- Item 1");
    });

    it("toggles off unordered list", () => {
      const view = createTestView("- Item 1", { anchor: 4 });
      toggleList(view, "unordered");
      expect(view.state.doc.toString()).toBe("Item 1");
    });

    it("switches to ordered list", () => {
      const view = createTestView("- Item 1", { anchor: 4 });
      toggleList(view, "ordered");
      expect(view.state.doc.toString()).toBe("1. Item 1");
    });

    it("switches to task list", () => {
      const view = createTestView("1. Item 1", { anchor: 4 });
      toggleList(view, "task");
      expect(view.state.doc.toString()).toBe("- [ ] Item 1");
    });
  });

  describe("insertBlockquote and insertDivider", () => {
    it("prefixes blockquote", () => {
      const view = createTestView("Citação importante", { anchor: 2 });
      insertBlockquote(view);
      expect(view.state.doc.toString()).toBe("> Citação importante");
    });

    it("inserts divider", () => {
      const view = createTestView("Parágrafo 1", { anchor: 11 });
      insertDivider(view);
      expect(view.state.doc.toString()).toBe("Parágrafo 1\n\n---\n\n");
    });
  });
});
