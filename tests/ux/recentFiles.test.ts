import { describe, expect, it, beforeEach } from "vitest";
import { recentFilesStore } from "../../src/state/recent-files";

describe("recentFilesStore", () => {
  beforeEach(() => {
    recentFilesStore.clear();
  });

  it("adds and deduplicates files", () => {
    recentFilesStore.add("README.md");
    recentFilesStore.add("docs/guide.md");
    recentFilesStore.add("README.md");

    const files = recentFilesStore.getAll();
    expect(files).toHaveLength(2);
    expect(files[0].path).toBe("README.md");
    expect(files[1].path).toBe("docs/guide.md");
  });

  it("caps maximum recent files count at 20", () => {
    for (let i = 1; i <= 25; i++) {
      recentFilesStore.add(`doc-${i}.md`);
    }

    const files = recentFilesStore.getAll();
    expect(files.length).toBeLessThanOrEqual(20);
    expect(files[0].path).toBe("doc-25.md");
  });

  it("removes files correctly", () => {
    recentFilesStore.add("file1.md");
    recentFilesStore.add("file2.md");
    recentFilesStore.remove("file1.md");

    const files = recentFilesStore.getAll();
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe("file2.md");
  });

  it("clears all recent files", () => {
    recentFilesStore.add("file1.md");
    recentFilesStore.add("file2.md");
    recentFilesStore.clear();

    expect(recentFilesStore.getAll()).toHaveLength(0);
  });
});
