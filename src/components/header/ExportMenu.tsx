import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import "../../styles/export-menu.css";

export interface ExportMenuProps {
  disabled?: boolean;
  onExportHtml?: () => void;
  onExportPdf?: () => void;
  onExportEpub?: () => void;
  className?: string;
}

interface ExportItemConfig {
  id: string;
  label: string;
  ext: string;
  className: string;
  action?: () => void;
}

export function ExportMenu({
  disabled = false,
  onExportHtml,
  onExportPdf,
  onExportEpub,
  className = "",
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const items: ExportItemConfig[] = [];
  if (onExportHtml) {
    items.push({
      id: "html",
      label: "Exportar HTML",
      ext: ".html",
      className: "export-html-btn",
      action: onExportHtml,
    });
  }
  if (onExportPdf) {
    items.push({
      id: "pdf",
      label: "Exportar PDF",
      ext: ".pdf",
      className: "export-pdf-btn",
      action: onExportPdf,
    });
  }
  if (onExportEpub) {
    items.push({
      id: "epub",
      label: "Exportar EPUB",
      ext: ".epub",
      className: "export-epub-btn",
      action: onExportEpub,
    });
  }

  const closeMenu = useCallback((restoreFocus = true) => {
    setIsOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, closeMenu]);

  // Focus first item when opening
  useEffect(() => {
    if (isOpen && items.length > 0) {
      // Focus first item next tick
      const timer = setTimeout(() => {
        itemRefs.current[0]?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isOpen, items.length]);

  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleItemKeyDown = (
    e: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu(true);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = (index + 1) % items.length;
      itemRefs.current[nextIndex]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = (index - 1 + items.length) % items.length;
      itemRefs.current[prevIndex]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      itemRefs.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      itemRefs.current[items.length - 1]?.focus();
    }
  };

  const handleItemClick = (action?: () => void) => {
    closeMenu(true);
    action?.();
  };

  if (items.length === 0) {
    return null;
  }

  const triggerTitle = disabled
    ? "Nenhum documento aberto para exportar"
    : "Exportar documento";

  return (
    <div
      ref={containerRef}
      className={`export-menu-container ${className}`.trim()}
    >
      <button
        ref={triggerRef}
        type="button"
        className="export-menu-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Exportar"
        title={triggerTitle}
      >
        <span className="export-menu-icon" aria-hidden="true">
          ⇩
        </span>
        <span>Exportar</span>
        <span className="export-menu-arrow" aria-hidden="true">
          ▾
        </span>
      </button>

      <ul
        className="export-dropdown-menu"
        role="menu"
        aria-label="Opções de exportação"
        hidden={!isOpen}
      >
        {items.map((item, idx) => (
          <li key={item.id} role="none">
            <button
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              role="menuitem"
              type="button"
              className={`export-menu-item ${item.className}`}
              disabled={disabled}
              onClick={() => handleItemClick(item.action)}
              onKeyDown={(e) => handleItemKeyDown(e, idx)}
              title={
                disabled
                  ? "Nenhum documento aberto para exportar"
                  : item.label
              }
            >
              <span>{item.label}</span>
              <span className="export-menu-item-ext" aria-hidden="true">
                {item.ext}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
