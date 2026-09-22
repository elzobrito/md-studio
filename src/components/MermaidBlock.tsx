import { useEffect, useId, useRef, useState } from "react";
import Panzoom, { type PanzoomObject } from "@panzoom/panzoom";
import { renderMermaid } from "../markdown/mermaid";
import { downloadPng, downloadSvg, embedStylesInSvg } from "../services/diagramExport";
import { settingsStore } from "../state/settings";
import "../styles/mermaid-chrome.css";

export function MermaidBlock(props: { source: string }) {
  const rid = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDegraded, setIsDegraded] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(() => settingsStore.getState().theme);

  const lastValidSvgRef = useRef<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const panzoomInstanceRef = useRef<PanzoomObject | null>(null);

  useEffect(() => {
    return settingsStore.subscribe(() => {
      setCurrentTheme(settingsStore.getState().theme);
    });
  }, []);

  useEffect(() => {
    let alive = true;
    const isDark = currentTheme !== "light";

    void renderMermaid(`mmd-${rid}`, props.source, { isDark }).then((r) => {
      if (!alive) return;
      if (r.error) {
        if (lastValidSvgRef.current) {
          // Armadilha 1: Se o usuário estiver digitando e a sintaxe estiver incompleta,
          // preserva o último diagrama válido em vez de quebrar a tela
          setIsDegraded(true);
          setError(null);
        } else {
          setError(r.error);
        }
      } else if (r.svg) {
        lastValidSvgRef.current = r.svg;
        setSvg(r.svg);
        setError(null);
        setIsDegraded(false);
      }
    });

    return () => {
      alive = false;
    };
  }, [props.source, rid, currentTheme]);

  // Inicializa Panzoom no container SVG
  useEffect(() => {
    if (!targetRef.current || !viewportRef.current || showSource || (!svg && !lastValidSvgRef.current)) {
      return;
    }

    const panzoom = Panzoom(targetRef.current, {
      maxScale: 6,
      minScale: 0.2,
      canvas: true,
      cursor: "grab",
    });
    panzoomInstanceRef.current = panzoom;

    const viewport = viewportRef.current;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      panzoom.zoomWithWheel(e);
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      viewport.removeEventListener("wheel", onWheel);
      panzoom.destroy();
      panzoomInstanceRef.current = null;
    };
  }, [svg, showSource]);

  function zoomIn() {
    panzoomInstanceRef.current?.zoomIn();
  }

  function zoomOut() {
    panzoomInstanceRef.current?.zoomOut();
  }

  function resetZoom() {
    panzoomInstanceRef.current?.reset();
  }

  async function copySvg() {
    const active = svg || lastValidSvgRef.current;
    if (!active || !navigator.clipboard) return;
    const embedded = embedStylesInSvg(active);
    await navigator.clipboard.writeText(embedded);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function onDownloadSvg() {
    const active = svg || lastValidSvgRef.current;
    if (!active) return;
    downloadSvg(active, `diagrama-${rid}.svg`);
  }

  async function onDownloadPng() {
    const active = svg || lastValidSvgRef.current;
    if (!active) return;
    try {
      await downloadPng(active, `diagrama-${rid}.png`);
    } catch (e) {
      console.error("Falha ao exportar PNG", e);
    }
  }

  if (error && !lastValidSvgRef.current) {
    return (
      <figure className="mermaid-chrome">
        <div className="mermaid-chrome-toolbar" role="toolbar" aria-label="Diagrama Mermaid">
          <div className="mermaid-toolbar-group">
            <span className="mermaid-badge-title">📊 Mermaid</span>
            <span className="mermaid-badge-degraded" style={{ color: "var(--danger, #f38ba8)" }}>
              Erro de sintaxe
            </span>
          </div>
          <button type="button" onClick={() => setShowSource((v) => !v)}>
            {showSource ? "Ver diagrama" : "Ver fonte"}
          </button>
        </div>
        <div className="mermaid-error" role="alert">
          {error}
        </div>
        {showSource && (
          <pre className="mermaid-chrome-source">
            <code>{props.source}</code>
          </pre>
        )}
      </figure>
    );
  }

  if (!svg && !lastValidSvgRef.current) {
    return <div className="mermaid-loading">Renderizando diagrama…</div>;
  }

  const activeSvg = svg || lastValidSvgRef.current;

  return (
    <figure className="mermaid-chrome">
      <div className="mermaid-chrome-toolbar" role="toolbar" aria-label="Diagrama Mermaid">
        <div className="mermaid-toolbar-group">
          <span className="mermaid-badge-title">📊 Mermaid</span>
          {isDegraded && <span className="mermaid-badge-degraded">Sintaxe incompleta</span>}
          {!showSource && (
            <>
              <button type="button" className="mermaid-zoom-btn" title="Aumentar Zoom (+)" onClick={zoomIn}>
                +
              </button>
              <button type="button" className="mermaid-zoom-btn" title="Diminuir Zoom (−)" onClick={zoomOut}>
                −
              </button>
              <button type="button" className="mermaid-zoom-btn" title="Resetar Visualização (1:1)" onClick={resetZoom}>
                1:1
              </button>
            </>
          )}
        </div>
        <div className="mermaid-toolbar-group">
          <button type="button" onClick={copySvg} title="Copiar SVG para a área de transferência">
            {copied ? "✓ Copiado" : "Copiar SVG"}
          </button>
          <button type="button" onClick={onDownloadSvg} title="Baixar arquivo SVG com estilos embutidos">
            SVG
          </button>
          <button type="button" onClick={onDownloadPng} title="Baixar imagem PNG">
            PNG
          </button>
          <button type="button" onClick={() => setShowSource((v) => !v)} title="Alternar visualização do código">
            {showSource ? "Diagrama" : "Fonte"}
          </button>
        </div>
      </div>
      {showSource ? (
        <pre className="mermaid-chrome-source">
          <code>{props.source}</code>
        </pre>
      ) : (
        <div
          ref={viewportRef}
          className="mermaid-chrome-viewport"
          title="Arraste para mover (Pan), use a roda do mouse para Zoom"
        >
          <div
            ref={targetRef}
            className="mermaid-panzoom-target"
            dangerouslySetInnerHTML={{ __html: activeSvg || "" }}
          />
        </div>
      )}
    </figure>
  );
}
