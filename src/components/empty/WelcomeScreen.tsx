import { RecentFiles } from "../explorer/RecentFiles";
import { Button } from "../ui/Button";
import "../../styles/empty-state.css";

interface Props {
  onOpenFolder: () => void;
  onOpenFile: () => void;
  onOpenRecent: (path: string) => void;
  onNewDocument?: () => void;
}

export function WelcomeScreen({ onOpenFolder, onOpenFile, onOpenRecent, onNewDocument }: Props) {
  return (
    <div className="empty-state-container welcome-screen" role="region" aria-label="Boas-vindas">
      <div className="empty-state-icon" aria-hidden="true">
        📝
      </div>
      <h1 className="empty-state-title">MD Studio</h1>
      <p className="empty-state-subtitle">Editor Markdown local-first (Tauri)</p>
      <p className="empty-state-hint welcome-tauri-hint">
        Abra pastas e arquivos pelos <strong>diálogos nativos</strong> do sistema. O preview e a
        exportação HTML usam o mesmo pipeline sanitizado — sem enviar documentos à nuvem.
      </p>

      <div className="empty-state-actions">
        <Button
          variant="primary"
          size="md"
          className="empty-state-btn primary"
          onClick={onOpenFolder}
          aria-label="Abrir Pasta"
          icon={<span>📁</span>}
        >
          Abrir Pasta
        </Button>
        <Button
          variant="secondary"
          size="md"
          className="empty-state-btn secondary"
          onClick={onOpenFile}
          aria-label="Abrir Arquivo"
          icon={<span>📄</span>}
        >
          Abrir Arquivo
        </Button>
        {onNewDocument && (
          <Button
            variant="ghost"
            size="md"
            className="empty-state-btn ghost"
            onClick={onNewDocument}
            aria-label="Novo Documento"
            icon={<span>✍️</span>}
          >
            Novo Documento
          </Button>
        )}
      </div>

      <div className="empty-state-recent-box">
        <RecentFiles onOpenFile={onOpenRecent} max={8} />
      </div>

      <p className="empty-state-hint">Dica: Ctrl+P para busca rápida de arquivos</p>
    </div>
  );
}
