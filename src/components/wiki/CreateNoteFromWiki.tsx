import { useEffect, useMemo, useState } from "react";
import { ipc } from "../../lib/ipc";
import { triggerReindex } from "../../lib/ipc/metadata";
import "../../styles/wiki-links.css";

export function sanitizeWikiFileName(target: string): string {
  return target
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.md$/i, "")
    .replace(/[^a-zA-Z0-9 _-]+/g, "")
    .trim()
    .replace(/[ _]+/g, "-")
    .replace(/-+/g, "-")
    .toLocaleLowerCase()
    .slice(0, 96);
}

export function notePathForTarget(target: string, currentPath: string): string | null {
  const fileName = sanitizeWikiFileName(target);
  if (!fileName || fileName === "." || fileName === "..") return null;
  const normalized = currentPath.replace(/\\/g, "/");
  const slash = normalized.lastIndexOf("/");
  const directory = slash >= 0 ? normalized.slice(0, slash) : "";
  return directory ? `${directory}/${fileName}.md` : `${fileName}.md`;
}

export function safeWikiNotePath(input: string): string | null {
  const normalized = input.trim().replace(/\\/g, "/");
  if (!normalized || normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized)) return null;
  const parts = normalized.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) return null;
  const rawName = parts.pop()!;
  const fileName = sanitizeWikiFileName(rawName);
  if (!fileName) return null;
  const directories = parts.map((part) => sanitizeWikiFileName(part));
  if (directories.some((part) => !part)) return null;
  return [...directories, `${fileName}.md`].join("/");
}

export function CreateNoteFromWiki(props: {
  target: string | null;
  currentPath: string;
  workspaceId: string | null;
  onCancel: () => void;
  onCreated: (path: string) => void | Promise<unknown>;
}) {
  const suggested = useMemo(
    () => (props.target ? notePathForTarget(props.target, props.currentPath) : null),
    [props.target, props.currentPath],
  );
  const [path, setPath] = useState(suggested ?? "");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setPath(suggested ?? "");
    setError(null);
  }, [suggested]);

  if (!props.target) return null;

  const create = async () => {
    const target = props.target;
    const safePath = safeWikiNotePath(path);
    if (!target || !props.workspaceId || !safePath) {
      setError("Escolha um nome de arquivo válido dentro do workspace.");
      return;
    }
    setCreating(true);
    setError(null);
    const title = target.trim() || "Nova nota";
    try {
      const result = await ipc.saveDocument({
        workspaceId: props.workspaceId,
        relativePath: safePath,
        expectedHash: "",
        content: `# ${title}\n\n`,
      });
      if (!result.ok) {
        setError(result.code === "HashMismatch" ? "Esse arquivo já existe." : result.message);
        return;
      }
      await triggerReindex();
      await props.onCreated(safePath);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="wiki-create-backdrop" role="presentation" onMouseDown={props.onCancel}>
      <section
        className="wiki-create-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wiki-create-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="wiki-create-title">Criar nota “{props.target}”</h2>
        <label>
          Caminho no workspace
          <input
            autoFocus
            value={path}
            onChange={(event) => setPath(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") props.onCancel();
              if (event.key === "Enter") void create();
            }}
          />
        </label>
        {error && <p className="wiki-create-error">{error}</p>}
        <footer>
          <button type="button" className="btn btn-secondary" onClick={props.onCancel}>
            Cancelar
          </button>
          <button type="button" className="btn" disabled={creating} onClick={() => void create()}>
            {creating ? "Criando…" : "Criar e abrir"}
          </button>
        </footer>
      </section>
    </div>
  );
}
