import { useState, useEffect, useRef } from "react";
import { editorStore } from "../../state/editor";
import "../../styles/gotoline.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: () => void;
}

export function GoToLine({ isOpen, onClose, onNavigate }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const totalLines = editorStore.getTotalLines();
  const currentLine = editorStore.getCursor().line;

  useEffect(() => {
    if (isOpen) {
      setValue(String(currentLine));
      setError("");
      window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, currentLine]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const lineNum = parseInt(value.trim(), 10);
    if (isNaN(lineNum)) {
      setError("Por favor, digite um número válido.");
      return;
    }
    if (lineNum < 1 || lineNum > totalLines) {
      setError(`Linha fora do intervalo (1 - ${totalLines}).`);
      return;
    }

    onNavigate?.();
    editorStore.goToLine(lineNum);
    onClose();
  };

  return (
    <div
      className="gotoline-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Ir para linha"
    >
      <div className="gotoline-modal">
        <div className="gotoline-header">
          <span>Ir para Linha</span>
          <button
            type="button"
            className="gotoline-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <form className="gotoline-form" onSubmit={handleSubmit}>
          <div className="gotoline-input-row">
            <input
              ref={inputRef}
              type="number"
              min={1}
              max={totalLines}
              className="gotoline-input"
              placeholder={`1 - ${totalLines}`}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError("");
              }}
              aria-label="Número da linha"
            />
            <button type="submit" className="gotoline-btn">
              Ir
            </button>
          </div>

          {error ? (
            <span className="gotoline-error">{error}</span>
          ) : (
            <span className="gotoline-hint">
              Digite um número entre 1 e {totalLines}
            </span>
          )}
        </form>
      </div>
    </div>
  );
}
