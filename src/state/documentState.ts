import { useCallback, useState } from "react";
import { ipc, pickSaveMarkdownFile } from "../lib/ipc";
import { persistDocument } from "../services/save";
import type { DocumentSnapshot, WorkspaceDescriptor } from "../contracts/types";
import { loadDraft } from "../lib/drafts/recovery";
import { recentFilesStore } from "./recent-files";
import { editorStore } from "./editor";

function basename(p: string): string {
  const parts = p.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || p;
}

function parentDir(p: string): string {
  const norm = p.replace(/\\/g, "/");
  const i = norm.lastIndexOf("/");
  return i <= 0 ? norm : norm.slice(0, i);
}

export function useDocumentState() {
  const [workspace, setWorkspace] = useState<WorkspaceDescriptor | null>(null);
  const [snapshot, setSnapshot] = useState<DocumentSnapshot | null>(null);
  const [content, setContentState] = useState(
    "# MD Studio\n\n1. Clique em **Abrir pasta**\n2. Navegue nas subpastas na lista à esquerda\n3. Abra o `.md` desejado\n",
  );
  const [dirty, setDirty] = useState(false);
  const [diagnostics, setDiagnostics] = useState<string[]>(["Nenhum workspace aberto ainda."]);
  const [relativePath, setRelativePath] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ready">("idle");

  const setContent = useCallback((v: string) => {
    setContentState(v);
    setDirty(true);
    editorStore.setSaveStatus("modified");
  }, []);

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
    async (path: string, wsOverride?: WorkspaceDescriptor) => {
      const clean = (path || "").replace(/\\/g, "/").replace(/^\/+/, "");
      if (!clean) {
        setDiagnostics(["Caminho de arquivo vazio — não foi possível abrir."]);
        return;
      }
      let ws: WorkspaceDescriptor | null = wsOverride ?? workspace;
      if (!ws) {
        ws = await ipc.openWorkspace(".");
        setWorkspace(ws);
      }
      setStatus("loading");
      try {
        const snap = await ipc.readDocument(ws.id, clean);
        const draft = loadDraft(ws.id, clean);
        setSnapshot(snap);
        setRelativePath(clean);
        setContentState(draft ?? snap.content);
        setDirty(!!draft && draft !== snap.content);
        recentFilesStore.add(clean);
        editorStore.setSaveStatus(draft && draft !== snap.content ? "modified" : "saved");
        setDiagnostics(
          draft ? [`Aberto: ${clean}`, "Rascunho de recuperação carregado"] : [`Aberto: ${clean}`],
        );
        setStatus("ready");
      } catch (e) {
        setDiagnostics([`Falha ao ler ${clean}: ${e instanceof Error ? e.message : String(e)}`]);
        setStatus("ready");
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
      await openRelative(name, ws);
      return ws;
    },
    [openWorkspacePath, openRelative],
  );

  const saveAs = useCallback(async () => {
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

      setSnapshot(result.snapshot);
      setRelativePath(name);
      setDirty(false);
      recentFilesStore.add(name);
      editorStore.setSaveStatus("saved");
      setDiagnostics([`Salvo em: ${cleanChosen}`]);
    } catch (e) {
      editorStore.setSaveStatus("error", e instanceof Error ? e.message : String(e));
      setDiagnostics([`Erro ao salvar: ${e instanceof Error ? e.message : String(e)}`]);
    }
  }, [content, relativePath, workspace, openWorkspacePath]);

  const save = useCallback(async () => {
    if (!relativePath || !snapshot) {
      return saveAs();
    }
    editorStore.setSaveStatus("saving");
    const result = await persistDocument(snapshot, content);
    if (!result.ok) {
      editorStore.setSaveStatus("error", result.message);
      setDiagnostics([`Conflito/erro: ${result.code} — ${result.message}`]);
      return;
    }
    setSnapshot(result.snapshot);
    setDirty(false);
    editorStore.setSaveStatus("saved");
    setDiagnostics(["Salvo"]);
  }, [snapshot, content, relativePath, saveAs]);

  const newDocument = useCallback((initialText: string = "") => {
    setRelativePath("");
    setSnapshot(null);
    setContentState(initialText);
    setDirty(false);
    editorStore.setSaveStatus("saved");
  }, []);

  const closeFile = useCallback(() => {
    setRelativePath("");
    setSnapshot(null);
    setContentState("");
    setDirty(false);
    editorStore.setSaveStatus("saved");
  }, []);

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
    onWorkspaceReady,
    save,
    saveAs,
    newDocument,
    closeFile,
  };
}
