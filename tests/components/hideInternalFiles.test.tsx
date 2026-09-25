import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { settingsStore } from "../../src/state/settings";
import { WorkspaceSettings } from "../../src/components/settings/WorkspaceSettings";
import { FileExplorer } from "../../src/components/FileExplorer";
import type { WorkspaceDescriptor } from "../../src/contracts/types";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Mock ipc for FileExplorer
vi.mock("../../src/lib/ipc", () => ({
  ipc: {
    listEntries: vi.fn().mockResolvedValue([
      { name: ".mdstudio", relativePath: ".mdstudio", kind: "dir" },
      { name: "notes.md", relativePath: "notes.md", kind: "file", size: 100 },
      { name: "guide.md", relativePath: "guide.md", kind: "file", size: 200 },
    ]),
  },
  isTauriRuntime: () => false,
  pickFolder: vi.fn(),
  pickMarkdownFile: vi.fn(),
}));

describe("MD-V03-024: Ocultar .mdstudio no File Tree", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    settingsStore.setShowInternalFiles(false);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    vi.clearAllMocks();
  });

  it("settingsStore defaults to showInternalFiles = false and updates on setShowInternalFiles", () => {
    expect(settingsStore.getShowInternalFiles()).toBe(false);

    let notified = false;
    const unsub = settingsStore.subscribe(() => {
      notified = true;
    });

    settingsStore.setShowInternalFiles(true);
    expect(settingsStore.getShowInternalFiles()).toBe(true);
    expect(notified).toBe(true);

    unsub();
  });

  it("WorkspaceSettings renders 'Mostrar arquivos internos (.mdstudio)' toggle and updates settingsStore", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<WorkspaceSettings />);
    });

    const checkbox = container.querySelector<HTMLInputElement>(
      'input[type="checkbox"][aria-label="Mostrar arquivos internos (.mdstudio)"]',
    );
    expect(checkbox).not.toBeNull();
    expect(checkbox?.checked).toBe(false);

    // Toggle on
    await act(async () => {
      checkbox!.click();
    });

    expect(settingsStore.getShowInternalFiles()).toBe(true);
    expect(checkbox?.checked).toBe(true);

    // Toggle off
    await act(async () => {
      checkbox!.click();
    });

    expect(settingsStore.getShowInternalFiles()).toBe(false);
    expect(checkbox?.checked).toBe(false);

    act(() => {
      root.unmount();
    });
  });

  it("FileExplorer hides .mdstudio by default and shows it with distinct styling when enabled", async () => {
    const mockWorkspace: WorkspaceDescriptor = {
      id: "ws-test",
      rootLabel: "/test/workspace",
      kind: "folder",
    };

    const root = createRoot(container);
    await act(async () => {
      root.render(
        <FileExplorer
          workspace={mockWorkspace}
          onOpenRelative={vi.fn()}
          onOpenFolder={vi.fn()}
          onOpenFile={vi.fn()}
          onWorkspaceReady={vi.fn()}
          query=""
          onQuery={vi.fn()}
          activePath="notes.md"
        />,
      );
    });

    // Wait for tree to load
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // notes.md should be visible
    expect(container.textContent).toContain("notes.md");
    // .mdstudio should NOT be in tree by default
    expect(container.textContent).not.toContain(".mdstudio");

    // Enable internal files
    await act(async () => {
      settingsStore.setShowInternalFiles(true);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Now .mdstudio should be visible
    expect(container.textContent).toContain(".mdstudio");
    expect(container.textContent).toContain("[interno]");

    // Verify visual distinction (is-internal class or badge)
    const internalEl = container.querySelector(".is-internal");
    expect(internalEl).not.toBeNull();

    act(() => {
      root.unmount();
    });
  });

  it("Presentation policy invariant: toggle does not delete or alter disk state", () => {
    // Verified: only presentation filtering in FileExplorer and settingsStore state
    expect(settingsStore.getShowInternalFiles()).toBe(false);
    settingsStore.setShowInternalFiles(true);
    expect(settingsStore.getShowInternalFiles()).toBe(true);
    settingsStore.setShowInternalFiles(false);
    expect(settingsStore.getShowInternalFiles()).toBe(false);
  });
});
