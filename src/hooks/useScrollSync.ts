import { useEffect, useRef, useState, useCallback } from "react";

export interface UseScrollSyncOptions {
  enabled?: boolean;
}

export function useScrollSync(options: UseScrollSyncOptions = {}) {
  const [syncEnabled, setSyncEnabled] = useState(options.enabled ?? true);
  const [editorScroller, setEditorScroller] = useState<HTMLElement | null>(null);
  const [previewScroller, setPreviewScroller] = useState<HTMLElement | null>(null);
  const isSyncingRef = useRef<"editor" | "preview" | null>(null);

  const toggleSync = useCallback(() => {
    setSyncEnabled((prev) => !prev);
  }, []);

  useEffect(() => {
    if (options.enabled !== undefined) setSyncEnabled(options.enabled);
  }, [options.enabled]);

  useEffect(() => {
    if (!syncEnabled || !editorScroller || !previewScroller) return;

    let timeoutId: number;

    const handleEditorScroll = () => {
      if (isSyncingRef.current === "preview") return;
      isSyncingRef.current = "editor";

      const maxEditorScroll = editorScroller.scrollHeight - editorScroller.clientHeight;
      const maxPreviewScroll = previewScroller.scrollHeight - previewScroller.clientHeight;

      if (maxEditorScroll > 0 && maxPreviewScroll > 0) {
        const percentage = editorScroller.scrollTop / maxEditorScroll;
        previewScroller.scrollTop = percentage * maxPreviewScroll;
      }

      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (isSyncingRef.current === "editor") {
          isSyncingRef.current = null;
        }
      }, 50);
    };

    const handlePreviewScroll = () => {
      if (isSyncingRef.current === "editor") return;
      isSyncingRef.current = "preview";

      const maxEditorScroll = editorScroller.scrollHeight - editorScroller.clientHeight;
      const maxPreviewScroll = previewScroller.scrollHeight - previewScroller.clientHeight;

      if (maxEditorScroll > 0 && maxPreviewScroll > 0) {
        const percentage = previewScroller.scrollTop / maxPreviewScroll;
        editorScroller.scrollTop = percentage * maxEditorScroll;
      }

      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (isSyncingRef.current === "preview") {
          isSyncingRef.current = null;
        }
      }, 50);
    };

    editorScroller.addEventListener("scroll", handleEditorScroll, { passive: true });
    previewScroller.addEventListener("scroll", handlePreviewScroll, { passive: true });

    return () => {
      editorScroller.removeEventListener("scroll", handleEditorScroll);
      previewScroller.removeEventListener("scroll", handlePreviewScroll);
      window.clearTimeout(timeoutId);
      isSyncingRef.current = null;
    };
  }, [syncEnabled, editorScroller, previewScroller]);

  return {
    syncEnabled,
    setSyncEnabled,
    toggleSync,
    setEditorScroller,
    setPreviewScroller,
  };
}
