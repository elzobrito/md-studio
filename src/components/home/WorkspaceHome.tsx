import type { WorkspaceDescriptor } from "../../contracts/types";
import { RecentFiles } from "../explorer/RecentFiles";
import { Button } from "../ui/Button";
import { FolderIcon, FolderOpenIcon, FilePlusIcon, EditIcon, SearchIcon, MarkdownIcon } from "../icons";
import "../../styles/empty-state.css";

export interface WorkspaceHomeProps {
  workspace: WorkspaceDescriptor | null;
  onOpenFolder: () => void;
  onOpenFile: () => void;
  onOpenRecent: (path: string) => void;
  onNewDocument: () => void;
  onQuickSwitch: () => void;
}

/**
 * WorkspaceHome surface for MD Studio R3.
 * Normative reference: 053-nova-gui-R3.md (Tasks 053-K, sections 79-87)
 * Serves as the central surface when no document is active.
 * If workspace is active: displays workspace title, readiness, quick actions, and recent files.
 * If no workspace is active: presents local-first welcome with primary CTA 'Abrir Workspace'.
 */
export function WorkspaceHome({
  workspace,
  onOpenFolder,
  onOpenFile,
  onOpenRecent,
  onNewDocument,
  onQuickSwitch,
}: WorkspaceHomeProps) {
  if (!workspace) {
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
        </div>

        <div className="empty-state-recent-box">
          <RecentFiles onOpenFile={onOpenRecent} max={8} />
        </div>

        <p className="empty-state-hint">Dica: Ctrl+P para busca rápida de arquivos • Ctrl+B para barra lateral</p>
      </div>
    );
  }

  return (
    <div className="empty-state-container workspace-home-screen" role="region" aria-label="Workspace Home">
      <div className="empty-state-icon" aria-hidden="true" style={{ display: "flex", justifyContent: "center" }}>
        <FolderIcon size={44} />
      </div>
      <h1 className="empty-state-title">{workspace.rootLabel}</h1>
      <p className="empty-state-subtitle">Workspace Ativo • Local-first</p>
      <p className="empty-state-hint">
        Filesystem conectado e monitorado. Índice de metadados pronto.
      </p>

      <div className="empty-state-actions">
        <Button
          variant="primary"
          size="md"
          className="empty-state-btn primary"
          onClick={onNewDocument}
          aria-label="Novo Documento"
          icon={<EditIcon size={16} />}
        >
          Novo Documento
        </Button>
        <Button
          variant="secondary"
          size="md"
          className="empty-state-btn secondary"
          onClick={onQuickSwitch}
          aria-label="Buscar Arquivos"
          icon={<SearchIcon size={16} />}
        >
          Buscar Arquivos (Ctrl+P)
        </Button>
        <Button
          variant="ghost"
          size="md"
          className="empty-state-btn ghost"
          onClick={onOpenFolder}
          aria-label="Trocar Workspace"
          icon={<FolderOpenIcon size={16} />}
        >
          Trocar Workspace
        </Button>
      </div>

      <div className="empty-state-recent-box">
        <RecentFiles onOpenFile={onOpenRecent} max={8} />
      </div>

      <p className="empty-state-hint">
        Navegue pelos arquivos na barra lateral ou use Ctrl+P para busca rápida.
      </p>
    </div>
  );
}
