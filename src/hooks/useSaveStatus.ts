import { useEffect, useState } from "react";
import { editorStore, type SaveStatus } from "../state/editor";
import { isTauriRuntime } from "../lib/ipc";

export function formatWindowTitle(fileName?: string, isDirty?: boolean): string {
  if (!fileName) {
    return "MD Studio";
  }
  if (isDirty) {
    return `MD Studio — ● ${fileName}`;
  }
  return `MD Studio — ${fileName}`;
}

export function useSaveStatus(fileName?: string) {
  const [status, setStatus] = useState<SaveStatus>(editorStore.getSaveStatus());
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    editorStore.getErrorMessage(),
  );

  useEffect(() => {
    return editorStore.subscribe(() => {
      setStatus(editorStore.getSaveStatus());
      setErrorMessage(editorStore.getErrorMessage());
    });
  }, []);

  useEffect(() => {
    const isDirty = status === "modified";
    const title = formatWindowTitle(fileName, isDirty);
    document.title = title;

    if (isTauriRuntime()) {
      import("@tauri-apps/api/window")
        .then(({ getCurrentWindow }) => {
          getCurrentWindow().setTitle(title).catch(() => {});
        })
        .catch(() => {});
    }
  }, [status, fileName]);

  return {
    status,
    errorMessage,
    setSaveStatus: (s: SaveStatus, msg?: string) => editorStore.setSaveStatus(s, msg),
  };
}
