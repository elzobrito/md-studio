import type { SaveStatus } from "../../state/editor";
import { Button } from "../ui/Button";

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

  const title = disabled
    ? "Nenhum documento aberto para salvar"
    : status === "error" && errorMessage
      ? `Erro ao salvar: ${errorMessage}`
      : status === "modified"
        ? "Salvar alterações (Ctrl+S)"
        : "Documento salvo";

  return (
    <Button
      variant={status === "modified" ? "primary" : "secondary"}
      size="sm"
      className={`save-btn ${status}`}
      onClick={onSave}
      disabled={disabled || status === "saving"}
      title={title}
      aria-label={label}
      icon={
        <span className="save-btn-icon" aria-hidden="true">
          {icon}
        </span>
      }
    >
      <span>{label}</span>
    </Button>
  );
}
