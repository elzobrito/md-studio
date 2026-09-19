import type { SaveStatus } from "../../state/editor";

interface Props {
  status: SaveStatus;
  onSave: () => void;
  disabled?: boolean;
  errorMessage?: string;
}

export function SaveButton({ status, onSave, disabled, errorMessage }: Props) {
  let label = "Salvar";
  let icon = "✓";

  if (status === "modified") {
    label = "Salvar";
    icon = "●";
  } else if (status === "saving") {
    label = "Salvando...";
    icon = "⟳";
  } else if (status === "error") {
    label = "Erro";
    icon = "⚠";
  }

  const title =
    status === "error" && errorMessage
      ? `Erro ao salvar: ${errorMessage}`
      : status === "modified"
        ? "Salvar alterações (Ctrl+S)"
        : "Documento salvo";

  return (
    <button
      type="button"
      className={`save-btn ${status}`}
      onClick={onSave}
      disabled={disabled || status === "saving"}
      title={title}
      aria-label={label}
    >
      <span className="save-btn-icon" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
