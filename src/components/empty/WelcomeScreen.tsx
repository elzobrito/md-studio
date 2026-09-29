import { RecentFiles } from "../explorer/RecentFiles";
import { Button } from "../ui/Button";
import { FolderOpenIcon, FilePlusIcon, EditIcon, MarkdownIcon } from "../icons";
import "../../styles/empty-state.css";

interface Props {
  onOpenFolder: () => void;
  onOpenFile: () => void;
  onOpenRecent: (path: string) => void;
  onNewDocument?: () => void;
}

/**
 * WelcomeScreen for MD Studio R3.
 * Normative reference: 053-nova-gui-R3.md (Tasks 053-K, sections 79-87)
 * Primary CTA: "Abrir Workspace" (local-first folder view).
 */
export function WelcomeScreen({ onOpenFolder, onOpenFile, onOpenRecent, onNewDocument }: Props) {
  return (
    <div className="empty-state-container welcome-screen" role="region" aria-label="Boas-vindas">
      <div className="empty-state-icon" aria-hidden="true" style={{ display: "flex", justifyContent: "center" }}>
        <MarkdownIcon size={44} />
      </div>
      <h1 className="empty-state-title">MD Studio</h1>
      <p className="empty-state-subtitle">Ambiente de Documentação e Engenharia Local-first</p>
      <p className="empty-state-hint welcome-tauri-hint">
        Abra uma pasta local como seu <strong>Workspace</strong> pelos diálogos nativos do sistema.
        O filesystem permanece sua única fonte da verdade, com total privacidade e sem dependências na nuvem.
      </p>

      <div className="empty-state-actions">
        <Button
          variant="primary"
          size="md"
          className="empty-state-btn primary"
          onClick={onOpenFolder}
          aria-label="Abrir Workspace"
          icon={<FolderOpenIcon size={16} />}
        >
          Abrir Workspace
        </Button>
        <Button
          variant="secondary"
          size="md"
          className="empty-state-btn secondary"
          onClick={onOpenFile}
          aria-label="Abrir Arquivo"
          icon={<FilePlusIcon size={16} />}
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
            icon={<EditIcon size={16} />}
          >
            Novo Documento
          </Button>
        )}
      </div>

      <div className="empty-state-recent-box">
        <RecentFiles onOpenFile={onOpenRecent} max={8} />
      </div>

      <p className="empty-state-hint">Dica: Ctrl+P para busca rápida de arquivos • Ctrl+B para barra lateral</p>
    </div>
  );
}
