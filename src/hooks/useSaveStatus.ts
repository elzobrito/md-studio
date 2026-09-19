import { useEffect, useState } from "react";
import { editorStore, type SaveStatus } from "../state/editor";
import { isTauriRuntime } from "../lib/ipc";

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
    const baseName = fileName || "MD Studio";
    let title = "";
    if (status === "modified") {
      title = `● ${baseName} — MD Studio`;
    } else {
      title = `${baseName} — MD Studio`;
    }
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
