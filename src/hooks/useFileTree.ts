import { useCallback, useEffect, useState } from "react";
import type { WorkspaceDescriptor } from "../contracts/types";
import type { FileTreeNode } from "../types/file-tree";
import { ipc } from "../lib/ipc";

const STORAGE_KEY = "md-studio.file-tree.expanded";

function loadExpandedFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return new Set();
}

function saveExpandedToStorage(expanded: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(expanded)));
  } catch {
    /* ignore */
  }
}

export function useFileTree(workspace: WorkspaceDescriptor | null, activePath?: string) {
  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => loadExpandedFromStorage());
  const [isLoading, setIsLoading] = useState(false);

  const fetchChildren = useCallback(
    async (wsId: string, relPath: string, depth: number): Promise<FileTreeNode[]> => {
      try {
        const entries = await ipc.listEntries(wsId, relPath);
        const nodes: FileTreeNode[] = [];

        // Sort folders first, then files alphabetically
        const sorted = [...entries].sort((a, b) => {
          if (a.kind === b.kind) return a.name.localeCompare(b.name);
          return a.kind === "dir" ? -1 : 1;
        });

        for (const entry of sorted) {
          const isDir = entry.kind === "dir";
          // We focus on markdown files and directories
          if (!isDir && !/\.md$/i.test(entry.name)) continue;

          const node: FileTreeNode = {
            id: entry.relativePath,
            name: entry.name,
            path: entry.relativePath,
            type: isDir ? "folder" : "file",
            depth,
            size: entry.size,
            isExpanded: isDir ? expandedPaths.has(entry.relativePath) : undefined,
            isActive: !isDir && activePath === entry.relativePath,
          };
          nodes.push(node);
        }
        return nodes;
      } catch (err) {
        console.error("Failed to list entries:", err);
        return [];
      }
    },
    [expandedPaths, activePath],
  );

  const loadTreeRecursive = useCallback(
    async (wsId: string, currentExpanded: Set<string>): Promise<FileTreeNode[]> => {
      async function buildNodes(relPath: string, depth: number): Promise<FileTreeNode[]> {
        const entries = await ipc.listEntries(wsId, relPath);
        const sorted = [...entries].sort((a, b) => {
          if (a.kind === b.kind) return a.name.localeCompare(b.name);
          return a.kind === "dir" ? -1 : 1;
        });

        const nodes: FileTreeNode[] = [];
        for (const entry of sorted) {
          const isDir = entry.kind === "dir";
          if (!isDir && !/\.md$/i.test(entry.name)) continue;

          const isExpanded = isDir && currentExpanded.has(entry.relativePath);
          let children: FileTreeNode[] | undefined = undefined;

          if (isDir && isExpanded) {
            children = await buildNodes(entry.relativePath, depth + 1);
          }

          nodes.push({
            id: entry.relativePath,
            name: entry.name,
            path: entry.relativePath,
            type: isDir ? "folder" : "file",
            depth,
            size: entry.size,
            isExpanded,
            isActive: !isDir && activePath === entry.relativePath,
            children,
          });
        }
        return nodes;
      }

      return buildNodes("", 0);
    },
    [activePath],
  );

  const reload = useCallback(async () => {
    if (!workspace) {
      setTree([]);
      return;
    }
    setIsLoading(true);
    try {
      const nodes = await loadTreeRecursive(workspace.id, expandedPaths);
      setTree(nodes);
    } finally {
      setIsLoading(false);
    }
  }, [workspace, expandedPaths, loadTreeRecursive]);

  useEffect(() => {
    void reload();
  }, [workspace?.id, reload]);

  // If active file is in a folder, ensure parent folders are expanded
  useEffect(() => {
    if (!activePath) return;
    const parts = activePath.split("/");
    if (parts.length <= 1) return;

    let changed = false;
    const nextExpanded = new Set(expandedPaths);
    let accum = "";
    for (let i = 0; i < parts.length - 1; i++) {
      accum = accum ? `${accum}/${parts[i]}` : parts[i];
      if (!nextExpanded.has(accum)) {
        nextExpanded.add(accum);
        changed = true;
      }
    }
    if (changed) {
      setExpandedPaths(nextExpanded);
      saveExpandedToStorage(nextExpanded);
    }
  }, [activePath, expandedPaths]);

  const toggleFolder = useCallback(
    async (folderPath: string) => {
      const next = new Set(expandedPaths);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      setExpandedPaths(next);
      saveExpandedToStorage(next);
    },
    [expandedPaths],
  );

  return {
    tree,
    expandedPaths,
    toggleFolder,
    reload,
    isLoading,
  };
}
