import { Button } from "../ui/Button";
import "../../styles/empty-state.css";

interface Props {
  onQuickSwitch?: () => void;
  onNewDocument?: () => void;
}

export function EmptyState({ onQuickSwitch, onNewDocument }: Props) {
  return (
    <div
      className="empty-state-container no-file-screen"
      role="region"
      aria-label="Nenhum arquivo selecionado"
    >
      <div className="empty-state-icon" aria-hidden="true">
        📄
      </div>
      <h2 className="empty-state-title">Selecione um arquivo na árvore</h2>
      <p className="empty-state-subtitle">
        ou use{" "}
        <button
          type="button"
          className="empty-state-shortcut-hint"
          onClick={onQuickSwitch}
          title="Abrir busca rápida"
        >
          Ctrl+P
        </button>{" "}
        para buscar
      </p>
      {onNewDocument && (
        <div style={{ marginTop: "16px" }}>
          <Button
            variant="secondary"
            size="md"
            className="empty-state-btn secondary"
            onClick={onNewDocument}
            aria-label="Escrever novo documento"
            icon={<span>✍️</span>}
          >
            Escrever Novo Documento
          </Button>
        </div>
      )}
    </div>
  );
}
