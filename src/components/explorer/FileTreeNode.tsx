import type { FileTreeNode as FileTreeNodeType } from "../../types/file-tree";

interface Props {
  node: FileTreeNodeType;
  depth: number;
  isActive: boolean;
  onOpen: (path: string) => void;
}

export function FileTreeNode({ node, depth, isActive, onOpen }: Props) {
  const indent = depth * 16;

  return (
    <li
      className={`file-tree-item file-node${isActive ? " is-active" : ""}`}
      style={{ paddingLeft: `${indent + 18}px` }}
      onClick={() => onOpen(node.path)}
      onDoubleClick={() => onOpen(node.path)}
      title={`${node.name} (${node.path})`}
      data-path={node.path}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen(node.path);
      }}
    >
      <span className="file-tree-icon" aria-hidden="true">
        📄
      </span>
      <span className="file-tree-name">{node.name}</span>
      {isActive && (
        <span className="file-tree-active-dot" aria-label="Arquivo ativo">
          ●
        </span>
      )}
    </li>
  );
}
