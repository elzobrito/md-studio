import type { EditorView } from "@codemirror/view";

export type Alignment = "left" | "center" | "right" | null;

export interface TableData {
  rows: string[][];
  alignments: Alignment[];
  startLine: number;
  endLine: number;
  cursorRow: number;
  cursorCol: number;
}

export function isTableLine(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith("|") || (trimmed.includes("|") && trimmed.endsWith("|"));
}

export function isInTable(view: EditorView): boolean {
  const pos = view.state.selection.main.from;
  const line = view.state.doc.lineAt(pos);
  return isTableLine(line.text);
}

function parseRowCells(lineText: string): string[] {
  const trimmed = lineText.trim();
  const withoutEnds = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  return withoutEnds.split("|").map((c) => c.trim());
}

function parseAlignment(cell: string): Alignment {
  const t = cell.trim();
  const left = t.startsWith(":");
  const right = t.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  if (left) return "left";
  return null;
}

export function parseTable(view: EditorView): TableData | null {
  const state = view.state;
  const pos = state.selection.main.from;
  const currentLine = state.doc.lineAt(pos);

  if (!isTableLine(currentLine.text)) return null;

  // Scan upwards to find start line
  let startLineNum = currentLine.number;
  while (startLineNum > 1) {
    const prev = state.doc.line(startLineNum - 1);
    if (!isTableLine(prev.text)) break;
    startLineNum--;
  }

  // Scan downwards to find end line
  let endLineNum = currentLine.number;
  while (endLineNum < state.doc.lines) {
    const next = state.doc.line(endLineNum + 1);
    if (!isTableLine(next.text)) break;
    endLineNum++;
  }

  // Must have at least header + separator
  if (endLineNum - startLineNum < 1) return null;

  const headerLine = state.doc.line(startLineNum).text;
  const sepLine = state.doc.line(startLineNum + 1).text;

  const headerCells = parseRowCells(headerLine);
  const sepCells = parseRowCells(sepLine);

  const alignments = sepCells.map(parseAlignment);
  const numCols = Math.max(headerCells.length, alignments.length);

  const rows: string[][] = [];
  rows.push(padRow(headerCells, numCols));

  for (let i = startLineNum + 2; i <= endLineNum; i++) {
    const lineText = state.doc.line(i).text;
    rows.push(padRow(parseRowCells(lineText), numCols));
  }

  // Determine cursorRow & cursorCol
  const cursorRow = Math.max(0, currentLine.number - startLineNum - (currentLine.number > startLineNum + 1 ? 1 : 0));
  const beforeCursor = currentLine.text.slice(0, pos - currentLine.from);
  const pipesBefore = (beforeCursor.match(/\|/g) || []).length;
  const cursorCol = Math.max(0, Math.min(numCols - 1, pipesBefore - 1));

  return {
    rows,
    alignments: padAlignments(alignments, numCols),
    startLine: startLineNum,
    endLine: endLineNum,
    cursorRow,
    cursorCol,
  };
}

function padRow(cells: string[], len: number): string[] {
  const res = [...cells];
  while (res.length < len) res.push("");
  return res.slice(0, len);
}

function padAlignments(alignments: Alignment[], len: number): Alignment[] {
  const res = [...alignments];
  while (res.length < len) res.push(null);
  return res.slice(0, len);
}

export function serializeTable(data: TableData): string {
  const colCount = data.alignments.length;
  const colWidths = Array.from({ length: colCount }, (_, i) => {
    let max = 3;
    for (const row of data.rows) {
      const len = (row[i] || "").length;
      if (len > max) max = len;
    }
    return Math.max(max, 3);
  });

  // Header row
  const header = "| " + data.rows[0].map((cell, i) => cell.padEnd(colWidths[i])).join(" | ") + " |";

  // Delimiter row
  const separator =
    "| " +
    data.alignments
      .map((align, i) => {
        const w = colWidths[i];
        if (align === "center") return ":" + "-".repeat(Math.max(w - 2, 1)) + ":";
        if (align === "right") return "-".repeat(Math.max(w - 1, 2)) + ":";
        if (align === "left") return ":" + "-".repeat(Math.max(w - 1, 2));
        return "-".repeat(w);
      })
      .join(" | ") +
    " |";

  // Data rows
  const dataRows = data.rows.slice(1).map(
    (row) => "| " + row.map((cell, i) => cell.padEnd(colWidths[i])).join(" | ") + " |"
  );

  return [header, separator, ...dataRows].join("\n");
}

export function replaceTableInDoc(view: EditorView, data: TableData, serialized: string) {
  const startFrom = view.state.doc.line(data.startLine).from;
  const endTo = view.state.doc.line(data.endLine).to;
  view.dispatch({
    changes: { from: startFrom, to: endTo, insert: serialized },
  });
  view.focus();
}

