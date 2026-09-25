import { useEffect, useRef } from "react";
import type { FileTreeNode as FileTreeNodeType } from "../../types/file-tree";
import { FileTreeNode } from "./FileTreeNode";
import { FileTreeFolder } from "./FileTreeFolder";
import "../../styles/file-tree.css";

interface Props {
  tree: FileTreeNodeType[];
  activePath?: string;
  onToggleFolder: (path: string) => void;
  onOpenFile: (path: string) => void;
  isLoading?: boolean;
}

export function FileTree({ tree, activePath, onToggleFolder, onOpenFile, isLoading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activePath || !containerRef.current) return;
    const escapePath =
      typeof CSS !== "undefined" && CSS.escape ? CSS.escape(activePath) : activePath;
    const activeEl = containerRef.current.querySelector(
      `[data-path="${escapePath}"]`,
    );
    if (activeEl && typeof activeEl.scrollIntoView === "function") {
      activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activePath, tree]);

  if (isLoading && tree.length === 0) {
    return <div className="file-tree-empty">Carregando arquivos...</div>;
  }

  if (tree.length === 0) {
    return <div className="file-tree-empty">Nenhum arquivo .md encontrado.</div>;
  }

  return (
    <div className="file-tree" ref={containerRef}>
      <ul className="file-tree-list">
        {tree.map((node) =>
          node.type === "folder" ? (
            <FileTreeFolder
              key={node.id}
              node={node}
              depth={0}
              onToggle={onToggleFolder}
              onFileOpen={onOpenFile}
            />
          ) : (
            <FileTreeNode
              key={node.id}
              node={node}
              depth={0}
              isActive={!!node.isActive}
              onOpen={onOpenFile}
            />
          ),
        )}
      </ul>
    </div>
  );
}
