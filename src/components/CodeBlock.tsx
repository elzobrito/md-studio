import { useState } from "react";
import { normalizeLanguage } from "../markdown/code";
import { formatCode } from "../services/formatter";

export function CodeBlock(props: {
  code: string;
  language?: string;
  filename?: string;
  onFormatted?: (newCode: string) => void;
}) {
  const lang = normalizeLanguage(props.language);
  const [copied, setCopied] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(props.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFormat = async () => {
    setFormatting(true);
    try {
      const res = await formatCode(lang, props.code);
      if (res.formatted) {
        setFeedback("✓ Formatado!");
        props.onFormatted?.(res.code);
      } else {
        setFeedback(res.error ? "Erro ao formatar" : "Sem alterações");
      }
    } catch {
      setFeedback("Erro");
    } finally {
      setFormatting(false);
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  return (
    <div className="code-block-container code-block">
      <header className="code-block-header">
        <span className="code-block-lang">{props.filename ?? lang}</span>
        <div className="code-block-actions">
          <button
            type="button"
            className={`code-block-action-format btn-action ${feedback?.startsWith("✓") ? "success" : ""}`}
            disabled={formatting}
            onClick={handleFormat}
            title="Formatar código"
          >
            {feedback ?? (formatting ? "Formatando..." : "Formatar")}
          </button>
          <button
            type="button"
            className={`code-block-action-copy btn-action ${copied ? "success" : ""}`}
            onClick={handleCopy}
            title="Copiar código"
          >
            {copied ? "✓ Copiado!" : "Copiar"}
          </button>
        </div>
      </header>
      <pre>
        <code className={`language-${lang}`}>{props.code}</code>
      </pre>
    </div>
  );
}
