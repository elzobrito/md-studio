import { useEffect, useId, useState } from "react";
import { renderMermaid } from "../markdown/mermaid";
import "../styles/mermaid-chrome.css";

export function MermaidBlock(props: { source: string }) {
  const rid = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    let alive = true;
    void renderMermaid(`mmd-${rid}`, props.source).then((r) => {
      if (!alive) return;
      if (r.error) setError(r.error);
      else setSvg(r.svg ?? null);
    });
    return () => {
      alive = false;
    };
  }, [props.source, rid]);

  async function copySvg() {
    if (!svg || !navigator.clipboard) return;
    await navigator.clipboard.writeText(svg);
  }

  if (error) return <div className="mermaid-error" role="alert">{error}</div>;
  if (!svg) return <div className="mermaid-loading">Renderizando diagrama…</div>;

  return (
    <figure className="mermaid-chrome">
      <div className="mermaid-chrome-toolbar" role="toolbar" aria-label="Diagrama Mermaid">
        <button type="button" onClick={() => setShowSource((v) => !v)}>
          {showSource ? "Ver diagrama" : "Ver fonte"}
        </button>
        <button type="button" onClick={() => void copySvg()}>
          Copiar SVG
        </button>
      </div>
      {showSource ? (
        <pre className="mermaid-chrome-source">
          <code>{props.source}</code>
        </pre>
      ) : (
        <div className="mermaid" dangerouslySetInnerHTML={{ __html: svg }} />
      )}
    </figure>
  );
}
