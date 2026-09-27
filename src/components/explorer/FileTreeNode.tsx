import type { FileTreeNode as FileTreeNodeType } from "../../types/file-tree";
import type { FileState } from "../../services/fileStateAggregator";
import { formatGitStatusLabel } from "../../services/fileStateAggregator";

interface Props {
  node: FileTreeNodeType;
  depth: number;
  isActive: boolean;
  onOpen: (path: string) => void;
  fileState?: FileState;
}

export function FileTreeNode({ node, depth, isActive, onOpen, fileState }: Props) {
  const indent = depth * 16;

  const isDirty = fileState?.isDirty;
  const gitStatus = fileState?.gitStatus;
  const isGitStaged = fileState?.isGitStaged;
  const healthSeverity = fileState?.healthSeverity;
  const healthSummary = fileState?.healthSummary;

  const gitTooltip = gitStatus ? `Git: ${formatGitStatusLabel(gitStatus, isGitStaged)}` : undefined;
  const healthTooltip =
    healthSummary ??
    (healthSeverity === "error"
      ? "Problemas críticos detectados"
      : healthSeverity === "warning"
        ? "Avisos detectados"
        : undefined);

  return (
    <li
      className={`file-tree-item file-node${isActive ? " is-active" : ""}${node.isInternal ? " is-internal" : ""}${isDirty ? " is-dirty" : ""}`}
      style={{ paddingLeft: `${indent + 18}px` }}
      onClick={() => onOpen(node.path)}
      onDoubleClick={() => onOpen(node.path)}
      title={`${node.name} (${node.path})${node.isInternal ? " [arquivo interno]" : ""}${gitTooltip ? ` • ${gitTooltip}` : ""}${healthTooltip ? ` • ${healthTooltip}` : ""}`}
      data-path={node.path}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen(node.path);
      }}
    >
      <span className="file-tree-icon" aria-hidden="true">
        {node.isInternal ? "⚙️" : "📄"}
      </span>
      <span className="file-tree-name">{node.name}</span>
      {node.isInternal && (
        <span className="file-tree-internal-badge" aria-label="Arquivo interno">
          [interno]
        </span>
      )}
      <span className="file-tree-badges">
        {isDirty && (
          <span
            className="file-tree-badge file-tree-dirty-badge"
            title="Alterações não salvas"
            aria-label="Alterações não salvas"
          >
            ●
          </span>
        )}
        {gitStatus && (
          <span
            className={`file-tree-badge file-tree-git-badge git-${gitStatus.toLowerCase()}${isGitStaged ? " is-staged" : ""}`}
            title={gitTooltip}
            aria-label={gitTooltip}
          >
            {gitStatus}
          </span>
        )}
        {healthSeverity && (
          <span
            className={`file-tree-badge file-tree-health-badge health-${healthSeverity}`}
            title={healthTooltip}
            aria-label={healthTooltip}
          >
            {healthSeverity === "error" ? "⚠️" : healthSeverity === "warning" ? "⚡" : "ℹ️"}
          </span>
        )}
      </span>
      {isActive && (
        <span className="file-tree-active-dot" aria-label="Arquivo ativo">
          ●
        </span>
      )}
    </li>
  );
}

