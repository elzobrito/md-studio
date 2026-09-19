import { useState } from "react";
import { WorkspaceMenu } from "./WorkspaceMenu";
import "../../styles/workspace-header.css";

interface Props {
  workspaceName: string;
  workspacePath: string;
  onReindex: () => void;
  onOpenDifferent: () => void;
  onOpenFile: () => void;
}

export function WorkspaceHeader({
  workspaceName,
  workspacePath,
  onReindex,
  onOpenDifferent,
  onOpenFile,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="workspace-header">
      <div className="workspace-header-info" title={workspacePath}>
        <span className="workspace-header-icon" aria-hidden="true">
          📁
        </span>
        <div className="workspace-header-text">
          <span className="workspace-header-name">{workspaceName}</span>
          <span className="workspace-header-path">{workspacePath}</span>
        </div>
      </div>

      <div className="workspace-header-actions">
        <button
          type="button"
          className="workspace-action-btn"
          onClick={onReindex}
          title="Reindexar workspace"
          aria-label="Reindexar workspace"
        >
          ↺
        </button>
        <button
          type="button"
          className="workspace-action-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          title="Opções do workspace"
          aria-label="Opções do workspace"
          aria-expanded={menuOpen}
        >
          ⋯
        </button>
      </div>

      <WorkspaceMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenDifferent={onOpenDifferent}
        onOpenFile={onOpenFile}
      />
    </div>
  );
}
