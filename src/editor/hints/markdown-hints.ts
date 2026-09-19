export interface HintDefinition {
  pattern: RegExp;
  message: (match: RegExpMatchArray) => string;
}

export const HINT_DEFINITIONS: HintDefinition[] = [
  {
    pattern: /^\*\*(.+?)\*\*/,
    message: () => "Negrito — Ctrl+B",
  },
  {
    pattern: /^_(.+?)_/,
    message: () => "Itálico — Ctrl+I",
  },
  {
    pattern: /^#{1,6}\s/,
    message: (m) => `Cabeçalho nível ${m[0].trim().length}`,
  },
  {
    pattern: /^\[\[(.+?)\]\]/,
    message: (m) => `Wiki Link → ${m[1]}`,
  },
  {
    pattern: /^https?:\/\/\S+/,
    message: () => "Link externo — Ctrl+Click para abrir",
  },
  {
    pattern: /^`(.+?)`/,
    message: () => "Código inline — Ctrl+E",
  },
  {
    pattern: /^> \[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]/,
    message: (m) => `Alerta GitHub: ${m[1]}`,
  },
];

export interface MatchedHint {
  from: number;
  to: number;
  message: string;
}

export function matchHintAtPosition(lineText: string, col: number, lineStartPos: number): MatchedHint | null {
  for (const def of HINT_DEFINITIONS) {
    const isLinePrefix = def.pattern.source.startsWith("^#") || def.pattern.source.startsWith("^>");
    const source = isLinePrefix ? def.pattern.source : def.pattern.source.replace(/^\^/, "");
    const regex = new RegExp(source, "g");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(lineText)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (col >= start && col <= end) {
        return {
          from: lineStartPos + start,
          to: lineStartPos + end,
          message: def.message(match),
        };
      }
    }
  }
  return null;
}
