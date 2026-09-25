import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { DocumentSnapshot, WorkspaceDescriptor } from "../../src/contracts/types";

// MD-BUG-CONFLICT-RELOAD-001: "Recarregar do disco" must load disk content, not the local draft.

const watch = vi.hoisted(() => ({ cb: null as null | ((ev: { relativePath: string }) => void) }));
const disk = vi.hoisted(() => ({ content: "disk v1", hash: "h1", version: 1 }));

vi.mock("../../src/lib/ipc", () => ({
  isTauriRuntime: () => false,
  pickSaveMarkdownFile: vi.fn(async () => null),
  subscribeWorkspaceWatch: vi.fn(async (cb: (ev: { relativePath: string }) => void) => {
    watch.cb = cb;
    return () => {
      watch.cb = null;
    };
  }),
  ipc: {
    openWorkspace: vi.fn(async () => ({ id: "ws-conflict", rootLabel: "/tmp/conflict-ws", kind: "folder" })),
    startWatching: vi.fn(async () => undefined),
    stopWatching: vi.fn(async () => undefined),
    getLaunchPath: vi.fn(async () => null),
    readDocument: vi.fn(
      async (workspaceId: string, relativePath: string): Promise<DocumentSnapshot> => ({
        workspaceId,
        relativePath,
        content: disk.content,
        encoding: "utf-8",
        mtimeMs: disk.version,
        contentHash: disk.hash,
        version: disk.version,
      }),
    ),
  },
}));

import { useDocumentState } from "../../src/state/documentState";
import { settingsStore } from "../../src/state/settings";
import { editorStore } from "../../src/state/editor";
import { loadDraft } from "../../src/lib/drafts/recovery";
import { getBrowserDraftIdentity } from "../../src/lib/browserFs";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const WS: WorkspaceDescriptor = { id: "ws-conflict", rootLabel: "/tmp/conflict-ws", kind: "folder" };

describe("MD-BUG-CONFLICT-RELOAD-001: ConflictDialog 'Recarregar do disco'", () => {
  let container: HTMLDivElement;
  let root: Root;
  let hook: ReturnType<typeof useDocumentState>;

  function Harness() {
    hook = useDocumentState();
    return null;
  }

  async function openDirtyConflict() {
    await act(async () => {
      root.render(<Harness />);
    });
    await act(async () => {
      await hook.openFile(`${WS.rootLabel}/note.md`);
    });
    expect(hook.workspace?.id).toBe(WS.id);
    expect(hook.content).toBe("disk v1");
    // wait for watch subscription (effect on workspace.id)
    await act(async () => {
      await Promise.resolve();
    });
    expect(watch.cb).not.toBeNull();
    await act(async () => {
      hook.setContent("local edit");
    });
    expect(loadDraft(getBrowserDraftIdentity(), "note.md")).toBe("local edit");
    // external change on disk
    disk.content = "disk v2";
    disk.hash = "h2";
    disk.version = 2;
    await act(async () => {
      watch.cb?.({ relativePath: "note.md" });
    });
    expect(hook.conflictPath).toBe("note.md");
  }

  beforeEach(() => {
    localStorage.clear();
    settingsStore.resetToDefaults();
    settingsStore.setAutoSave(false);
    disk.content = "disk v1";
    disk.hash = "h1";
    disk.version = 1;
    watch.cb = null;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    localStorage.clear();
  });

  it("reload shows the disk content, clears dirty state and discards the local draft", async () => {
    await openDirtyConflict();

    await act(async () => {
      await hook.resolveConflict("reload");
    });

    expect(hook.conflictPath).toBeNull();
    expect(hook.content).toBe("disk v2");
    expect(hook.dirty).toBe(false);
    expect(editorStore.getSaveStatus()).toBe("saved");
    expect(loadDraft(getBrowserDraftIdentity(), "note.md")).toBeNull();
  });

  it("keep preserves the local edit and its recovery draft", async () => {
    await openDirtyConflict();

    await act(async () => {
      await hook.resolveConflict("keep");
    });

    expect(hook.conflictPath).toBeNull();
    expect(hook.content).toBe("local edit");
    expect(hook.dirty).toBe(true);
    expect(loadDraft(getBrowserDraftIdentity(), "note.md")).toBe("local edit");
  });
});
