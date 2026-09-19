import { useSaveStatus } from "../../hooks/useSaveStatus";

export function SaveStatusBadge(props: { fileName?: string }) {
  const { status, errorMessage } = useSaveStatus(props.fileName);

  let label = "Salvo";
  let icon = "✓";
  let className = "status-saved";

  if (status === "modified") {
    label = "Modificado";
    icon = "●";
    className = "status-modified";
  } else if (status === "saving") {
    label = "Salvando...";
    icon = "⟳";
    className = "status-saving";
  } else if (status === "error") {
    label = "Erro ao salvar";
    icon = "⚠";
    className = "status-error";
  }

  return (
    <span
      className={`save-status-badge ${className}`}
      title={status === "error" && errorMessage ? errorMessage : label}
      aria-label={label}
    >
      <span className="save-status-icon" aria-hidden="true">
        {icon}
      </span>{" "}
      <span className="save-status-text">{label}</span>
    </span>
  );
}
