import { describe, expect, it } from "vitest";
import { buildBreadcrumb } from "../../src/utils/breadcrumb";

describe("breadcrumb utility", () => {
  it("parses root files correctly", () => {
    const items = buildBreadcrumb("my-project", "README.md");
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ label: "my-project", path: "", type: "workspace" });
    expect(items[1]).toEqual({ label: "README.md", path: "README.md", type: "file" });
  });

  it("parses nested file paths into hierarchical segments", () => {
    const items = buildBreadcrumb("workspace", "docs/architecture/adr-001.md");
    expect(items).toHaveLength(4);
    expect(items[0]).toEqual({ label: "workspace", path: "", type: "workspace" });
    expect(items[1]).toEqual({ label: "docs", path: "docs", type: "folder" });
    expect(items[2]).toEqual({ label: "architecture", path: "docs/architecture", type: "folder" });
    expect(items[3]).toEqual({ label: "adr-001.md", path: "docs/architecture/adr-001.md", type: "file" });
  });
});
