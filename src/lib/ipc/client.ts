import type {
  DocumentSnapshot,
  FileEntry,
  SaveDocumentRequest,
  SaveResult,
  SearchResult,
  WorkspaceDescriptor,
  WatchEvent,
} from "../../contracts/types";
import {
  getBrowserFsMode,
  getBrowserRootLabel,
  listBrowserEntries,
  pickRealDirectory,
  pickRealMarkdownFile,
  readBrowserFile,
  supportsDirectoryPicker,
  useDemoWorkspace,
  writeBrowserFile,
} from "../browserFs";

/** Thin IPC façade — Tauri invoke, or browser FS Access API / demo. */
export function isTauriRuntime(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & {
    __TAURI_INTERNALS__?: unknown;
    __TAURI__?: unknown;
    isTauri?: boolean;
  };
  return Boolean(w.__TAURI_INTERNALS__ || w.__TAURI__ || w.isTauri);
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauriRuntime()) {
    return browserInvoke<T>(cmd, args);
  }
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

/** Normalize IPC payloads that may arrive snake_case (legacy) or camelCase. */
function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function pickStr(obj: Record<string, unknown>, camel: string, snake: string): string {
  const a = obj[camel];
  const b = obj[snake];
  if (typeof a === "string") return a;
  if (typeof b === "string") return b;
  return "";
}

function normalizeWorkspace(raw: unknown): WorkspaceDescriptor {
  const o = asRecord(raw);
  return {
    id: pickStr(o, "id", "id") || "ws",
    rootLabel: pickStr(o, "rootLabel", "root_label") || "workspace",
    kind: (pickStr(o, "kind", "kind") === "single-file" ? "single-file" : "folder") as
      | "folder"
      | "single-file",
  };
}

function normalizeFileEntry(raw: unknown): FileEntry {
  const o = asRecord(raw);
  const name = pickStr(o, "name", "name");
  const relativePath = pickStr(o, "relativePath", "relative_path") || name;
  const kind = pickStr(o, "kind", "kind") === "dir" ? "dir" : "file";
  const sizeRaw = o.size ?? o["size"];
  const size = typeof sizeRaw === "number" ? sizeRaw : undefined;
  return { name, relativePath, kind, size };
}

function normalizeSnapshot(raw: unknown): DocumentSnapshot {
  const o = asRecord(raw);
  return {
    workspaceId: pickStr(o, "workspaceId", "workspace_id"),
    relativePath: pickStr(o, "relativePath", "relative_path"),
    content: typeof o.content === "string" ? o.content : "",
    encoding: "utf-8",
    mtimeMs: Number(o.mtimeMs ?? o.mtime_ms ?? 0),
    contentHash: pickStr(o, "contentHash", "content_hash"),
    version: Number(o.version ?? 1),
  };
}

export const ipc = {
  openWorkspace: async (path: string) =>
    normalizeWorkspace(await invoke<unknown>("open_workspace", { path })),
  listEntries: async (workspaceId: string, relativePath: string) => {
    const list = await invoke<unknown[]>("list_entries", { workspaceId, relativePath });
    return (Array.isArray(list) ? list : []).map(normalizeFileEntry);
  },
  readDocument: async (workspaceId: string, path: string) =>
    normalizeSnapshot(await invoke<unknown>("read_document", { workspaceId, path })),
  saveDocument: async (req: SaveDocumentRequest): Promise<SaveResult> => {
    const raw = await invoke<unknown>("save_document", { req });
    const o = asRecord(raw);
    if (o.ok === true) {
      return { ok: true, snapshot: normalizeSnapshot(o.snapshot) };
    }
    const codeRaw = pickStr(o, "code", "code");
    const code =
      codeRaw === "HashMismatch" || codeRaw === "OutsideWorkspace" || codeRaw === "IoError"
        ? codeRaw
        : "IoError";
    return {
      ok: false,
      code,
      message: pickStr(o, "message", "message") || "Erro ao salvar",
    };
  },
  searchWorkspace: async (workspaceId: string, query: string) => {
    const list = await invoke<unknown[]>("search_workspace", { workspaceId, query });
    return (Array.isArray(list) ? list : []).map((item) => {
      const o = asRecord(item);
      return {
        relativePath: pickStr(o, "relativePath", "relative_path"),
        line: Number(o.line ?? 0),
        preview: pickStr(o, "preview", "preview"),
      } satisfies SearchResult;
    });
  },
  exportHtml: (html: string, destination: string, overwrite: boolean) =>
    invoke<void>("export_html", { html, destination, overwrite }),
  startWatching: (workspaceId: string) => invoke<void>("start_watching", { workspaceId }),
  stopWatching: () => invoke<void>("stop_watching"),
};

export type PickFolderResult =
  | { ok: true; source: "tauri" | "browser-fs" | "demo"; pathOrLabel: string }
  | { ok: false; reason: "cancel" | "unsupported" };

/** Open folder: Tauri dialog, or Chromium directory picker, or demo. */
export async function pickFolder(): Promise<PickFolderResult> {
  if (isTauriRuntime()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Abrir pasta do workspace",
    });
    if (typeof selected !== "string") return { ok: false, reason: "cancel" };
    return { ok: true, source: "tauri", pathOrLabel: selected };
  }

  if (supportsDirectoryPicker()) {
    const picked = await pickRealDirectory();
    if (!picked) return { ok: false, reason: "cancel" };
    return { ok: true, source: "browser-fs", pathOrLabel: picked.label };
  }

  // Fallback demo tree (no OS picker)
  const demo = useDemoWorkspace();
  return { ok: true, source: "demo", pathOrLabel: demo.label };
}

