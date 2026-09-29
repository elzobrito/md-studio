import { useState } from "react";
import "../../styles/preview-surface.css";

export interface PreviewHtmlViewProps {
  htmlContent: string;
  fileName?: string;
}

export function PreviewHtmlView({
  htmlContent,
  fileName = "documento",
}: PreviewHtmlViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(htmlContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="preview-html-view"
      role="region"
      aria-label={`HTML gerado para ${fileName}`}
    >
      <div className="preview-html-header">
        <span>Estrutura HTML intermediária compilada</span>
        <button
          type="button"
          className="preview-submode-btn"
          onClick={() => void handleCopy()}
          style={{ border: "1px solid var(--border)", background: "var(--bg-primary)" }}
        >
          {copied ? "Copiado!" : "Copiar HTML"}
        </button>
      </div>
      <pre>
        <code>{htmlContent || "<!-- Nenhum conteúdo HTML gerado -->"}</code>
      </pre>
    </div>
  );
}
