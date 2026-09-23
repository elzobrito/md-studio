import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DraftRecoveryDialog } from "../../src/components/DraftRecoveryDialog";
import { draftKey, listRecoverableDrafts } from "../../src/lib/drafts/recovery";

afterEach(() => localStorage.clear());

describe("draft recovery dialog", () => {
  it("escapes untrusted draft content in its preview", () => {
    localStorage.setItem(draftKey("/root", "note.md"), JSON.stringify({
      content: '<img src=x onerror="alert(1)">', ts: Date.now(),
    }));
    const html = renderToString(<DraftRecoveryDialog drafts={listRecoverableDrafts()} onClose={() => {}} onChange={() => {}} />);
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img src=x");
  });

  it("deletes only the selected local draft", async () => {
    const key = draftKey("/root", "note.md");
    localStorage.setItem(key, JSON.stringify({ content: "private", ts: Date.now() }));
    const onChange = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<DraftRecoveryDialog drafts={listRecoverableDrafts()} onClose={() => {}} onChange={onChange} />));
    const deleteButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "Excluir");
    await act(async () => deleteButton?.click());
    expect(localStorage.getItem(key)).toBeNull();
    expect(onChange).toHaveBeenCalledOnce();
    await act(async () => root.unmount());
  });

  it("reviews expired drafts one at a time when closing", async () => {
    const first = draftKey("/root", "first.md");
    const second = draftKey("/root", "second.md");
    const old = Date.now() - 91 * 24 * 60 * 60 * 1000;
    localStorage.setItem(first, JSON.stringify({ content: "first", ts: old }));
    localStorage.setItem(second, JSON.stringify({ content: "second", ts: old }));
    const onClose = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<DraftRecoveryDialog drafts={listRecoverableDrafts()} onClose={onClose} onChange={() => {}} />));
    const closeButton = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Revisar prazo"));
    await act(async () => closeButton?.click());
    expect(onClose).toHaveBeenCalledOnce();
    expect([first, second]).toContain(onClose.mock.calls[0][0]);
    expect(localStorage.getItem(first)).not.toBeNull();
    expect(localStorage.getItem(second)).not.toBeNull();
    await act(async () => root.unmount());
  });
});
