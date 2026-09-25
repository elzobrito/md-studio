import { invoke } from "@tauri-apps/api/core";
import type {
  DocumentMetadata,
  WorkspaceStats,
  WikiLink,
  ResolvedWikiLink,
  ReindexReport,
  BacklinkResult,
  DoctorDiagnostic,
} from "../../types/metadata";

export const emptyBacklinks = (path = ""): BacklinkResult => ({
  targetPath: path,
  documentCount: 0,
  occurrenceCount: 0,
  groups: [],
});

const isTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const getWorkspaceStats = async (): Promise<WorkspaceStats> => {
  if (!isTauri()) {
    return {
      totalDocuments: 0,
      totalWords: 0,
      totalLinks: 0,
      totalWikiLinks: 0,
      totalTags: 0,
      uniqueTags: 0,
      totalMermaid: 0,
      totalKatex: 0,
    };
  }
  return invoke("get_workspace_stats");
};

export const getDocumentMetadata = async (path: string): Promise<DocumentMetadata | null> => {
  if (!isTauri()) return null;
  return invoke("get_document_metadata", { path });
};

export const getAllDocuments = async (): Promise<DocumentMetadata[]> => {
  if (!isTauri()) return [];
  return invoke("get_all_documents");
};

export const triggerReindex = async (): Promise<ReindexReport> => {
  if (!isTauri()) {
    return { indexed: 0, skipped: 0, errors: [] };
  }
  return invoke("trigger_reindex");
};

export const getWikiLinksFor = async (path: string): Promise<WikiLink[]> => {
  if (!isTauri()) return [];
  return invoke("get_wiki_links_for", { path });
};

export const resolveWikiLink = async (target: string): Promise<ResolvedWikiLink> => {
  if (!isTauri()) {
    return { target, alias: null, line: 0, status: "unresolved", path: null, candidates: [] };
  }
  return invoke("resolve_wiki_link", { target });
};

export const getResolvedWikiLinksFor = async (path: string): Promise<ResolvedWikiLink[]> => {
  if (!isTauri()) return [];
  return invoke("get_resolved_wiki_links_for", { path });
};

export const getTags = async (): Promise<string[]> => {
  if (!isTauri()) return [];
  return invoke("get_tags");
};

export const getBacklinks = async (path: string): Promise<BacklinkResult> => {
  if (!isTauri()) return emptyBacklinks(path);
  return invoke("get_backlinks", { path });
};

export const getDoctorDiagnostics = async (
  path: string,
  content?: string
): Promise<DoctorDiagnostic[]> => {
  if (!isTauri()) return [];
  const meta = await getDocumentMetadata(path);
  if (!meta) return [];
  const resolvedLinks = await getResolvedWikiLinksFor(path);
  const diags: DoctorDiagnostic[] = [];

  for (const rl of resolvedLinks) {
    if (rl.status === "unresolved") {
      diags.push({
        rule: "broken-wiki-link",
        severity: "warning",
        message: `Wiki Link '[[${rl.target}]]' não encontrado no workspace`,
        path,
        line: rl.line,
        startCol: 0,
        endCol: 0,
        target: rl.target,
      });
    }
  }

  const seen = new Set<string>();
  for (const h of meta.headings) {
    if (seen.has(h.anchor)) {
      diags.push({
        rule: "duplicate-heading-anchor",
        severity: "warning",
        message: `Cabeçalho '${h.text}' gera âncora duplicada '#${h.anchor}'`,
        path,
        line: 1,
        startCol: 0,
        endCol: 0,
        target: h.anchor,
        suggestion: `${h.anchor}-1`,
      });
    } else {
      seen.add(h.anchor);
    }
  }

  if (content) {
    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      const trimmed = line.trim();
      if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
        const info = trimmed.replace(/^[`~]+/, "").trim();
        if (!info) {
          diags.push({
            rule: "unannotated-code-block",
            severity: "info",
            message: "Bloco de código sem especificação de linguagem",
            path,
            line: lineNo,
            startCol: 0,
            endCol: trimmed.length,
            suggestion: "```markdown",
          });
        }
      }

      if (line.includes("![") && line.includes("](") && (line.includes("../") || line.includes("..\\"))) {
        const match = line.match(/!\[.*?\]\((.*?)\)/);
        if (match && match[1].startsWith("../")) {
          diags.push({
            rule: "insecure-asset-path",
            severity: "error",
            message: `Asset '${match[1]}' aponta para fora do workspace`,
            path,
            line: lineNo,
            startCol: 0,
            endCol: line.length,
            target: match[1],
          });
        }
      }
    });
  }

  return diags;
};
