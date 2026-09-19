import { useState, useEffect, useCallback } from "react";
import type { DocumentMetadata, WorkspaceStats, WikiLink, ReindexReport } from "../types/metadata";
import * as metadataIpc from "../lib/ipc/metadata";

export function useMetadata(currentPath?: string) {
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [currentDocMetadata, setCurrentDocMetadata] = useState<DocumentMetadata | null>(null);
  const [allDocs, setAllDocs] = useState<DocumentMetadata[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [wikiLinks, setWikiLinks] = useState<WikiLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      const s = await metadataIpc.getWorkspaceStats();
      setStats(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const refreshTags = useCallback(async () => {
    try {
      const t = await metadataIpc.getTags();
      setTags(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const refreshAllDocs = useCallback(async () => {
    try {
      const docs = await metadataIpc.getAllDocuments();
      setAllDocs(docs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const refreshCurrentDoc = useCallback(async (path: string) => {
    try {
      const meta = await metadataIpc.getDocumentMetadata(path);
      setCurrentDocMetadata(meta);
      const links = await metadataIpc.getWikiLinksFor(path);
      setWikiLinks(links);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const reindex = useCallback(async (): Promise<ReindexReport | null> => {
    setLoading(true);
    setError(null);
    try {
      const report = await metadataIpc.triggerReindex();
      await refreshStats();
      await refreshTags();
      await refreshAllDocs();
      if (currentPath) {
        await refreshCurrentDoc(currentPath);
      }
      return report;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentPath, refreshStats, refreshTags, refreshAllDocs, refreshCurrentDoc]);

  useEffect(() => {
    void refreshStats();
    void refreshTags();
    void refreshAllDocs();
  }, [refreshStats, refreshTags, refreshAllDocs]);

  useEffect(() => {
    if (currentPath) {
      void refreshCurrentDoc(currentPath);
    } else {
      setCurrentDocMetadata(null);
      setWikiLinks([]);
    }
  }, [currentPath, refreshCurrentDoc]);

  return {
    stats,
    currentDocMetadata,
    allDocs,
    tags,
    wikiLinks,
    loading,
    error,
    refreshStats,
    refreshTags,
    refreshAllDocs,
    reindex,
  };
}
