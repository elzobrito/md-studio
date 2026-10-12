import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const listeners = new Map<string, (event: { payload: unknown }) => void>();
const unlisten = vi.fn();
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (name: string, cb: (event: { payload: unknown }) => void) => {
    listeners.set(name, cb);
    return () => {
      listeners.delete(name);
      unlisten();
    };
  }),
}));

const invoke = vi.fn(async (cmd: string, args?: { path?: string }) => {
  if (cmd === "get_backlinks") {
    return { targetPath: args?.path ?? "", documentCount: 1, occurrenceCount: 1, groups: [] };
  }
  if (cmd === "get_all_documents" || cmd === "get_tags" || cmd === "get_wiki_links_for" || cmd === "get_resolved_wiki_links_for") return [];
  return null;
});
vi.mock("@tauri-apps/api/core", () => ({ invoke: (cmd: string, args?: any) => invoke(cmd, args) }));

import { useMetadata } from "../../src/hooks/useMetadata";
import { INDEX_RECONCILED_EVENT } from "../../src/lib/ipc/metadata";

function Probe({ path }: { path: string }) {
  useMetadata(path);
  return null;
}

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

describe("useMetadata + index:reconciled", () => {
  let root: ReturnType<typeof createRoot> | null = null;
  afterEach(() => {
    if (root) act(() => root?.unmount());
    root = null;
    delete (window as any).__TAURI_INTERNALS__;
    invoke.mockClear();
  });

  it("recarrega os backlinks do documento atual quando a reconciliação termina", async () => {
    (window as any).__TAURI_INTERNALS__ = {};
    const container = document.createElement("div");
    root = createRoot(container);
    await act(async () => {
      root!.render(<Probe path="docs/release/PACKAGING.md" />);
      await flush();
    });
    expect(listeners.has(INDEX_RECONCILED_EVENT)).toBe(true);
    const before = invoke.mock.calls.filter(([c]) => c === "get_backlinks").length;

    await act(async () => {
      listeners.get(INDEX_RECONCILED_EVENT)!({ payload: { added: 1, updated: 0, removed: 0, unchanged: 3 } });
      await flush();
    });
    const calls = invoke.mock.calls.filter(([c]) => c === "get_backlinks");
    expect(calls.length).toBe(before + 1);
    expect(calls.at(-1)?.[1]).toEqual({ path: "docs/release/PACKAGING.md" });

    act(() => root?.unmount());
    root = null;
    expect(unlisten).toHaveBeenCalled();
    expect(listeners.has(INDEX_RECONCILED_EVENT)).toBe(false);
  });
});
