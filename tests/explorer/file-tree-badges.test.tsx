import { describe, expect, it, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
import { FileTreeNode } from "../../src/components/explorer/FileTreeNode";
import { FileTree } from "../../src/components/explorer/FileTree";
import type { FileTreeNode as FileTreeNodeType } from "../../src/types/file-tree";
import type { FileState } from "../../src/services/fileStateAggregator";

describe("File Tree Badges & States (041)", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);

    return () => {
      if (container.parentElement) {
        document.body.removeChild(container);
      }
    };
  });

  const dummyNode: FileTreeNodeType = {
    id: "test-node",
    name: "document.md",
    path: "notes/document.md",
    type: "file",
    depth: 0,
  };

  it("renders clean file tree node when fileState is undefined", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <FileTreeNode
          node={dummyNode}
          depth={0}
          isActive={false}
          onOpen={() => {}}
        />,
      );
    });

    const item = container.querySelector(".file-tree-item");
    expect(item).not.toBeNull();
    expect(container.querySelector(".file-tree-dirty-badge")).toBeNull();
    expect(container.querySelector(".file-tree-git-badge")).toBeNull();
    expect(container.querySelector(".file-tree-health-badge")).toBeNull();
  });

  it("renders dirty badge when file is modified", async () => {
    const fileState: FileState = {
      path: "notes/document.md",
      isDirty: true,
    };

    const root = createRoot(container);
    await act(async () => {
      root.render(
        <FileTreeNode
          node={dummyNode}
          depth={0}
          isActive={false}
          onOpen={() => {}}
          fileState={fileState}
        />,
      );
    });

    const dirtyBadge = container.querySelector(".file-tree-dirty-badge");
    expect(dirtyBadge).not.toBeNull();
    expect(dirtyBadge?.textContent).toBe("●");
    expect(dirtyBadge?.getAttribute("title")).toBe("Alterações não salvas");
  });

  it("renders git status badge with letter and readable tooltip", async () => {
    const fileState: FileState = {
      path: "notes/document.md",
      gitStatus: "M",
      isGitStaged: false,
    };

    const root = createRoot(container);
    await act(async () => {
      root.render(
        <FileTreeNode
          node={dummyNode}
          depth={0}
          isActive={false}
          onOpen={() => {}}
          fileState={fileState}
        />,
      );
    });

    const gitBadge = container.querySelector(".file-tree-git-badge");
    expect(gitBadge).not.toBeNull();
    expect(gitBadge?.textContent).toBe("M");
    expect(gitBadge?.classList.contains("git-m")).toBe(true);
    expect(gitBadge?.getAttribute("title")).toBe("Git: Modificado");
  });

  it("renders health error badge with warning icon and summary", async () => {
    const fileState: FileState = {
      path: "notes/document.md",
      healthSeverity: "error",
      healthIssueCount: 2,
      healthSummary: "2 problema(s) (1 erro(s))",
    };

    const root = createRoot(container);
    await act(async () => {
      root.render(
        <FileTreeNode
          node={dummyNode}
          depth={0}
          isActive={false}
          onOpen={() => {}}
          fileState={fileState}
        />,
      );
    });

    const healthBadge = container.querySelector(".file-tree-health-badge");
    expect(healthBadge).not.toBeNull();
    expect(healthBadge?.textContent).toBe("⚠️");
    expect(healthBadge?.classList.contains("health-error")).toBe(true);
    expect(healthBadge?.getAttribute("title")).toBe("2 problema(s) (1 erro(s))");
  });

  it("combines dirty, git and health badges without conflict", async () => {
    const fileState: FileState = {
      path: "notes/document.md",
      isDirty: true,
      gitStatus: "A",
      isGitStaged: true,
      healthSeverity: "warning",
      healthSummary: "1 aviso(s)",
    };

    const root = createRoot(container);
    await act(async () => {
      root.render(
        <FileTreeNode
          node={dummyNode}
          depth={0}
          isActive={true}
          onOpen={() => {}}
          fileState={fileState}
        />,
      );
    });

    expect(container.querySelector(".file-tree-dirty-badge")).not.toBeNull();
    const gitBadge = container.querySelector(".file-tree-git-badge");
    expect(gitBadge?.textContent).toBe("A");
    expect(gitBadge?.classList.contains("is-staged")).toBe(true);
    expect(container.querySelector(".file-tree-health-badge")).not.toBeNull();
    expect(container.querySelector(".file-tree-active-dot")).not.toBeNull();
  });

  it("FileTree distributes fileStates by normalized path to items", async () => {
    const tree: FileTreeNodeType[] = [
      {
        id: "folder-1",
        name: "docs",
        path: "docs",
        type: "folder",
        depth: 0,
        isExpanded: true,
        children: [
          {
            id: "child-1",
            name: "readme.md",
            path: "docs/readme.md",
            type: "file",
            depth: 1,
          },
        ],
      },
      {
        id: "file-root",
        name: "root.md",
        path: "root.md",
        type: "file",
        depth: 0,
      },
    ];

    const fileStates = new Map<string, FileState>([
      ["docs/readme.md", { path: "docs/readme.md", gitStatus: "M" }],
      ["root.md", { path: "root.md", isDirty: true }],
    ]);

    const root = createRoot(container);
    await act(async () => {
      root.render(
        <FileTree
          tree={tree}
          onToggleFolder={() => {}}
          onOpenFile={() => {}}
          fileStates={fileStates}
        />,
      );
    });

    const rootEl = container.querySelector('[data-path="root.md"]');
    expect(rootEl?.querySelector(".file-tree-dirty-badge")).not.toBeNull();

    const childEl = container.querySelector('[data-path="docs/readme.md"]');
    expect(childEl?.querySelector(".file-tree-git-badge")).not.toBeNull();
  });
});
