import { useEffect, useState } from "react";
import { recentFilesStore, type RecentFile } from "../state/recent-files";

export function useRecentFiles() {
  const [files, setFiles] = useState<RecentFile[]>(() => recentFilesStore.getAll());

  useEffect(() => {
    return recentFilesStore.subscribe(() => {
      setFiles(recentFilesStore.getAll());
    });
  }, []);

  return {
    recentFiles: files,
    addRecent: (path: string, name?: string) => recentFilesStore.add(path, name),
    removeRecent: (path: string) => recentFilesStore.remove(path),
    clearRecent: () => recentFilesStore.clear(),
  };
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes}min`;
  if (hours === 1) return "há 1h";
  if (hours < 24) return `há ${hours}h`;
  if (days === 1) return "ontem";
  return `há ${days}d`;
}
