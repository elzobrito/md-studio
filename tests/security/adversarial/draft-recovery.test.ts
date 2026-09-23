import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearDraft, draftKey, listRecoverableDrafts, loadDraft, removeDraftKey, saveDraft,
} from "../../../src/lib/drafts/recovery";
import { getBrowserDraftIdentity, pickRealDirectory } from "../../../src/lib/browserFs";

const DAY = 24 * 60 * 60 * 1000;

describe("local draft recovery and retention", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("uses stable root and relative path, not an ephemeral workspace UUID", () => {
    expect(saveDraft("/canonical/root", "notes/a.md", "not saved")).toBe(true);
    expect(loadDraft("/canonical/root", "notes/a.md")).toBe("not saved");
    expect(loadDraft("/other/root", "notes/a.md")).toBeNull();
    expect(clearDraft("/canonical/root", "notes/a.md")).toBe(true);
    expect(loadDraft("/canonical/root", "notes/a.md")).toBeNull();
  });

  it("finds the same native file after Recent opens its parent as a workspace", () => {
    saveDraft("/root", "notes/a.md", "unsaved");
    expect(draftKey("/root", "notes/a.md")).toBe(draftKey("/root/notes", "a.md"));
    expect(loadDraft("/root/notes", "a.md")).toBe("unsaved");
  });

  it("warns at day 75 and requires manual export before discarding at day 90", () => {
    saveDraft("/root", "a.md", "valuable");
    vi.setSystemTime(Date.now() + 75 * DAY);
    expect(listRecoverableDrafts()[0]).toMatchObject({ expiringSoon: true, expired: false });
    vi.setSystemTime(Date.now() + 15 * DAY);
    expect(loadDraft("/root", "a.md")).toBeNull();
    expect(listRecoverableDrafts()[0]).toMatchObject({ content: "valuable", expired: true });
    expect(removeDraftKey(draftKey("/root", "a.md"))).toBe(true);
    expect(listRecoverableDrafts()).toEqual([]);
  });

  it("keeps legacy drafts visible but never maps them to a new native root", () => {
    localStorage.setItem("md-studio-draft:old-random-uuid:notes/a.md", JSON.stringify({ content: "legacy", ts: Date.now() }));
    expect(loadDraft("/canonical/root", "notes/a.md")).toBeNull();
    expect(listRecoverableDrafts()[0]).toMatchObject({ legacy: true, content: "legacy", relativePath: "notes/a.md" });
    localStorage.setItem("md-studio-draft:v2:%2Froot:notes%2Fa.md", JSON.stringify({ content: "v2", ts: Date.now() }));
    expect(loadDraft("/root", "notes/a.md")).toBeNull();
    expect(listRecoverableDrafts()).toHaveLength(2);
  });

  it("returns failure rather than throwing when storage is unavailable", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    expect(saveDraft("/root", "a.md", "valuable")).toBe(false);
    spy.mockRestore();
  });

  it("isolates browser folder selections with the same visible name", async () => {
    vi.stubGlobal("crypto", { randomUUID: vi.fn().mockReturnValueOnce("first").mockReturnValueOnce("second") });
    vi.stubGlobal("window", { showDirectoryPicker: vi.fn().mockResolvedValue({ name: "docs" }) });
    await pickRealDirectory();
    const first = getBrowserDraftIdentity();
    await pickRealDirectory();
    expect(first).not.toBe(getBrowserDraftIdentity());
    saveDraft(first, "a.md", "from first folder");
    expect(loadDraft(getBrowserDraftIdentity(), "a.md")).toBeNull();
    expect(listRecoverableDrafts()[0]).toMatchObject({ browserSession: true, content: "from first folder" });
  });
});
