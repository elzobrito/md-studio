import { useEffect, useId, useState } from "react";
import { renderMermaid } from "../markdown/mermaid";

export function MermaidBlock(props: { source: string }) {
  const rid = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (error) return <div className="mermaid-error" role="alert">{error}</div>;
  if (!svg) return <div className="mermaid-loading">Renderizando diagrama…</div>;
  return <div className="mermaid" dangerouslySetInnerHTML={{ __html: svg }} />;
}
