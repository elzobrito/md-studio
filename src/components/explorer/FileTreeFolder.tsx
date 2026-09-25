import type { FileTreeNode as FileTreeNodeType } from "../../types/file-tree";
import { FileTreeNode } from "./FileTreeNode";

interface Props {
  node: FileTreeNodeType;
  depth: number;
  onToggle: (path: string) => void;
  onFileOpen: (path: string) => void;
}

export function FileTreeFolder({ node, depth, onToggle, onFileOpen }: Props) {
  const isExpanded = !!node.isExpanded;
  const indent = depth * 16;

  return (
    <li className={`file-tree-folder-group${node.isInternal ? " is-internal" : ""}`}>
      <div
        className={`file-tree-item folder-node${node.isInternal ? " is-internal" : ""}`}
        style={{ paddingLeft: `${indent + 4}px` }}
        onClick={() => onToggle(node.path)}
        title={`${node.path}${node.isInternal ? " [pasta interna]" : ""}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle(node.path);
          }
        }}
      >
        <span
          className={`file-tree-arrow${isExpanded ? " is-expanded" : ""}`}
          aria-hidden="true"
        >
          ▶
        </span>
        <span className="file-tree-icon" aria-hidden="true">
          {node.isInternal ? "🔒" : isExpanded ? "📂" : "📁"}
        </span>
        <span className="file-tree-name">{node.name}</span>
        {node.isInternal && (
          <span className="file-tree-internal-badge" aria-label="Pasta interna">
            [interno]
          </span>
        )}
      </div>

      {isExpanded && node.children && node.children.length > 0 && (
        <ul className="file-tree-list file-tree-children">
          {node.children.map((child) =>
            child.type === "folder" ? (
              <FileTreeFolder
                key={child.id}
                node={child}
                depth={depth + 1}
                onToggle={onToggle}
                onFileOpen={onFileOpen}
              />
            ) : (
              <FileTreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                isActive={!!child.isActive}
                onOpen={onFileOpen}
              />
            ),
          )}
        </ul>
      )}
    </li>
  );
}
