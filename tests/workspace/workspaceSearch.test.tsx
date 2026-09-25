import { describe, expect, it, vi } from "vitest";
import {
  isPathFenced,
  buildReplacePlan,
  executeReplacePlan,
  type ReplacePlan,
} from "../../src/components/workspace/WorkspaceSearch";
import type { SearchResult } from "../../src/contracts/types";

describe("Workspace Search com Replace All confirmado (MD-V03-020)", () => {
  const sampleResults: SearchResult[] = [
    {
      relativePath: "docs/intro.md",
      line: 10,
      preview: "MD Studio é um editor elegante.",
    },
    {
      relativePath: "docs/intro.md",
      line: 25,
      preview: "Com MD Studio você tem total controle.",
    },
    {
      relativePath: "notes/dirty_file.md",
      line: 3,
      preview: "MD Studio em rascunho.",
    },
    {
      relativePath: "../../../etc/passwd",
      line: 1,
      preview: "root:MD Studio:0:0::/root:/bin/bash",
    },
  ];

  it("path fence: valida caminhos seguros e rejeita tentativas de escape traversal ou absolutos", () => {
    expect(isPathFenced("docs/intro.md")).toBe(true);
    expect(isPathFenced("notes/sub/doc.md")).toBe(true);
    expect(isPathFenced("file.md")).toBe(true);

    // Rejeita tentativas de escape
    expect(isPathFenced("../escape.md")).toBe(false);
    expect(isPathFenced("docs/../../escape.md")).toBe(false);
    expect(isPathFenced("../../../etc/passwd")).toBe(false);
    expect(isPathFenced("/root/file.md")).toBe(false);
    expect(isPathFenced("C:\\Windows\\win.ini")).toBe(false);
  });

  it("buildReplacePlan: exclui arquivo dirty aberto e bloqueia path fora do workspace", () => {
    const dirtyFiles = new Set(["notes/dirty_file.md"]);

    const plan = buildReplacePlan({
      searchResults: sampleResults,
      query: "MD Studio",
      replaceText: "MD Studio v0.3",
      isRegex: false,
      matchCase: true,
      dirtyFiles,
    });

    expect(plan.files.length).toBe(3);

    // docs/intro.md -> eligible
    const eligibleFile = plan.files.find((f) => f.relativePath === "docs/intro.md");
    expect(eligibleFile).toBeDefined();
    expect(eligibleFile?.status).toBe("eligible");
    expect(eligibleFile?.occurrences.length).toBe(2);
    expect(eligibleFile?.occurrences[0].replacedText).toBe("MD Studio v0.3 é um editor elegante.");

    // notes/dirty_file.md -> dirty_excluded
    const dirtyFile = plan.files.find((f) => f.relativePath === "notes/dirty_file.md");
    expect(dirtyFile).toBeDefined();
    expect(dirtyFile?.status).toBe("dirty_excluded");
    expect(dirtyFile?.statusReason).toContain("Arquivo aberto com alterações não salvas");

    // ../../../etc/passwd -> outside_workspace
    const outsideFile = plan.files.find((f) => f.relativePath === "../../../etc/passwd");
    expect(outsideFile).toBeDefined();
    expect(outsideFile?.status).toBe("outside_workspace");
    expect(outsideFile?.statusReason).toContain("fora do fence");

    // Estatísticas
    expect(plan.totalEligibleReplacements).toBe(2);
    expect(plan.totalExcludedReplacements).toBe(2);
  });

  it("Replace All sem confirmação NUNCA grava arquivos", async () => {
    const mockSave = vi.fn();
    const mockIpc = {
      readDocument: vi.fn(),
      saveDocument: mockSave,
    } as any;

    const plan: ReplacePlan = {
      query: "MD Studio",
      replaceText: "Novo",
      isRegex: false,
      matchCase: true,
      files: [
        {
          relativePath: "docs/intro.md",
          status: "eligible",
          occurrences: [
            {
              relativePath: "docs/intro.md",
              line: 1,
              originalText: "MD Studio",
              replacedText: "Novo",
            },
          ],
        },
      ],
      totalEligibleReplacements: 1,
      totalExcludedReplacements: 0,
    };

    const res = await executeReplacePlan({
      plan,
      workspaceId: "ws-1",
      confirmed: false, // NÃO CONFIRMADO
      ipcClient: mockIpc,
    });

    expect(res.success).toBe(false);
    expect(mockSave).not.toHaveBeenCalled();
    expect(res.modifiedFiles).toEqual([]);
    expect(res.skippedFiles).toContain("docs/intro.md");
    expect(res.errors[0].error).toContain("confirmação obrigatória não concedida");
  });

  it("Replace All com confirmação salva apenas arquivos elegíveis via saveDocument", async () => {
    const mockSave = vi.fn().mockResolvedValue({ ok: true, snapshot: {} });
    const mockRead = vi.fn().mockResolvedValue({
      content: "# MD Studio\nTexto com MD Studio.",
      contentHash: "hash-123",
    });

    const mockIpc = {
      readDocument: mockRead,
      saveDocument: mockSave,
    } as any;

    const dirtyFiles = new Set(["notes/dirty_file.md"]);
    const plan = buildReplacePlan({
      searchResults: sampleResults,
      query: "MD Studio",
      replaceText: "MD Studio Pro",
      isRegex: false,
      matchCase: true,
      dirtyFiles,
    });

    const res = await executeReplacePlan({
      plan,
      workspaceId: "ws-1",
      confirmed: true, // CONFIRMADO
      ipcClient: mockIpc,
    });

    expect(res.success).toBe(true);
    // Somente docs/intro.md foi gravado
    expect(res.modifiedFiles).toEqual(["docs/intro.md"]);
    expect(res.skippedFiles).toEqual(
      expect.arrayContaining(["notes/dirty_file.md", "../../../etc/passwd"])
    );

    // Verificação de chamada ao saveDocument
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith({
      workspaceId: "ws-1",
      relativePath: "docs/intro.md",
      expectedHash: "hash-123",
      content: "# MD Studio Pro\nTexto com MD Studio Pro.",
    });
  });
});
