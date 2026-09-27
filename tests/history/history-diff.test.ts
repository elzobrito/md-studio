import { describe, it, expect } from "vitest";
import {
  computeLineDiff,
  formatBytes,
  formatHistoryReason,
} from "../../src/services/historyDiff";

describe("History Diff Engine", () => {
  it("returns no differences for identical content", () => {
    const text = "Line 1\nLine 2\nLine 3";
    const res = computeLineDiff(text, text);
    expect(res.hasDifferences).toBe(false);
    expect(res.hunks.length).toBe(0);
    expect(res.stats.added).toBe(0);
    expect(res.stats.removed).toBe(0);
    expect(res.stats.unchanged).toBe(3);
  });

  it("handles additions correctly", () => {
    const oldText = "Line 1\nLine 3";
    const newText = "Line 1\nLine 2\nLine 3";
    const res = computeLineDiff(oldText, newText);
    expect(res.hasDifferences).toBe(true);
    expect(res.stats.added).toBe(1);
    expect(res.stats.removed).toBe(0);
    expect(res.hunks.length).toBe(1);
    const addedLine = res.hunks[0].lines.find((l) => l.kind === "added");
    expect(addedLine?.text).toBe("Line 2");
  });

  it("handles deletions correctly", () => {
    const oldText = "Line 1\nLine 2\nLine 3";
    const newText = "Line 1\nLine 3";
    const res = computeLineDiff(oldText, newText);
    expect(res.hasDifferences).toBe(true);
    expect(res.stats.added).toBe(0);
    expect(res.stats.removed).toBe(1);
    expect(res.hunks.length).toBe(1);
    const removedLine = res.hunks[0].lines.find((l) => l.kind === "removed");
    expect(removedLine?.text).toBe("Line 2");
  });

  it("handles modifications (removed + added)", () => {
    const oldText = "Hello World\nKeep this";
    const newText = "Hello MD Studio\nKeep this";
    const res = computeLineDiff(oldText, newText);
    expect(res.hasDifferences).toBe(true);
    expect(res.stats.added).toBe(1);
    expect(res.stats.removed).toBe(1);
  });

  it("handles empty old text (complete new document)", () => {
    const oldText = "";
    const newText = "First line\nSecond line";
    const res = computeLineDiff(oldText, newText);
    expect(res.hasDifferences).toBe(true);
    expect(res.stats.added).toBe(2);
    expect(res.stats.removed).toBe(0);
  });

  it("handles empty new text (completely emptied document)", () => {
    const oldText = "First line\nSecond line";
    const newText = "";
    const res = computeLineDiff(oldText, newText);
    expect(res.hasDifferences).toBe(true);
    expect(res.stats.added).toBe(0);
    expect(res.stats.removed).toBe(2);
  });

  it("formats bytes accurately", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(1048576)).toBe("1.00 MB");
  });

  it("formats history reasons to friendly localized strings", () => {
    expect(formatHistoryReason("before-manual-save")).toBe("Salvamento manual");
    expect(formatHistoryReason("before-autosave-checkpoint")).toBe("Autosave periódico");
    expect(formatHistoryReason("pre-restore")).toBe("Antes da restauração");
  });
});
