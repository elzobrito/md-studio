import { useCallback, useEffect, useRef, useState } from "react";
import { ipc, isTauriRuntime, pickSaveMarkdownFile, subscribeWorkspaceWatch } from "../lib/ipc";
import { persistDocument } from "../services/save";
import type { DocumentSnapshot, WorkspaceDescriptor } from "../contracts/types";
import { clearDraft, loadDraft, saveDraft } from "../lib/drafts/recovery";
import { getBrowserDraftIdentity } from "../lib/browserFs";
import { recentFilesStore } from "./recent-files";
import { editorStore } from "./editor";
import { settingsStore } from "./settings";

function basename(p: string): string {
  const parts = p.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || p;
}

function parentDir(p: string): string {
  const norm = p.replace(/\\/g, "/");
  const i = norm.lastIndexOf("/");
  if (i === 0) return "/";
  if (i < 0) return ".";
  return norm.slice(0, i);
}

function draftRoot(ws: WorkspaceDescriptor): string {
  return isTauriRuntime() ? ws.rootLabel : getBrowserDraftIdentity();
}

export function useDocumentState() {
  const [workspace, setWorkspace] = useState<WorkspaceDescriptor | null>(null);
  const [snapshot, setSnapshot] = useState<DocumentSnapshot | null>(null);
  const [content, setContentState] = useState(
    "# MD Studio\n\n1. Clique em **Abrir pasta**\n2. Navegue nas subpastas na lista à esquerda\n3. Abra o `.md` desejado\n",
  );
  const [dirty, setDirty] = useState(false);
  const [conflictPath, setConflictPath] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const relativePathRef = useRef("");
  const workspaceRef = useRef<WorkspaceDescriptor | null>(null);
  const snapshotRef = useRef<DocumentSnapshot | null>(null);
  const contentRef = useRef(content);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef<() => Promise<void>>(async () => {});

  const [diagnostics, setDiagnostics] = useState<string[]>(["Nenhum workspace aberto ainda."]);
  const [relativePath, setRelativePath] = useState("");
  dirtyRef.current = dirty;
  relativePathRef.current = relativePath;
  workspaceRef.current = workspace;
  snapshotRef.current = snapshot;
  contentRef.current = content;

  const [status, setStatus] = useState<"idle" | "loading" | "ready">("idle");

  const clearAutoSaveTimer = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, []);

  const setContent = useCallback(
    (v: string) => {
      setContentState(v);
      contentRef.current = v;
      setDirty(true);
      dirtyRef.current = true;
      editorStore.setSaveStatus("modified");

      const ws = workspaceRef.current;
      const rel = relativePathRef.current;

      // 1. Rascunho imediato no localStorage
      if (ws && rel && !saveDraft(draftRoot(ws), rel, v)) {
        setDiagnostics((previous) => [...previous, "Aviso: rascunho local não pôde ser armazenado"]);
      }

      // 2. Auto-save no disco com debounce se habilitado
      clearAutoSaveTimer();

      const settings = settingsStore.getState();
      if (settings.autoSave && ws?.id && rel && snapshotRef.current) {
        autoSaveTimerRef.current = setTimeout(async () => {
          if (dirtyRef.current && snapshotRef.current && relativePathRef.current === rel) {
            await saveRef.current();
          }
        }, settings.autoSaveDelay ?? 1500);
      }
    },
    [clearAutoSaveTimer],
  );

  /** After browser FS pick or demo, sync workspace descriptor via IPC. */
  const onWorkspaceReady = useCallback(async () => {
    setStatus("loading");
    try {
      const ws = await ipc.openWorkspace("browser");
      setWorkspace(ws);
      setDiagnostics([`Workspace: ${ws.rootLabel}`]);
      setStatus("ready");
      return ws;
    } catch (e) {
      setDiagnostics([`Falha ao preparar workspace: ${e instanceof Error ? e.message : String(e)}`]);
      setStatus("idle");
      throw e;
    }
  }, []);

  const openWorkspacePath = useCallback(async (absolutePath: string) => {
    setStatus("loading");
    try {
      const ws = await ipc.openWorkspace(absolutePath);
      setWorkspace(ws);
      setDiagnostics([`Workspace: ${ws.rootLabel}`]);
      setStatus("ready");
      return ws;
    } catch (e) {
      setDiagnostics([`Falha ao abrir workspace: ${e instanceof Error ? e.message : String(e)}`]);
      setStatus("idle");
      throw e;
    }
  }, []);

  const openRelative = useCallback(
    async (path: string, wsOverride?: WorkspaceDescriptor): Promise<boolean> => {
      clearAutoSaveTimer();
      const clean = (path || "").replace(/\\/g, "/").replace(/^\/+/, "");
      if (!clean) {
        setDiagnostics(["Caminho de arquivo vazio — não foi possível abrir."]);
        return false;
      }
      let ws: WorkspaceDescriptor | null = wsOverride ?? workspace;
      if (!ws) {
        try {
          ws = await ipc.openWorkspace(".");
          setWorkspace(ws);
        } catch (e) {
          setDiagnostics([`Falha ao abrir workspace: ${e instanceof Error ? e.message : String(e)}`]);
          return false;
        }
      }
      setStatus("loading");
      try {
        const snap = await ipc.readDocument(ws.id, clean);
        const draft = loadDraft(draftRoot(ws), clean);
        setSnapshot(snap);
        setRelativePath(clean);
        setContentState(draft ?? snap.content);
        setDirty(!!draft && draft !== snap.content);

        // Store full canonical path in recent files whenever possible
        const fullRecentPath =
          ws.rootLabel && !ws.rootLabel.startsWith("browser")
            ? `${ws.rootLabel.replace(/\/+$/, "")}/${clean}`
            : clean;
        recentFilesStore.add(fullRecentPath, basename(clean));

        editorStore.setSaveStatus(draft && draft !== snap.content ? "modified" : "saved");
        setDiagnostics(
          draft ? [`Aberto: ${clean}`, "Rascunho de recuperação carregado"] : [`Aberto: ${clean}`],
        );
        setStatus("ready");
        return true;
      } catch (e) {
        setDiagnostics([`Falha ao ler ${clean}: ${e instanceof Error ? e.message : String(e)}`]);
        setStatus("ready");
        return false;
      }
    },
    [workspace],
  );

  const openFolder = useCallback(
    async (absolutePath: string) => {
      const ws = await openWorkspacePath(absolutePath);
      try {
        const entries = await ipc.listEntries(ws.id, "");
        const firstMd = entries.find((e) => e.kind === "file" && /\.md$/i.test(e.name));
        if (firstMd) {
          await openRelative(firstMd.relativePath, ws);
        } else {
          setRelativePath("");
          setSnapshot(null);
          setContentState(
            `# ${ws.rootLabel}\n\nPasta aberta. **Entre nas subpastas** na lista (ícone 📂) e abra o \`.md\`.\n`,
          );
          setDirty(false);
          setDiagnostics([`Workspace: ${ws.rootLabel}`, "Navegue pelas pastas à esquerda"]);
        }
      } catch {
        /* list optional */
      }
      return ws;
    },
    [openWorkspacePath, openRelative],
  );

  const openFile = useCallback(
    async (absolutePath: string) => {
      const dir = parentDir(absolutePath);
      const name = basename(absolutePath);
      const ws = await openWorkspacePath(dir);
      const ok = await openRelative(name, ws);
      if (!ok) {
        throw new Error(`Não foi possível ler o arquivo ${name}`);
      }
      return ws;
    },
    [openWorkspacePath, openRelative],
  );

  const openRecent = useCallback(
    async (pathOrName: string) => {
      if (!pathOrName) return;
      const clean = pathOrName.trim();

      // 1. If it's an absolute path (or file:// URL)
      if (clean.startsWith("/") || clean.startsWith("file://")) {
        const filePath = clean.startsWith("file://")
          ? clean.replace(/^file:\/\//, "")
          : clean;
        try {
          await openFile(filePath);
          return;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          setDiagnostics([`Arquivo recente não encontrado: ${filePath} (${msg})`]);
          return;
        }
      }

      // 2. If it's a relative path and we have an active workspace
      if (workspace) {
        try {
          const ok = await openRelative(clean);
          if (ok) return;
        } catch {
          /* try fallback below */
        }
      }

      // 3. Fallback for legacy recent items stored without directory:
      // Search common candidate directories (Downloads, Documents, Documentos, home)
      const candidateDirs = [
        "/home/elzobrito/Downloads",
        "/mnt/backup-ssd/Downloads",
        "/home/elzobrito/Documentos",
        "/home/elzobrito/Documents",
        "/home/elzobrito/desenvolvimento",
        "/home/elzobrito",
      ];

      for (const dir of candidateDirs) {
        const candidate = `${dir}/${clean}`;
        try {
          await openFile(candidate);
          // Upgrade recent file entry to full path
          recentFilesStore.add(candidate, basename(clean));
          return;
        } catch {
          // Continue trying next candidate
        }
      }

      setDiagnostics([`Arquivo recente "${clean}" não foi encontrado no disco.`]);
    },
    [workspace, openFile, openRelative],
  );

  const saveAs = useCallback(async () => {
    clearAutoSaveTimer();
    const defaultName = relativePath ? basename(relativePath) : "documento.md";
    const chosen = await pickSaveMarkdownFile(defaultName);
    if (!chosen) return;

    editorStore.setSaveStatus("saving");
    try {
      const cleanChosen = chosen.replace(/\\/g, "/");
      const dir = parentDir(cleanChosen);
      const name = basename(cleanChosen);

      let ws = workspace;
      if (!ws || dir !== ws.rootLabel) {
        ws = await openWorkspacePath(dir || ".");
      }

      let currentHash = "";
      try {
        const existing = await ipc.readDocument(ws.id, name);
        currentHash = existing.contentHash;
      } catch {
        currentHash = "";
      }

      const result = await ipc.saveDocument({
        workspaceId: ws.id,
        relativePath: name,
        expectedHash: currentHash,
        content,
      });

      if (!result.ok) {
        editorStore.setSaveStatus("error", result.message);
        setDiagnostics([`Falha ao salvar: ${result.code} — ${result.message}`]);
        return;
      }

      if (workspace && relativePath) clearDraft(draftRoot(workspace), relativePath);
      clearDraft(draftRoot(ws), name);

      setSnapshot(result.snapshot);
      snapshotRef.current = result.snapshot;
      setRelativePath(name);
      relativePathRef.current = name;
      setDirty(false);
      dirtyRef.current = false;
      recentFilesStore.add(name);
      editorStore.setSaveStatus("saved");
      setDiagnostics([`Salvo em: ${cleanChosen}`]);
    } catch (e) {
      editorStore.setSaveStatus("error", e instanceof Error ? e.message : String(e));
      setDiagnostics([`Erro ao salvar: ${e instanceof Error ? e.message : String(e)}`]);
    }
  }, [clearAutoSaveTimer, content, relativePath, workspace, openWorkspacePath]);

  const save = useCallback(async () => {
    clearAutoSaveTimer();
    const currentRel = relativePathRef.current;
    const currentSnap = snapshotRef.current;
    const currentContent = contentRef.current;
    if (!currentRel || !currentSnap) {
      return saveAs();
    }
    editorStore.setSaveStatus("saving");
    const root = workspaceRef.current ? draftRoot(workspaceRef.current) : null;
    if (!root) {
      editorStore.setSaveStatus("error", "Workspace indisponível para salvar");
      return;
    }
    const result = await persistDocument(currentSnap, currentContent, root);
    if (!result.ok) {
      editorStore.setSaveStatus("error", result.message);
      setDiagnostics([`Conflito/erro: ${result.code} — ${result.message}`]);
      return;
    }
    setSnapshot(result.snapshot);
    snapshotRef.current = result.snapshot;
    setDirty(false);
    dirtyRef.current = false;
    editorStore.setSaveStatus("saved");
    setDiagnostics(["Salvo"]);
  }, [clearAutoSaveTimer, saveAs]);

  saveRef.current = save;

  const newDocument = useCallback((initialText: string = "") => {
    clearAutoSaveTimer();
    setRelativePath("");
    setSnapshot(null);
    setContentState(initialText);
    setDirty(false);
    editorStore.setSaveStatus("saved");
  }, [clearAutoSaveTimer]);

  const closeFile = useCallback(() => {
    clearAutoSaveTimer();
    setRelativePath("");
    setSnapshot(null);
    setContentState("");
    setDirty(false);
    editorStore.setSaveStatus("saved");
  }, [clearAutoSaveTimer]);

  useEffect(() => {
    return () => {
      clearAutoSaveTimer();
    };
  }, [clearAutoSaveTimer]);


  // Cold start & OS launch: open Markdown path from argv or file manager (Tauri only).
  useEffect(() => {
    if (!isTauriRuntime()) return;
    let cancelled = false;

    // 1. Cold start: open Markdown path from OS / argv
    void (async () => {
      try {
        const path = await ipc.getLaunchPath();
        if (!path || cancelled) return;
        await openFile(path);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setDiagnostics((d) => [...d, `Não foi possível abrir arquivo da linha de comando: ${msg}`]);
        console.error("get_launch_path / openFile failed", e);
      }
    })();

    // 2. Already running: listen for files opened via single-instance
    let cleanup: (() => void) | undefined;
    void (async () => {
      try {
        const { subscribeOpenFile } = await import("../lib/ipc/client");
        cleanup = await subscribeOpenFile(async ({ path }) => {
          if (path && !cancelled) {
            try {
              await openFile(path);
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              setDiagnostics((d) => [...d, `Falha ao abrir arquivo: ${msg}`]);
            }
          }
        });
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, [openFile]);

  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;
    let unsub: (() => void) | undefined;
    void (async () => {
      try {
        await ipc.startWatching(workspace.id);
        unsub = await subscribeWorkspaceWatch((ev) => {
          if (cancelled) return;
          const path = ev.relativePath;
          if (!path) return;
          if (path === relativePathRef.current && dirtyRef.current) {
            setConflictPath(path);
            setDiagnostics((d) => [
              ...d,
              `Conflito: ${path} alterado no disco com edições locais`,
            ]);
          }
        });
      } catch {
        /* watch optional outside Tauri */
      }
    })();
    return () => {
      cancelled = true;
      unsub?.();
      void ipc.stopWatching().catch(() => undefined);
    };
  }, [workspace?.id]);

  const resolveConflict = useCallback(
    async (choice: "reload" | "keep" | "saveAs") => {
      const path = conflictPath;
      setConflictPath(null);
      if (!path) return;
      if (choice === "keep") {
        setDiagnostics((d) => [...d, "Conflito: mantendo edição local"]);
        return;
      }
      if (choice === "reload") {
        await openRelative(path);
        setDirty(false);
        setDiagnostics([`Recarregado do disco: ${path}`]);
        return;
      }
      if (choice === "saveAs") {
        await saveAs();
      }
    },
    [conflictPath, openRelative, saveAs],
  );

  return {
    workspace,
    content,
    setContent,
    dirty,
    diagnostics,
    relativePath,
    status,
    openRelative,
    openFolder,
    openFile,
    openRecent,
    onWorkspaceReady,
    save,
    saveAs,
    newDocument,
    closeFile,
    conflictPath,
    resolveConflict,
  };
}
