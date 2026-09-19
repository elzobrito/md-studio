import { invoke } from "@tauri-apps/api/core";
import type {
  DocumentMetadata,
  WorkspaceStats,
  WikiLink,
  ResolvedWikiLink,
  ReindexReport,
  BacklinkResult,
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
