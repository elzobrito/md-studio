import type { EditorView } from "@codemirror/view";

export type MathFlavor = "github" | "latex";
export type MathMode = "inline" | "display";

export const MATH_WRAPS: Record<MathFlavor, Record<MathMode, [string, string]>> = {
  github: { inline: ["$", "$"], display: ["$$", "$$"] },
  latex: { inline: ["\\(", "\\)"], display: ["\\[", "\\]"] },
};

export const MATH_SYMBOLS: { id: string; label: string; tex: string }[] = [
  { id: "frac", label: "fração", tex: "\\frac{a}{b}" },
  { id: "sqrt", label: "raiz", tex: "\\sqrt{x}" },
  { id: "sum", label: "somatório", tex: "\\sum_{i=1}^{n}" },
  { id: "int", label: "integral", tex: "\\int" },
  { id: "alpha", label: "alfa", tex: "\\alpha" },
  { id: "pi", label: "pi", tex: "\\pi" },
  { id: "leq", label: "menor ou igual", tex: "\\leq" },
  { id: "geq", label: "maior ou igual", tex: "\\geq" },
  { id: "neq", label: "diferente", tex: "\\neq" },
];

export function wrapMathBody(body: string, flavor: MathFlavor, mode: MathMode): string {
  const [open, close] = MATH_WRAPS[flavor][mode];
  return `${open}${body}${close}`;
}

export function insertMath(
  view: EditorView,
  options: { flavor: MathFlavor; mode: MathMode; body?: string },
): void {
  const { state } = view;
  const { from, to } = state.selection.main;
  const selected = state.sliceDoc(from, to);
  const inner = options.body ?? (selected.length > 0 ? selected : "x");
  const insert = wrapMathBody(inner, options.flavor, options.mode);
  const openLen = MATH_WRAPS[options.flavor][options.mode][0].length;
  view.dispatch({
    changes: { from, to, insert },
    selection: {
      anchor: from + openLen,
      head: from + openLen + inner.length,
    },
  });
  view.focus();
}
