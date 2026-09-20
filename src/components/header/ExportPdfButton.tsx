import { Button } from "../ui/Button";

interface Props {
  onExport: () => void;
  disabled?: boolean;
}

export function ExportPdfButton({ onExport, disabled }: Props) {
  return (
    <Button
      variant="secondary"
      size="sm"
      className="export-pdf-btn"
      onClick={onExport}
      disabled={disabled}
      title={disabled ? "Nenhum documento aberto para exportar" : "Exportar PDF"}
      aria-label="Exportar PDF"
      icon={
        <span className="export-pdf-btn-icon" aria-hidden="true">
          ⇩
        </span>
      }
    >
      <span>Exportar PDF</span>
    </Button>
  );
}
