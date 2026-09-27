import { describe, it, expect } from "vitest";
import {
  aggregateFileStates,
  formatGitStatusLabel,
} from "../../src/services/fileStateAggregator";
import type { GitFileStatus } from "../../src/contracts/types";
import type { HealthIssue } from "../../src/services/workspaceHealth";

describe("File State Aggregator", () => {
  it("aggregates git statuses correctly", () => {
    const gitStatuses: GitFileStatus[] = [
      { path: "notes/doc1.md", status: "M", isStaged: false },
      { path: "notes/doc2.md", status: "A", isStaged: true },
    ];

    const map = aggregateFileStates({ gitStatuses });
    const s1 = map.get("notes/doc1.md");
    expect(s1?.gitStatus).toBe("M");
    expect(s1?.isGitStaged).toBe(false);

    const s2 = map.get("notes/doc2.md");
    expect(s2?.gitStatus).toBe("A");
    expect(s2?.isGitStaged).toBe(true);
  });

  it("aggregates health issues with highest severity priority", () => {
    const healthIssues: HealthIssue[] = [
      {
        id: "1",
        path: "doc.md",
        category: "broken_link",
        severity: "error",
        message: "Link quebrado",
        provider: "doctor",
      },
      {
        id: "2",
        path: "doc.md",
        category: "todo",
        severity: "warning",
        message: "TODO pendente",
        provider: "todo",
      },
    ];

    const map = aggregateFileStates({ healthIssues });
    const state = map.get("doc.md");
    expect(state?.healthSeverity).toBe("error");
    expect(state?.healthIssueCount).toBe(2);
    expect(state?.healthSummary).toContain("1 erro");
  });

  it("aggregates dirty files", () => {
    const map = aggregateFileStates({
      dirtyPaths: ["notes/active.md"],
    });

    const state = map.get("notes/active.md");
    expect(state?.isDirty).toBe(true);
  });

  it("combines git, health, and dirty on the same file", () => {
    const map = aggregateFileStates({
      gitStatuses: [{ path: "combo.md", status: "M", isStaged: false }],
      healthIssues: [
        {
          id: "1",
          path: "combo.md",
          category: "ambiguous_link",
          severity: "warning",
          message: "Aviso",
          provider: "doctor",
        },
      ],
      dirtyPaths: ["combo.md"],
    });

    const state = map.get("combo.md");
    expect(state?.gitStatus).toBe("M");
    expect(state?.healthSeverity).toBe("warning");
    expect(state?.isDirty).toBe(true);
  });

  it("handles normalized paths with backslashes and leading slashes", () => {
    const map = aggregateFileStates({
      dirtyPaths: ["/folder\\doc.md"],
    });

    expect(map.has("folder/doc.md")).toBe(true);
  });

  it("formats git status labels", () => {
    expect(formatGitStatusLabel("M", false)).toBe("Modificado");
    expect(formatGitStatusLabel("A", true)).toBe("[staged] Adicionado");
  });
});