export async function pickMarkdownFile(): Promise<PickFolderResult> {
  if (isTauriRuntime()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      multiple: false,
      title: "Abrir arquivo Markdown",
      filters: [{ name: "Markdown", extensions: ["md", "markdown", "mdx"] }],
    });
    if (typeof selected !== "string") return { ok: false, reason: "cancel" };
    return { ok: true, source: "tauri", pathOrLabel: selected };
  }

  const real = await pickRealMarkdownFile();
  if (real) {
    return { ok: true, source: "browser-fs", pathOrLabel: real.name };
  }

  const demo = useDemoWorkspace();
  return { ok: true, source: "demo", pathOrLabel: `${demo.label}/README.md` };
}

export async function pickSaveMarkdownFile(defaultName: string = "documento.md"): Promise<string | null> {
  if (isTauriRuntime()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const selected = await save({
      title: "Salvar arquivo Markdown",
      defaultPath: defaultName,
      filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
    });
    return typeof selected === "string" ? selected : null;
  }

  if (typeof window !== "undefined") {
    const name = window.prompt("Salvar arquivo como (.md):", defaultName);
    return name || null;
  }
  return null;
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `h${(h >>> 0).toString(16)}`;
}

const contentHashCache = new Map<string, string>();

async function browserInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (cmd === "open_workspace") {
    // After pickFolder, browser FS already configured; path is label or "browser"
    const label = getBrowserRootLabel() || String(args?.path ?? "workspace");
    const mode = getBrowserFsMode();
    return {
      id: mode === "none" ? "ws-empty" : "ws-browser",
      rootLabel: label,
      kind: "folder",
    } as T;
  }

  if (cmd === "list_entries") {
    const rel = String(args?.relativePath ?? "");
    const list = await listBrowserEntries(rel);
    return list as T;
  }

  if (cmd === "read_document") {
    const path = String(args?.path ?? "");
    const content = await readBrowserFile(path);
    const contentHash = hash(content);
    contentHashCache.set(path, contentHash);
    return {
      workspaceId: String(args?.workspaceId ?? "ws-browser"),
      relativePath: path,
      content,
      encoding: "utf-8",
      mtimeMs: Date.now(),
      contentHash,
      version: 1,
    } as T;
  }

  if (cmd === "save_document") {
    const req = args?.req as SaveDocumentRequest;
    const prev = contentHashCache.get(req.relativePath);
    if (prev && prev !== req.expectedHash) {
      return { ok: false, code: "HashMismatch", message: "Arquivo alterado" } as T;
    }
    await writeBrowserFile(req.relativePath, req.content);
    const contentHash = hash(req.content);
    contentHashCache.set(req.relativePath, contentHash);
    return {
      ok: true,
      snapshot: {
        workspaceId: req.workspaceId,
        relativePath: req.relativePath,
        content: req.content,
        encoding: "utf-8",
        mtimeMs: Date.now(),
        contentHash,
        version: 2,
      },
    } as T;
  }

  if (cmd === "search_workspace") return [] as T;
  if (cmd === "export_html") return undefined as T;
  throw new Error(`browser IPC missing: ${cmd}`);
}

export type { WatchEvent };


/** Subscribe to Rust notify events (`workspace://change`). No-op outside Tauri. */
export async function subscribeWorkspaceWatch(
  handler: (ev: WatchEvent) => void,
): Promise<() => void> {
  if (!isTauriRuntime()) return () => {};
  const { listen } = await import("@tauri-apps/api/event");
  const un = await listen<WatchEvent & { relativePath?: string; type?: string }>(
    "workspace://change",
    (event) => {
      const p = event.payload as Record<string, unknown>;
      const type = String(p.type ?? p["type"] ?? "modified") as WatchEvent["type"];
      const relativePath = String(p.relativePath ?? p["relative_path"] ?? "");
      const from = p.from != null ? String(p.from) : p["from"] != null ? String(p["from"]) : undefined;
      handler({ type, relativePath, from });
    },
  );
  return () => {
    void un();
  };
}

export async function pickSaveHtmlFile(defaultName: string = "export.html"): Promise<string | null> {
  if (isTauriRuntime()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const selected = await save({
      title: "Exportar HTML",
      defaultPath: defaultName,
      filters: [{ name: "HTML", extensions: ["html", "htm"] }],
    });
    return typeof selected === "string" ? selected : null;
  }
  if (typeof window !== "undefined") {
    return window.prompt("Salvar HTML como:", defaultName);
  }
  return null;
}

export async function confirmOverwrite(path: string): Promise<boolean> {
  if (isTauriRuntime()) {
    const { ask } = await import("@tauri-apps/plugin-dialog");
    return ask(`O arquivo já existe:\n${path}\n\nSobrescrever?`, {
      title: "Confirmar sobrescrita",
      kind: "warning",
    });
  }
  if (typeof window !== "undefined") {
    return window.confirm(`O arquivo já existe:\n${path}\n\nSobrescrever?`);
  }
  return false;
}
