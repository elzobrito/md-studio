import type { ViewMode } from "../../state/session";

interface Props {
  current: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const OPTIONS: { id: ViewMode; label: string; title: string }[] = [
  { id: "source", label: "Markdown", title: "Ver e editar o código-fonte .md (Ctrl+1)" },
  { id: "preview", label: "Formatado", title: "Ver a versão renderizada (Ctrl+2)" },
  { id: "split", label: "Dividida", title: "Fonte e formatado lado a lado (Ctrl+3)" },
];

export function ViewModeToggle({ current, onChange }: Props) {
  return (
    <div className="view-mode-toggle" role="group" aria-label="Modo de visualização">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={`view-mode-btn${current === opt.id ? " is-active" : ""}`}
          title={opt.title}
          aria-pressed={current === opt.id}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
