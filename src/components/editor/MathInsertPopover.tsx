import { useEffect, useState } from "react";
import type { EditorView } from "@codemirror/view";
import {
  insertMath,
  MATH_SYMBOLS,
  type MathFlavor,
  type MathMode,
} from "../../editor/formatting/math";

export interface MathInsertPopoverProps {
  view: EditorView;
  isOpen: boolean;
  onClose: () => void;
}

export function MathInsertPopover({ view, isOpen, onClose }: MathInsertPopoverProps) {
  const [flavor, setFlavor] = useState<MathFlavor>("github");
  const [mode, setMode] = useState<MathMode>("inline");

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const apply = (body?: string) => {
    insertMath(view, { flavor, mode, body });
    onClose();
  };

  return (
    <div
      className="math-insert-popover"
      role="dialog"
      aria-label="Inserir equação"
    >
      <div className="math-insert-row" role="group" aria-label="Sabor da equação">
        <button
          type="button"
          className={`math-insert-chip${flavor === "github" ? " is-active" : ""}`}
          aria-pressed={flavor === "github"}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setFlavor("github")}
        >
          GitHub
        </button>
        <button
          type="button"
          className={`math-insert-chip${flavor === "latex" ? " is-active" : ""}`}
          aria-pressed={flavor === "latex"}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setFlavor("latex")}
        >
          LaTeX
        </button>
      </div>
      <div className="math-insert-row" role="group" aria-label="Modo da equação">
        <button
          type="button"
          className={`math-insert-chip${mode === "inline" ? " is-active" : ""}`}
          aria-pressed={mode === "inline"}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setMode("inline")}
        >
          Inline
        </button>
        <button
          type="button"
          className={`math-insert-chip${mode === "display" ? " is-active" : ""}`}
          aria-pressed={mode === "display"}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setMode("display")}
        >
          Display
        </button>
      </div>
      <div className="math-insert-palette" role="group" aria-label="Paleta de símbolos">
        {MATH_SYMBOLS.map((sym) => (
          <button
            key={sym.id}
            type="button"
            className="math-insert-symbol"
            title={sym.label}
            aria-label={sym.label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => apply(sym.tex)}
          >
            {sym.id === "frac" ? "a/b" : sym.id === "sqrt" ? "√" : sym.tex.replace(/^\\/, "")}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="math-insert-apply"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => apply()}
      >
        Inserir equação
      </button>
    </div>
  );
}
