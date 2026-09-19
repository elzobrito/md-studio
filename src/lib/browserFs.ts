/**
 * Browser filesystem via File System Access API (Chrome/Edge/Opera).
 * Allows real directory navigation without Tauri.
 */

export type BrowserFsMode = "none" | "directory" | "demo";

let rootDir: FileSystemDirectoryHandle | null = null;
let mode: BrowserFsMode = "none";
let rootLabel = "workspace";

// Structured demo tree for fallback
const DEMO: Record<string, Array<{ name: string; kind: "file" | "dir"; content?: string }>> = {
  "": [
    { name: "README.md", kind: "file", content: "# README\n\nDemo MD Studio.\n" },
    { name: "notas.md", kind: "file", content: "# Notas\n\n- item\n" },
    { name: "docs", kind: "dir" },
    { name: "projetos", kind: "dir" },
  ],
  docs: [
    { name: "guia.md", kind: "file", content: "# Guia\n\n## Preview\n\nTexto.\n\n## Matemática\n\nInline $x^2$.\n\n$$\n\\sum_{i=1}^{n} i\n$$\n" },
    { name: "api.md", kind: "file", content: "# API\n\nDocumentação da API.\n" },
  ],
  projetos: [
    { name: "ideia.md", kind: "file", content: "# Ideia\n\nRascunho de projeto.\n" },
  ],
};

export function getBrowserFsMode(): BrowserFsMode {
  return mode;
}

export function getBrowserRootLabel(): string {
  return rootLabel;
}

export function supportsDirectoryPicker(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export function supportsOpenFilePicker(): boolean {
  return typeof window !== "undefined" && "showOpenFilePicker" in window;
}

export async function pickRealDirectory(): Promise<{ label: string } | null> {
  const picker = window.showDirectoryPicker;
  if (!picker) return null;
  try {
    const handle = await picker({ mode: "readwrite" });
    rootDir = handle;
    mode = "directory";
    rootLabel = handle.name;
    return { label: handle.name };
  } catch (e) {
    // user abort
    if (e instanceof DOMException && e.name === "AbortError") return null;
    throw e;
  }
}

export async function pickRealMarkdownFile(): Promise<{
  name: string;
  parentLabel: string;
  content: string;
} | null> {
  const picker = window.showOpenFilePicker;
  if (!picker) return null;
  try {
    const [handle] = await picker({
      multiple: false,
      types: [
        {
          description: "Markdown",
          accept: { "text/markdown": [".md", ".markdown", ".mdx"], "text/plain": [".md", ".txt"] },
        },
      ],
    });
    const file = await handle.getFile();
    const content = await file.text();
    // single-file workspace: store parent as synthetic via file handle map
    rootDir = null;
    mode = "directory";
    // Use a virtual single-file tree
    singleFile = { name: handle.name, content, handle };
    rootLabel = handle.name;
    return { name: handle.name, parentLabel: handle.name, content };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return null;
    throw e;
  }
}

let singleFile: {
  name: string;
  content: string;
  handle: FileSystemFileHandle;
} | null = null;

export function useDemoWorkspace(): { label: string } {
  rootDir = null;
  singleFile = null;
  mode = "demo";
  rootLabel = "demo-workspace";
  return { label: rootLabel };
}

async function resolveDir(relativePath: string): Promise<FileSystemDirectoryHandle> {
  if (!rootDir) throw new Error("Nenhuma pasta aberta");
  if (!relativePath) return rootDir;
  let dir = rootDir;
  for (const part of relativePath.split("/").filter(Boolean)) {
    dir = await dir.getDirectoryHandle(part);
  }
  return dir;
}

export async function listBrowserEntries(
  relativePath: string,
): Promise<Array<{ name: string; relativePath: string; kind: "file" | "dir"; size?: number }>> {
  if (mode === "demo") {
    const key = relativePath || "";
    const items = DEMO[key] ?? [];
    return items.map((it) => ({
      name: it.name,
      relativePath: relativePath ? `${relativePath}/${it.name}` : it.name,
      kind: it.kind,
    }));
  }

  if (singleFile) {
    if (relativePath) return [];
    return [
      {
        name: singleFile.name,
        relativePath: singleFile.name,
        kind: "file",
        size: singleFile.content.length,
      },
    ];
  }

  const dir = await resolveDir(relativePath);
  const out: Array<{ name: string; relativePath: string; kind: "file" | "dir"; size?: number }> =
    [];
  for await (const [name, handle] of dir.entries()) {
    if (name.startsWith(".")) continue;
    const rel = relativePath ? `${relativePath}/${name}` : name;
    if (handle.kind === "directory") {
      out.push({ name, relativePath: rel, kind: "dir" });
    } else if (handle.kind === "file") {
      out.push({ name, relativePath: rel, kind: "file" });
    }
  }
  out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name, "pt-BR");
  });
  return out;
}

export async function readBrowserFile(relativePath: string): Promise<string> {
  if (mode === "demo") {
    const parts = relativePath.split("/");
    const name = parts.pop()!;
    const dir = parts.join("/");
    const items = DEMO[dir] ?? [];
    const f = items.find((i) => i.name === name && i.kind === "file");
    return f?.content ?? `# ${name}\n`;
  }
  if (singleFile && relativePath === singleFile.name) {
    const file = await singleFile.handle.getFile();
    return file.text();
  }
  const parts = relativePath.split("/").filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) throw new Error("Caminho inválido");
  const dir = await resolveDir(parts.join("/"));
  const fh = await dir.getFileHandle(fileName);
  const file = await fh.getFile();
  return file.text();
}

export async function writeBrowserFile(relativePath: string, content: string): Promise<void> {
  if (mode === "demo") {
    const parts = relativePath.split("/");
    const name = parts.pop()!;
    const dir = parts.join("/");
    if (!DEMO[dir]) DEMO[dir] = [];
    const items = DEMO[dir];
    const idx = items.findIndex((i) => i.name === name);
    if (idx >= 0) items[idx] = { name, kind: "file", content };
    else items.push({ name, kind: "file", content });
    return;
  }
  if (singleFile && relativePath === singleFile.name) {
    const w = await singleFile.handle.createWritable();
    await w.write(content);
    await w.close();
    singleFile.content = content;
    return;
  }
  const parts = relativePath.split("/").filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) throw new Error("Caminho inválido");
  const dir = await resolveDir(parts.join("/"));
  const fh = await dir.getFileHandle(fileName, { create: true });
  const w = await fh.createWritable();
  await w.write(content);
  await w.close();
}
