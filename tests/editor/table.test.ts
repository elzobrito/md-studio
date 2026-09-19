import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  isTableLine,
  parseTable,
  serializeTable,
  addColumn,
  removeColumn,
  addRow,
  removeRow,
  setColumnAlignment,
  type TableData,
} from "../../src/editor/table/table-helpers";

function createTestView(doc: string, pos: number): EditorView {
  const state = EditorState.create({
    doc,
    selection: { anchor: pos, head: pos },
  });
  const parent = document.createElement("div");
  return new EditorView({ state, parent });
}

describe("Table Editor Helpers", () => {
  it("detects table lines correctly", () => {
    expect(isTableLine("| Col 1 | Col 2 |")).toBe(true);
    expect(isTableLine("| --- | --- |")).toBe(true);
    expect(isTableLine("texto comum")).toBe(false);
  });

  it("parses and serializes table data correctly", () => {
    const tableText =
      "| Col 1 | Col 2 |\n| :--- | ---: |\n| val 1 | val 2 |";
    const view = createTestView(tableText, 5);
    const data = parseTable(view);

    expect(data).not.toBeNull();
    expect(data?.rows).toHaveLength(2); // 1 header + 1 data row
    expect(data?.alignments).toEqual(["left", "right"]);

    const serialized = serializeTable(data!);
    expect(serialized).toContain("| Col 1 | Col 2 |");
    expect(serialized).toContain("| :---- | ----: |");
    expect(serialized).toContain("| val 1 | val 2 |");
  });

  it("adds a column to the table", () => {
    const tableText =
      "| Col 1 | Col 2 |\n| --- | --- |\n| a | b |";
    const view = createTestView(tableText, 5);
    addColumn(view, 0); // after col 0

    const updated = view.state.doc.toString();
    expect(updated).toContain("Coluna 3"); // default header for new column
    const parsed = parseTable(view);
    expect(parsed?.alignments).toHaveLength(3);
  });

  it("removes a column from the table", () => {
    const tableText =
      "| Col 1 | Col 2 | Col 3 |\n| --- | --- | --- |\n| a | b | c |";
    const view = createTestView(tableText, 5);
    removeColumn(view, 1); // remove Col 2

    const parsed = parseTable(view);
    expect(parsed?.alignments).toHaveLength(2);
    expect(parsed?.rows[0]).toEqual(["Col 1", "Col 3"]);
  });

  it("adds a row to the table", () => {
    const tableText =
      "| Col 1 | Col 2 |\n| --- | --- |\n| a | b |";
    const view = createTestView(tableText, 5);
    addRow(view, 1); // after row 1

    const parsed = parseTable(view);
    expect(parsed?.rows).toHaveLength(3); // header + 2 data rows
  });

  it("removes a row from the table", () => {
    const tableText =
      "| Col 1 | Col 2 |\n| --- | --- |\n| a | b |\n| c | d |";
    const view = createTestView(tableText, 25); // on row 1
    removeRow(view, 1);

    const parsed = parseTable(view);
    expect(parsed?.rows).toHaveLength(2); // header + 1 data row remaining
    expect(parsed?.rows[1]).toEqual(["c", "d"]);
  });

  it("sets column alignment", () => {
    const tableText =
      "| Col 1 | Col 2 |\n| --- | --- |\n| a | b |";
    const view = createTestView(tableText, 5);
    setColumnAlignment(view, 0, "center");

    const updated = view.state.doc.toString();
    expect(updated).toContain(":---:");
  });
});
