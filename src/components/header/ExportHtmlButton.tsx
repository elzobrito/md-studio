import { Button } from "../ui/Button";

interface Props {
  onExport: () => void;
  disabled?: boolean;
}

export function ExportHtmlButton({ onExport, disabled }: Props) {
  return (
    <Button
      variant="secondary"
      size="sm"
      className="export-html-btn"
      onClick={onExport}
      disabled={disabled}
      title="Exportar HTML"
      aria-label="Exportar HTML"
      icon={
        <span className="export-html-btn-icon" aria-hidden="true">
          ⇩
        </span>
      }
    >
      <span>HTML</span>
    </Button>
  );
}
