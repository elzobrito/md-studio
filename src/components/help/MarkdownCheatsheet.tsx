import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CHEATSHEET_ITEMS, type CheatsheetItem } from "./cheatsheet-items";
import { CheatsheetRow } from "./CheatsheetRow";
import "../../styles/cheatsheet.css";

export interface MarkdownCheatsheetProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function MarkdownCheatsheet(props: MarkdownCheatsheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = props.isOpen !== undefined;
  const open = isControlled ? props.isOpen : internalOpen;

  const handleClose = () => {
    if (props.onClose) {
      props.onClose();
    } else {
      setInternalOpen(false);
    }
  };

  // Keyboard listeners: Ctrl+Shift+H to toggle, Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isH = e.key.toLowerCase() === "h";
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && isH) {
        e.preventDefault();
        e.stopPropagation();
        if (isControlled) {
          if (open) props.onClose?.();
          else props.onClose?.(); // or external handler
        } else {
          setInternalOpen((prev) => !prev);
        }
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open, isControlled, props]);

  const categories = useMemo(() => {
    const map = new Map<string, CheatsheetItem[]>();
    for (const item of CHEATSHEET_ITEMS) {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    }
    return Array.from(map.entries());
  }, []);

  if (!open) return null;

  return createPortal(
    <div
      className="cheatsheet-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="false"
      aria-label="Referência Markdown"
    >
      <div className="cheatsheet-panel">
        <header className="cheatsheet-header">
          <h2 className="cheatsheet-title">
            <span aria-hidden="true">📖</span> Referência Markdown
          </h2>
          <button
            type="button"
            className="cheatsheet-close"
            onClick={handleClose}
            aria-label="Fechar referência"
          >
            ✕
          </button>
        </header>

        <div className="cheatsheet-body">
          {categories.map(([category, items]) => (
            <section key={category} className="cheatsheet-section">
              <h3 className="cheatsheet-section-title">{category}</h3>
              <div className="cheatsheet-table" role="table">
                {items.map((item) => (
                  <CheatsheetRow key={item.syntax} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
