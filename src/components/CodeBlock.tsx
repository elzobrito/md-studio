import { normalizeLanguage } from "../markdown/code";

export function CodeBlock(props: { code: string; language?: string; filename?: string }) {
  const lang = normalizeLanguage(props.language);
  return (
    <div className="code-block">
      <header>
        <span>{props.filename ?? lang}</span>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(props.code)}
        >
          Copiar
        </button>
      </header>
      <pre>
        <code className={`language-${lang}`}>{props.code}</code>
      </pre>
    </div>
  );
}
