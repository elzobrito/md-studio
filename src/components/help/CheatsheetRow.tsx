import { useState } from "react";
import type { CheatsheetItem } from "./cheatsheet-items";

export interface CheatsheetRowProps {
  item: CheatsheetItem;
}

export function CheatsheetRow({ item }: CheatsheetRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(item.copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback
    }
  };

  return (
    <div className="cheatsheet-row" role="row">
      <div className="cheatsheet-col-syntax" role="cell">
        <code>{item.syntax}</code>
      </div>
      <div className="cheatsheet-col-result" role="cell">
        {item.result}
      </div>
      <div className="cheatsheet-col-action" role="cell">
        <button
          type="button"
          className={`cheatsheet-copy-btn ${copied ? "copied" : ""}`}
          onClick={handleCopy}
          aria-label={`Copiar ${item.syntax}`}
        >
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