export function addColumn(view: EditorView, afterCol?: number): void {
  const data = parseTable(view);
  if (!data) return;

  const targetCol = afterCol !== undefined ? afterCol : data.cursorCol;
  const insertIdx = targetCol + 1;

  for (let r = 0; r < data.rows.length; r++) {
    data.rows[r].splice(insertIdx, 0, r === 0 ? `Coluna ${data.rows[r].length + 1}` : "");
  }
  data.alignments.splice(insertIdx, 0, null);

  const serialized = serializeTable(data);
  replaceTableInDoc(view, data, serialized);
}

export function removeColumn(view: EditorView, colIndex?: number): void {
  const data = parseTable(view);
  if (!data || data.alignments.length <= 1) return;

  const targetCol = colIndex !== undefined ? colIndex : data.cursorCol;
  for (const row of data.rows) {
    row.splice(targetCol, 1);
  }
  data.alignments.splice(targetCol, 1);

  const serialized = serializeTable(data);
  replaceTableInDoc(view, data, serialized);
}

export function addRow(view: EditorView, afterRow?: number): void {
  const data = parseTable(view);
  if (!data) return;

  const targetRow = afterRow !== undefined ? afterRow : data.cursorRow;
  const numCols = data.alignments.length;
  const newRow = Array.from({ length: numCols }, () => "");

  // If targetRow is 0 (header), insert at index 1
  const insertIdx = Math.max(1, targetRow + 1);
  data.rows.splice(insertIdx, 0, newRow);

  const serialized = serializeTable(data);
  replaceTableInDoc(view, data, serialized);
}

export function removeRow(view: EditorView, rowIndex?: number): void {
  const data = parseTable(view);
  if (!data || data.rows.length <= 2) return; // keep header and at least 1 row

  const targetRow = rowIndex !== undefined ? rowIndex : data.cursorRow;
  if (targetRow === 0) return; // Don't remove header

  data.rows.splice(targetRow, 1);
  const serialized = serializeTable(data);
  replaceTableInDoc(view, data, serialized);
}

export function setColumnAlignment(view: EditorView, col: number, align: Alignment): void {
  const data = parseTable(view);
  if (!data || col < 0 || col >= data.alignments.length) return;

  data.alignments[col] = align;
  const serialized = serializeTable(data);
  replaceTableInDoc(view, data, serialized);
}

export function moveToNextCell(view: EditorView): void {
  const data = parseTable(view);
  if (!data) return;

  const totalRows = data.rows.length;
  const totalCols = data.alignments.length;

  let nextCol = data.cursorCol + 1;
  let nextRow = data.cursorRow;

  if (nextCol >= totalCols) {
    nextCol = 0;
    nextRow++;
  }

  if (nextRow >= totalRows) {
    // Add row at end
    addRow(view, totalRows - 1);
    nextRow = totalRows;
    nextCol = 0;
  }

  focusCell(view, data.startLine, nextRow, nextCol);
}

export function moveToPrevCell(view: EditorView): void {
  const data = parseTable(view);
  if (!data) return;

  const totalCols = data.alignments.length;
  let prevCol = data.cursorCol - 1;
  let prevRow = data.cursorRow;

  if (prevCol < 0) {
    if (prevRow > 0) {
      prevRow--;
      prevCol = totalCols - 1;
    } else {
      return;
    }
  }

  focusCell(view, data.startLine, prevRow, prevCol);
}

export function moveToNextRow(view: EditorView): void {
  const data = parseTable(view);
  if (!data) return;

  const totalRows = data.rows.length;
  const nextRow = data.cursorRow + 1;

  if (nextRow >= totalRows) {
    addRow(view, totalRows - 1);
  }

  focusCell(view, data.startLine, nextRow, data.cursorCol);
}

function focusCell(view: EditorView, startLine: number, rowIdx: number, colIdx: number): void {
  // Map rowIdx to actual line number in editor:
  // row 0 is startLine. row 1 is startLine + 2 (skip separator line). row N is startLine + 1 + rowIdx.
  const targetLineNum = rowIdx === 0 ? startLine : startLine + 1 + rowIdx;
  if (targetLineNum > view.state.doc.lines) return;

  const line = view.state.doc.line(targetLineNum);
  const text = line.text;

  // Find column pipe
  let pipeCount = 0;
  let cellPos = line.from;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "|") {
      pipeCount++;
      if (pipeCount === colIdx + 1) {
        cellPos = line.from + i + 2; // right after '| '
        break;
      }
    }
  }

  view.dispatch({
    selection: { anchor: Math.min(cellPos, line.to) },
  });
  view.focus();
}

export function insertTable(view: EditorView, cols = 3, rows = 2): void {
  const { state } = view;
  const line = state.doc.lineAt(state.selection.main.from);
  const header = "| " + Array.from({ length: cols }, (_, i) => `Coluna ${i + 1}`).join(" | ") + " |\n";
  const sep = "| " + Array.from({ length: cols }, () => "---").join(" | ") + " |\n";
  const rowLines = Array.from({ length: rows }, () => "| " + Array.from({ length: cols }, () => "Item").join(" | ") + " |\n").join("");
  const table = `${header}${sep}${rowLines}`;
  view.dispatch({
    changes: { from: line.from, to: line.to, insert: table },
    selection: { anchor: line.from + header.length + sep.length + 2 },
  });
  view.focus();
}
