import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  parseTabularData,
  convertTabularToGfm,
  escapeGfmCell,
  handleTabularPaste,
  renderTablePasteModal,
} from "../../src/editor/tableDataPaste";

describe("Table Data Paste (MD-V03-016)", () => {
  it("detects TSV with 3 columns and multiple rows", () => {
    const tsv = "Nome\tIdade\tCidade\nAna\t25\tSão Paulo\nBeto\t30\tRio";
    const parsed = parseTabularData(tsv);

    expect(parsed.isTabular).toBe(true);
    expect(parsed.delimiter).toBe("\t");
    expect(parsed.rows).toHaveLength(3);
    expect(parsed.rows[0]).toEqual(["Nome", "Idade", "Cidade"]);
  });

  it("converts TSV into GFM table with confirmed header", () => {
    const rows = [
      ["Nome", "Idade", "Cidade"],
      ["Ana", "25", "São Paulo"],
      ["Beto", "30", "Rio"],
    ];

    const gfm = convertTabularToGfm(rows, true);
    const expected = [
      "| Nome | Idade | Cidade |",
      "| --- | --- | --- |",
      "| Ana | 25 | São Paulo |",
      "| Beto | 30 | Rio |",
    ].join("\n");

    expect(gfm).toBe(expected);
  });

  it("synthesizes generic header when user toggles header off", () => {
    const rows = [
      ["Ana", "25", "São Paulo"],
      ["Beto", "30", "Rio"],
    ];

    const gfm = convertTabularToGfm(rows, false);
    const expected = [
      "| Coluna 1 | Coluna 2 | Coluna 3 |",
      "| --- | --- | --- |",
      "| Ana | 25 | São Paulo |",
      "| Beto | 30 | Rio |",
    ].join("\n");

    expect(gfm).toBe(expected);
  });

  it("escapes pipe characters and newlines in cells", () => {
    expect(escapeGfmCell("item | especial")).toBe("item \\| especial");
    expect(escapeGfmCell("linha 1\nlinha 2")).toBe("linha 1 linha 2");

    const rows = [
      ["Cabeçalho", "Observação"],
      ["Dado 1", "Valor | com | pipes"],
    ];
    const gfm = convertTabularToGfm(rows, true);
    expect(gfm).toContain("Valor \\| com \\| pipes");
  });

  it("parses CSV data respecting quotes", () => {
    const csv = 'Nome,Descrição,Valor\nItem A,"Texto com, vírgula",100\nItem B,Normal,200';
    const parsed = parseTabularData(csv);

    expect(parsed.isTabular).toBe(true);
    expect(parsed.delimiter).toBe(",");
    expect(parsed.rows[1][1]).toBe("Texto com, vírgula");
  });

  it("does not treat plain non-tabular text as tabular data", () => {
    expect(parseTabularData("Apenas uma linha simples.").isTabular).toBe(false);
    expect(parseTabularData("Linha 1\nLinha 2 sem delimitador comum").isTabular).toBe(false);
  });

  it("cancelling modal leaves document completely unmodified", () => {
    const state = EditorState.create({ doc: "Texto inicial" });
    const view = new EditorView({ state });

    let confirmed = false;
    let cancelled = false;

    const modal = renderTablePasteModal({
      rows: [["A", "B"], ["1", "2"]],
      onConfirm: () => { confirmed = true; },
      onCancel: () => { cancelled = true; },
    });

    const cancelBtn = modal.querySelector("button") as HTMLButtonElement;
    cancelBtn.click();

    expect(cancelled).toBe(true);
    expect(confirmed).toBe(false);
    expect(view.state.doc.toString()).toBe("Texto inicial");
  });

  it("inserts GFM table into CodeMirror selection in direct mode", () => {
    const state = EditorState.create({ doc: "Prefácio\n\nPosfácio" });
    const view = new EditorView({ state });

    // Set selection in between
    view.dispatch({ selection: { anchor: 9, head: 9 } });

    const tsv = "A\tB\n1\t2";
    const handled = handleTabularPaste(tsv, view, false);

    expect(handled).toBe(true);
    expect(view.state.doc.toString()).toContain("| A | B |\n| --- | --- |\n| 1 | 2 |");
  });
});
