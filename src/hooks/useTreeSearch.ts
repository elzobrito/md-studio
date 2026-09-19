import { useMemo, useState } from "react";
import type { FileTreeNode } from "../types/file-tree";

export function useTreeSearch(tree: FileTreeNode[]) {
  const [query, setQuery] = useState("");

  const filteredTree = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tree;

    function filterNode(node: FileTreeNode): FileTreeNode | null {
      if (node.type === "file") {
        return node.name.toLowerCase().includes(q) ? node : null;
      }

      const filteredChildren: FileTreeNode[] = [];
      if (node.children) {
        for (const child of node.children) {
          const res = filterNode(child);
          if (res) filteredChildren.push(res);
        }
      }

      if (filteredChildren.length > 0 || node.name.toLowerCase().includes(q)) {
        return {
          ...node,
          isExpanded: true,
          children: filteredChildren,
        };
      }

      return null;
    }

    const result: FileTreeNode[] = [];
    for (const node of tree) {
      const res = filterNode(node);
      if (res) result.push(res);
    }
    return result;
  }, [tree, query]);

  return {
    query,
    setQuery,
    filteredTree,
    hasResults: filteredTree.length > 0,
  };
}
