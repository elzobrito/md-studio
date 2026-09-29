import { useSaveStatus } from "../../hooks/useSaveStatus";
import type { SaveStatus } from "../../state/editor";

export interface SaveStatusBadgeProps {
  fileName?: string;
  status?: SaveStatus;
  errorMessage?: string;
}

export function SaveStatusBadge({
  fileName,
  status: propStatus,
  errorMessage: propErrorMessage,
}: SaveStatusBadgeProps) {
  const hookState = useSaveStatus(fileName);

  const status: SaveStatus = propStatus ?? hookState.status;
  const errorMessage = propErrorMessage ?? hookState.errorMessage;

  let label = "Salvo";
  let icon = "✓";
  let className = "status-saved";

  switch (status) {
    case "modified":
      label = "Modificado";
      icon = "●";
      className = "status-modified";
      break;
    case "saving":
      label = "Salvando...";
      icon = "⟳";
      className = "status-saving";
      break;
    case "unsaved":
      label = "Não salvo";
      icon = "○";
      className = "status-unsaved";
      break;
    case "conflicted":
      label = "Conflito de disco";
      icon = "⚡";
      className = "status-conflicted";
      break;
    case "missing":
      label = "Arquivo ausente";
      icon = "∅";
      className = "status-missing";
      break;
    case "error":
      label = "Erro ao salvar";
      icon = "⚠";
      className = "status-error";
      break;
    case "saved":
    default:
      label = "Salvo";
      icon = "✓";
      className = "status-saved";
      break;
  }

  const tooltip =
    (status === "error" || status === "conflicted") && errorMessage
      ? errorMessage
      : label;

  return (
    <span
      className={`save-status-badge ${className}`}
      title={tooltip}
      aria-label={label}
      role="status"
      aria-live="polite"
    >
      <span className="save-status-icon" aria-hidden="true">
        {icon}
      </span>{" "}
      <span className="save-status-text">{label}</span>
    </span>
  );
}
