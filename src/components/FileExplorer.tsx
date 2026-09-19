import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ipc, isTauriRuntime, pickFolder, pickMarkdownFile } from "../lib/ipc";
import { supportsDirectoryPicker } from "../lib/browserFs";
import type { FileEntry, WorkspaceDescriptor } from "../contracts/types";
import { FileTree } from "./explorer/FileTree";
import { WorkspaceHeader } from "./explorer/WorkspaceHeader";
import { TreeSearch } from "./explorer/TreeSearch";
import { RecentFiles } from "./explorer/RecentFiles";
import { Button } from "./ui/Button";
import { useFileTree } from "../hooks/useFileTree";
import { useTreeSearch } from "../hooks/useTreeSearch";

function parentRel(dir: string): string {
  if (!dir) return "";
  const i = dir.lastIndexOf("/");
  return i <= 0 ? "" : dir.slice(0, i);
}

function isMarkdownName(name: string): boolean {
  return /\.(md|markdown|mdx)$/i.test(name);
}

export function FileExplorer(props: {
  workspace: WorkspaceDescriptor | null;
  onOpenRelative: (path: string) => void | Promise<unknown>;
  onOpenRecent?: (path: string) => void | Promise<unknown>;
  onOpenFolder: (absolutePath: string) => Promise<unknown>;
  onOpenFile: (absolutePath: string) => Promise<unknown>;
  onWorkspaceReady: () => Promise<unknown>;
  query: string;
  onQuery: (q: string) => void;
  activePath: string;
}) {
  const { tree, toggleFolder, reload, isLoading } = useFileTree(
    props.workspace,
    props.activePath,
  );
  const {
    query: treeQuery,
    setQuery: setTreeQuery,
    filteredTree,
  } = useTreeSearch(tree);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [cwd, setCwd] = useState(""); // relative dir inside workspace
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const listGen = useRef(0);
  const tauri = isTauriRuntime();
  const canPickDir = tauri || supportsDirectoryPicker();
  const workspaceId = props.workspace?.id ?? "";

  const refresh = useCallback(async (ws: WorkspaceDescriptor, dir: string) => {
    const gen = ++listGen.current;
    try {
      const list = await ipc.listEntries(ws.id, dir || "");
      // Ignore stale responses so concurrent navigations never append/mix lists.
      if (gen !== listGen.current) return;
      setEntries(list);
    } catch (e) {
      if (gen !== listGen.current) return;
      setEntries([]);
      setHint(e instanceof Error ? e.message : "Falha ao listar pasta");
    }
  }, []);

  // Workspace change: always reset to root and replace the list.
  useEffect(() => {
    listGen.current += 1;
    setCwd("");
    setEntries([]);
    setHint(null);
    if (props.workspace) {
      void refresh(props.workspace, "");
    }
  }, [workspaceId, props.workspace, refresh]);

  // Directory navigation within the same workspace.
  useEffect(() => {
    if (!props.workspace) return;
    void refresh(props.workspace, cwd);
  }, [cwd, workspaceId, props.workspace, refresh]);

  const crumbs = useMemo(() => {
    if (!cwd) return [] as string[];
    return cwd.split("/").filter(Boolean);
  }, [cwd]);

  const handleOpenFolder = async () => {
    setBusy(true);
    setHint(null);
    try {
      const result = await pickFolder();
      if (!result.ok) {
        setHint(result.reason === "cancel" ? "Seleção cancelada." : "Seu browser não suporta escolher pasta.");
        return;
      }
      listGen.current += 1;
      setEntries([]);
      setCwd("");
      if (result.source === "tauri") {
        await props.onOpenFolder(result.pathOrLabel);
      } else {
        await props.onWorkspaceReady();
      }
      if (result.source === "demo") {
        setHint("Demo local (sem API de pasta). No Chrome/Edge use Abrir pasta para o disco real.");
      } else if (result.source === "browser-fs") {
        setHint(`Pasta: ${result.pathOrLabel}. Clique em pastas para entrar, em arquivos para abrir.`);
      }
    } catch (e) {
      setHint(e instanceof Error ? e.message : "Erro ao abrir pasta");
    } finally {
      setBusy(false);
    }
  };

  const handleOpenFile = async () => {
    setBusy(true);
    setHint(null);
    try {
      const result = await pickMarkdownFile();
      if (!result.ok) {
        setHint(result.reason === "cancel" ? "Seleção cancelada." : "Não foi possível abrir o arquivo.");
        return;
      }
      if (result.source === "tauri") {
        await props.onOpenFile(result.pathOrLabel);
      } else {
        await props.onWorkspaceReady();
        const name = result.pathOrLabel.includes("/")
          ? result.pathOrLabel.split("/").pop()!
          : result.pathOrLabel;
        await props.onOpenRelative(name === "demo-workspace" ? "README.md" : name);
      }
      setCwd("");
    } catch (e) {
      setHint(e instanceof Error ? e.message : "Erro ao abrir arquivo");
    } finally {
      setBusy(false);
    }
  };

  const onEntryClick = (e: FileEntry) => {
    const rel = (e.relativePath || e.name || "").replace(/\\/g, "/");
    if (!rel) {
      setHint("Caminho do item inválido.");
      return;
    }
    if (e.kind === "dir") {
      setHint(null);
      setCwd(rel);
      return;
    }
    setHint(null);
    void Promise.resolve(props.onOpenRelative(rel)).catch((err) => {
      setHint(err instanceof Error ? err.message : "Falha ao abrir arquivo");
    });
    if (!isMarkdownName(e.name)) {
      setHint(`Aberto: ${e.name} (não é Markdown — exibido como texto).`);
    }
  };

  const filtered = entries.filter(
    (e) => !props.query || e.name.toLowerCase().includes(props.query.toLowerCase()),
  );

  const workspaceName = props.workspace
    ? props.workspace.rootLabel.split("/").filter(Boolean).pop() || "workspace"
    : "Arquivos";

  return (
    <div className="file-explorer">
      {props.workspace ? (
        <WorkspaceHeader
          workspaceName={workspaceName}
          workspacePath={props.workspace.rootLabel}
          onReindex={() => void reload()}
          onOpenDifferent={() => void handleOpenFolder()}
          onOpenFile={() => void handleOpenFile()}
        />
      ) : (
        <div className="panel-header">
          <h2>Arquivos</h2>
        </div>
      )}

      {!props.workspace && (
        <div className="open-actions">
          <Button
            variant="primary"
            size="md"
            fullWidth
            icon={<span>📁</span>}
            onClick={() => void handleOpenFolder()}
            disabled={busy}
            aria-label="Abrir pasta"
          >
            Abrir pasta
          </Button>
          <Button
            variant="secondary"
            size="md"
            fullWidth
            icon={<span>📄</span>}
            onClick={() => void handleOpenFile()}
            disabled={busy}
            aria-label="Abrir arquivo Markdown"
          >
            Abrir arquivo
          </Button>
        </div>
      )}

      {!tauri && (
        <p className="banner banner-info" role="status">
          {canPickDir ? (
            <>
              No <strong>Chrome/Edge</strong>, <strong>Abrir pasta</strong> usa o seletor real do
              sistema. Clique em pastas para entrar e em arquivos para abrir.
            </>
          ) : (
            <>
              Este browser não expõe seletor de pasta. Use Chrome/Edge, ou o app nativo.
            </>
          )}
        </p>
      )}

      {props.workspace && (
        <TreeSearch
          query={treeQuery}
          onChange={setTreeQuery}
          onClear={() => setTreeQuery("")}
        />
      )}

      {hint && (
        <p className="banner banner-muted" role="status">
          {hint}
        </p>
      )}

      <div className="file-list-wrap">
        {!props.workspace && (
          <RecentFiles
            onOpenFile={(path) => {
              const handler = props.onOpenRecent ?? props.onOpenRelative;
              void Promise.resolve(handler(path)).catch((err) => {
                setHint(err instanceof Error ? err.message : "Falha ao abrir arquivo");
              });
            }}
            max={5}
          />
        )}
        {props.workspace && (
          <>
            <FileTree
              tree={filteredTree}
              activePath={props.activePath}
              onToggleFolder={toggleFolder}
              onOpenFile={(path) => {
                void Promise.resolve(props.onOpenRelative(path)).catch((err) => {
                  setHint(err instanceof Error ? err.message : "Falha ao abrir arquivo");
                });
              }}
              isLoading={isLoading}
            />
            <RecentFiles
              onOpenFile={(path) => {
                const handler = props.onOpenRecent ?? props.onOpenRelative;
                void Promise.resolve(handler(path)).catch((err) => {
                  setHint(err instanceof Error ? err.message : "Falha ao abrir arquivo");
                });
              }}
              max={5}
            />
          </>
        )}
      </div>
    </div>
  );
}
