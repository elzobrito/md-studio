import { useEffect, useRef } from "react";
import type { FileTreeNode as FileTreeNodeType } from "../../types/file-tree";
import type { FileState } from "../../services/fileStateAggregator";
import { FileTreeNode } from "./FileTreeNode";
import { FileTreeFolder } from "./FileTreeFolder";
import "../../styles/file-tree.css";

interface Props {
  tree: FileTreeNodeType[];
  activePath?: string;
  onToggleFolder: (path: string) => void;
  onOpenFile: (path: string) => void;
  isLoading?: boolean;
  fileStates?: Map<string, FileState>;
}

export function FileTree({ tree, activePath, onToggleFolder, onOpenFile, isLoading, fileStates }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activePath || !containerRef.current) return;
    const escapePath =
      typeof CSS !== "undefined" && CSS.escape ? CSS.escape(activePath) : activePath;
    const activeEl = containerRef.current.querySelector(
      `[data-path="${escapePath}"]`,
    ) as HTMLElement | null;
    if (activeEl && containerRef.current) {
      const container = containerRef.current;
      const cRect = container.getBoundingClientRect();
      const aRect = activeEl.getBoundingClientRect();
      if (aRect.top < cRect.top) {
        container.scrollTop -= (cRect.top - aRect.top);
      } else if (aRect.bottom > cRect.bottom) {
        container.scrollTop += (aRect.bottom - cRect.bottom);
      }
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
        {tree.map((node) => {
          const normPath = node.path.replace(/\\/g, "/").trim().replace(/^\/+/, "");
          return node.type === "folder" ? (
            <FileTreeFolder
              key={node.id}
              node={node}
              depth={0}
              onToggle={onToggleFolder}
              onFileOpen={onOpenFile}
              fileStates={fileStates}
            />
          ) : (
            <FileTreeNode
              key={node.id}
              node={node}
              depth={0}
              isActive={!!node.isActive}
              onOpen={onOpenFile}
              fileState={fileStates?.get(normPath)}
            />
          );
        })}
      </ul>
    </div>
  );
}
