import type { EditorView } from "@codemirror/view";

export interface TabularParseResult {
  isTabular: boolean;
  delimiter: "\t" | "," | null;
  rows: string[][];
}

/**
 * Escapa caracteres que quebram tabelas GFM (pipes e quebras de linha).
 */
export function escapeGfmCell(cell: string): string {
  return cell
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

/**
 * Detecta e analisa se um texto de clipboard contém dados tabulares (TSV ou CSV).
 */
export function parseTabularData(text: string): TabularParseResult {
  if (!text || !text.trim()) {
    return { isTabular: false, delimiter: null, rows: [] };
  }

  const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length < 2) {
    return { isTabular: false, delimiter: null, rows: [] };
  }

  // 1. Testar TSV (Tab-Separated Values)
  const tsvRows = rawLines.map((l) => l.split("\t").map((c) => c.trim()));
  const tsvCols = tsvRows[0].length;
  if (tsvCols >= 2 && tsvRows.every((r) => r.length === tsvCols)) {
    return { isTabular: true, delimiter: "\t", rows: tsvRows };
  }

  // 2. Testar CSV simples ou entre aspas
  const csvRows = rawLines.map((l) => parseCsvLine(l));
  const csvCols = csvRows[0].length;
  if (csvCols >= 2 && csvRows.every((r) => r.length === csvCols)) {
    return { isTabular: true, delimiter: ",", rows: csvRows };
  }

  return { isTabular: false, delimiter: null, rows: [] };
}

/**
 * Parser simples de linha CSV respeitando aspas.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Converte matriz de linhas tabulares em tabela GFM formatada.
 */
export function convertTabularToGfm(rows: string[][], hasHeader: boolean): string {
  if (!rows || rows.length === 0) return "";

  const colCount = rows[0].length;
  if (colCount === 0) return "";

  const headerRow = hasHeader
    ? rows[0].map(escapeGfmCell)
    : Array.from({ length: colCount }, (_, i) => `Coluna ${i + 1}`);

  const dataRows = hasHeader ? rows.slice(1) : rows;

  const headerLine = `| ${headerRow.join(" | ")} |`;
  const separatorLine = `| ${Array(colCount).fill("---").join(" | ")} |`;

  const bodyLines = dataRows.map((r) => {
    // Garante que todas as linhas tenham a mesma quantidade de colunas
    const cells = Array.from({ length: colCount }, (_, i) => escapeGfmCell(r[i] || ""));
    return `| ${cells.join(" | ")} |`;
  });

  return [headerLine, separatorLine, ...bodyLines].join("\n");
}

export interface TablePasteModalOptions {
  rows: string[][];
  onConfirm: (gfmTable: string) => void;
  onCancel: () => void;
}

/**
 * Renderiza modal de confirmação e preview para colagem de tabela GFM.
 * Permite alternar se a primeira linha é cabeçalho ou cancelar sem alterar o documento.
 */
export function renderTablePasteModal(options: TablePasteModalOptions): HTMLElement {
  const { rows, onConfirm, onCancel } = options;

  const overlay = document.createElement("div");
  overlay.className = "table-paste-modal-overlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.65)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "9999";

  const modal = document.createElement("div");
  modal.className = "table-paste-modal";
  modal.style.background = "#1e1e2e";
  modal.style.color = "#cdd6f4";
  modal.style.padding = "20px";
  modal.style.borderRadius = "8px";
  modal.style.maxWidth = "600px";
  modal.style.width = "90%";
  modal.style.boxShadow = "0 8px 24px rgba(0,0,0,0.5)";
  modal.style.border = "1px solid #313244";

  const title = document.createElement("h3");
  title.textContent = "Colar Dados Tabulares como Tabela GFM";
  title.style.margin = "0 0 12px 0";
  title.style.fontSize = "16px";
  title.style.color = "#89b4fa";
  modal.appendChild(title);

  // Checkbox de cabeçalho
  let hasHeader = true;
  const checkContainer = document.createElement("label");
  checkContainer.style.display = "flex";
  checkContainer.style.alignItems = "center";
  checkContainer.style.gap = "8px";
  checkContainer.style.margin = "12px 0";
  checkContainer.style.cursor = "pointer";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = hasHeader;

  const checkLabel = document.createElement("span");
  checkLabel.textContent = "A primeira linha contém os cabeçalhos das colunas";

  checkContainer.appendChild(checkbox);
  checkContainer.appendChild(checkLabel);
  modal.appendChild(checkContainer);

  // Preview container
  const previewBox = document.createElement("pre");
  previewBox.style.background = "#181825";
  previewBox.style.padding = "10px";
  previewBox.style.borderRadius = "6px";
  previewBox.style.maxHeight = "200px";
  previewBox.style.overflow = "auto";
  previewBox.style.fontSize = "12px";
  previewBox.style.fontFamily = "monospace";
  previewBox.style.border = "1px solid #313244";
  modal.appendChild(previewBox);

  const updatePreview = () => {
    previewBox.textContent = convertTabularToGfm(rows, hasHeader);
  };
  updatePreview();

  checkbox.onchange = () => {
    hasHeader = checkbox.checked;
    updatePreview();
  };

  // Botões de Ação
  const buttonRow = document.createElement("div");
  buttonRow.style.display = "flex";
  buttonRow.style.justifyContent = "flex-end";
  buttonRow.style.gap = "10px";
  buttonRow.style.marginTop = "16px";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancelar";
  cancelBtn.style.padding = "6px 14px";
  cancelBtn.style.background = "#313244";
  cancelBtn.style.color = "#cdd6f4";
  cancelBtn.style.border = "none";
  cancelBtn.style.borderRadius = "4px";
  cancelBtn.style.cursor = "pointer";
  cancelBtn.onclick = () => {
    overlay.remove();
    onCancel();
  };

  const confirmBtn = document.createElement("button");
  confirmBtn.textContent = "Inserir Tabela GFM";
  confirmBtn.style.padding = "6px 14px";
  confirmBtn.style.background = "#89b4fa";
  confirmBtn.style.color = "#11111b";
  confirmBtn.style.fontWeight = "bold";
  confirmBtn.style.border = "none";
  confirmBtn.style.borderRadius = "4px";
  confirmBtn.style.cursor = "pointer";
  confirmBtn.onclick = () => {
    overlay.remove();
    onConfirm(convertTabularToGfm(rows, hasHeader));
  };

  buttonRow.appendChild(cancelBtn);
  buttonRow.appendChild(confirmBtn);
  modal.appendChild(buttonRow);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  return overlay;
}

/**
 * Trata o evento de colar para dados tabulares no CodeMirror.
 * Retorna true se interceptou os dados tabulares.
 */
export function handleTabularPaste(
  plainText: string,
  view: EditorView,
  showModal = true
): boolean {
  const parsed = parseTabularData(plainText);
  if (!parsed.isTabular) {
    return false;
  }

  const { from, to } = view.state.selection.main;

  if (showModal && typeof document !== "undefined") {
    renderTablePasteModal({
      rows: parsed.rows,
      onConfirm: (gfmTable) => {
        view.dispatch({
          changes: { from, to, insert: gfmTable },
          selection: { anchor: from + gfmTable.length },
        });
        view.focus();
      },
      onCancel: () => {
        // Cancelar o preview não altera o documento
        view.focus();
      },
    });
    return true;
  }

  // Fallback direto sem modal (modo determinístico para testes)
  const gfm = convertTabularToGfm(parsed.rows, true);
  view.dispatch({
    changes: { from, to, insert: gfm },
    selection: { anchor: from + gfm.length },
  });
  return true;
}
