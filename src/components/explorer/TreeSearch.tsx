import { useEffect, useRef } from "react";

interface Props {
  query: string;
  onChange: (q: string) => void;
  onClear: () => void;
}

export function TreeSearch({ query, onChange, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="tree-search-box">
      <span className="tree-search-icon" aria-hidden="true">
        🔍
      </span>
      <input
        ref={inputRef}
        type="text"
        className="tree-search-input"
        placeholder="Filtrar arquivos... (Ctrl+Shift+E)"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onClear();
          }
        }}
        aria-label="Filtrar arquivos da árvore"
      />
      {query && (
        <button
          type="button"
          className="tree-search-clear-btn"
          onClick={onClear}
          title="Limpar filtro (Esc)"
          aria-label="Limpar filtro"
        >
          ✕
        </button>
      )}
    </div>
  );
}
