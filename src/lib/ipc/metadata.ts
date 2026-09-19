import { invoke } from "@tauri-apps/api/core";
import type { DocumentMetadata, WorkspaceStats, WikiLink, ReindexReport } from "../../types/metadata";

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

export const getTags = async (): Promise<string[]> => {
  if (!isTauri()) return [];
  return invoke("get_tags");
};
