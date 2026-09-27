export type DiffLineKind = "context" | "added" | "removed";

export interface HistoryDiffLine {
  kind: DiffLineKind;
  text: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface HistoryDiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: HistoryDiffLine[];
}

export interface HistoryDiffResult {
  hunks: HistoryDiffHunk[];
  stats: {
    added: number;
    removed: number;
    unchanged: number;
  };
  hasDifferences: boolean;
}

/**
 * Algoritmo LCS (Longest Common Subsequence) determinístico para cálculo de diff linha a linha
 * com suporte a agrupamento em hunks com linhas de contexto configuráveis (padrão: 3).
 */
export function computeLineDiff(
  oldText: string,
  newText: string,
  contextLines = 3,
): HistoryDiffResult {
  const oldLines = oldText ? oldText.split(/\r?\n/) : [];
  const newLines = newText ? newText.split(/\r?\n/) : [];

  const n = oldLines.length;
  const m = newLines.length;

  // Se ambos os textos forem idênticos, retorna resultado sem diferenças
  if (oldText === newText) {
    return {
      hunks: [],
      stats: { added: 0, removed: 0, unchanged: n },
      hasDifferences: false,
    };
  }

  // Se um dos lados for vazio
  if (n === 0 && m > 0) {
    const lines: HistoryDiffLine[] = newLines.map((line, idx) => ({
      kind: "added",
      text: line,
      newLineNumber: idx + 1,
    }));
    return {
      hunks: [
        {
          oldStart: 0,
          oldLines: 0,
          newStart: 1,
          newLines: m,
          lines,
        },
      ],
      stats: { added: m, removed: 0, unchanged: 0 },
      hasDifferences: true,
    };
  }

  if (m === 0 && n > 0) {
    const lines: HistoryDiffLine[] = oldLines.map((line, idx) => ({
      kind: "removed",
      text: line,
      oldLineNumber: idx + 1,
    }));
    return {
      hunks: [
        {
          oldStart: 1,
          oldLines: n,
          newStart: 0,
          newLines: 0,
          lines,
        },
      ],
      stats: { added: 0, removed: n, unchanged: 0 },
      hasDifferences: true,
    };
  }

  // Tabela LCS com otimização simples
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (oldLines[i] === newLines[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Reconstrução reversa da sequência de diff
  const allDiffLines: HistoryDiffLine[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      allDiffLines.unshift({
        kind: "context",
        text: oldLines[i - 1],
        oldLineNumber: i,
        newLineNumber: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      allDiffLines.unshift({
        kind: "added",
        text: newLines[j - 1],
        newLineNumber: j,
      });
      j--;
    } else if (i > 0) {
      allDiffLines.unshift({
        kind: "removed",
        text: oldLines[i - 1],
        oldLineNumber: i,
      });
      i--;
    }
  }

  let added = 0;
  let removed = 0;
  let unchanged = 0;

  for (const line of allDiffLines) {
    if (line.kind === "added") added++;
    else if (line.kind === "removed") removed++;
    else unchanged++;
  }

  // Agrupamento em hunks com contexto
  const hunks: HistoryDiffHunk[] = [];
  const changedIndices: number[] = [];
  for (let idx = 0; idx < allDiffLines.length; idx++) {
    if (allDiffLines[idx].kind !== "context") {
      changedIndices.push(idx);
    }
  }

  if (changedIndices.length === 0) {
    return {
      hunks: [],
      stats: { added: 0, removed: 0, unchanged },
      hasDifferences: false,
    };
  }

  // Criar intervalos [start, end] para cada hunk com até `contextLines` antes e depois
  const intervals: Array<[number, number]> = [];
  for (const idx of changedIndices) {
    const start = Math.max(0, idx - contextLines);
    const end = Math.min(allDiffLines.length - 1, idx + contextLines);

    if (intervals.length === 0) {
      intervals.push([start, end]);
    } else {
      const prev = intervals[intervals.length - 1];
      if (start <= prev[1] + 1) {
        // Unir intervalos que se sobrepõem ou são adjacentes
        prev[1] = Math.max(prev[1], end);
      } else {
        intervals.push([start, end]);
      }
    }
  }

  for (const [start, end] of intervals) {
    const hunkLines = allDiffLines.slice(start, end + 1);

    // Calcular oldStart, oldLines, newStart, newLines
    let oldStart = 0;
    let oldLineCount = 0;
    let newStart = 0;
    let newLineCount = 0;

    for (const l of hunkLines) {
      if (l.kind === "context") {
        if (!oldStart && l.oldLineNumber) oldStart = l.oldLineNumber;
        if (!newStart && l.newLineNumber) newStart = l.newLineNumber;
        oldLineCount++;
        newLineCount++;
      } else if (l.kind === "removed") {
        if (!oldStart && l.oldLineNumber) oldStart = l.oldLineNumber;
        oldLineCount++;
      } else if (l.kind === "added") {
        if (!newStart && l.newLineNumber) newStart = l.newLineNumber;
        newLineCount++;
      }
    }

    hunks.push({
      oldStart: oldStart || 1,
      oldLines: oldLineCount,
      newStart: newStart || 1,
      newLines: newLineCount,
      lines: hunkLines,
    });
  }

  return {
    hunks,
    stats: { added, removed, unchanged },
    hasDifferences: added > 0 || removed > 0,
  };
}

/**
 * Formata tamanho em bytes para leitura humana
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Traduz o reason interno para rótulo amigável ao usuário
 */
export function formatHistoryReason(reason: string): string {
  switch (reason) {
    case "before-manual-save":
      return "Salvamento manual";
    case "before-autosave-checkpoint":
      return "Autosave periódico";
    case "pre-restore":
      return "Antes da restauração";
    case "before-save-as-overwrite":
      return "Sobrescrita por Salvar Como";
    default:
      return reason;
  }
}
