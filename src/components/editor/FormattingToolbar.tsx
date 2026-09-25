import { useEffect, useState, useRef, useCallback, type KeyboardEvent } from "react";
import type { EditorView } from "@codemirror/view";
import { ToolbarButton } from "./ToolbarButton";
import { ToolbarGroup } from "./ToolbarGroup";
import { NewDocumentModal } from "./NewDocumentModal";
import { TableToolbar } from "./TableToolbar";
import { type Template, findFirstEditablePosition } from "../../templates";
import { isInTable, insertTable } from "../../editor/table/table-helpers";
import {
  toggleBold,
  toggleItalic,
  toggleStrikethrough,
  setHeading,
  insertLink,
  insertImage,
  toggleCode,
  insertCodeBlock,
  formatCodeBlockAtCursor,
  formatDocumentOrCodeBlock,
  toggleList,
  insertBlockquote,
  insertDivider,
} from "../../editor/formatting";
import "../../styles/formatting-toolbar.css";

export function LinkIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function ImageIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

export function SparklesIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

export function TableIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  );
}

export interface FormattingToolbarProps {
  view: EditorView | null;
  className?: string;
}

export function FormattingToolbar({ view, className = "" }: FormattingToolbarProps) {
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [inTable, setInTable] = useState(false);
  const [insertOpen, setInsertOpen] = useState(false);
  const insertContainerRef = useRef<HTMLDivElement>(null);
  const insertTriggerRef = useRef<HTMLButtonElement>(null);
  const insertItemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        e.stopPropagation();
        setTemplateModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  useEffect(() => {
    if (!view) return;

    const check = () => {
      setInTable(isInTable(view));
    };

    check();
    const dom = view.dom;
    dom.addEventListener("keyup", check);
    dom.addEventListener("mouseup", check);
    return () => {
      dom.removeEventListener("keyup", check);
      dom.removeEventListener("mouseup", check);
    };
  }, [view]);

  const closeInsert = useCallback((restoreFocus = true) => {
    setInsertOpen(false);
    if (restoreFocus) {
      insertTriggerRef.current?.focus();
    }
  }, []);

  // Click outside to close insert menu
  useEffect(() => {
    if (!insertOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        insertContainerRef.current &&
        !insertContainerRef.current.contains(e.target as Node)
      ) {
        closeInsert(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [insertOpen, closeInsert]);

  if (!view) return null;

  const handleSelectTemplate = (template: Template) => {
    const content = template.content();
    const pos = findFirstEditablePosition(content);
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: content },
      selection: { anchor: pos },
    });
    view.focus();
  };

  const insertOptions = [
    {
      id: "table",
      label: "Tabela",
      icon: <TableIcon />,
      action: () => insertTable(view, 3, 2),
    },
    {
      id: "list-unordered",
      label: "Lista de tópicos",
      icon: "•",
      action: () => toggleList(view, "unordered"),
    },
    {
      id: "list-ordered",
      label: "Lista numerada",
      icon: "1.",
      action: () => toggleList(view, "ordered"),
    },
    {
      id: "list-task",
      label: "Lista de tarefas",
      icon: "☑",
      action: () => toggleList(view, "task"),
    },
    {
      id: "quote",
      label: "Citação",
      icon: "❝",
      action: () => insertBlockquote(view),
    },
    {
      id: "divider",
      label: "Linha divisória",
      icon: "─",
      action: () => insertDivider(view),
    },
    {
      id: "template",
      label: "Novo de modelo...",
      icon: "➕",
      shortcut: "Ctrl+N",
      action: () => setTemplateModalOpen(true),
    },
  ];

  const handleItemKeyDown = (
    e: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeInsert(true);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = (index + 1) % insertOptions.length;
      insertItemsRef.current[nextIndex]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex =
        (index - 1 + insertOptions.length) % insertOptions.length;
      insertItemsRef.current[prevIndex]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      insertItemsRef.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      insertItemsRef.current[insertOptions.length - 1]?.focus();
    }
  };

  const handleExecuteOption = (action: () => void) => {
    closeInsert(false);
    action();
    view.focus();
  };

  return (
    <div
      className={`formatting-toolbar ${className}`.trim()}
      role="toolbar"
      aria-label="Barra de formatação"
    >
      {/* Grupo 1: Headings */}
      <ToolbarGroup>
        <ToolbarButton
          icon="H1"
          label="Título nível 1"
          onClick={() => setHeading(view, 1)}
        />
        <ToolbarButton
          icon="H2"
          label="Título nível 2"
          onClick={() => setHeading(view, 2)}
        />
        <ToolbarButton
          icon="H3"
          label="Título nível 3"
          onClick={() => setHeading(view, 3)}
        />
      </ToolbarGroup>

      <div className="toolbar-separator" aria-hidden="true" />

      {/* Grupo 2: Inline Formatting */}
      <ToolbarGroup>
        <ToolbarButton
          icon={<strong>B</strong>}
          label="Negrito"
          shortcut="Ctrl+B"
          onClick={() => toggleBold(view)}
        />
        <ToolbarButton
          icon={<em>I</em>}
          label="Itálico"
          shortcut="Ctrl+I"
          onClick={() => toggleItalic(view)}
        />
        <ToolbarButton
          icon={<s>S</s>}
          label="Tachado"
          shortcut="Ctrl+Shift+S"
          onClick={() => toggleStrikethrough(view)}
        />
      </ToolbarGroup>

      <div className="toolbar-separator" aria-hidden="true" />

      {/* Grupo 3: Referências & Código */}
      <ToolbarGroup>
        <ToolbarButton
          icon={<LinkIcon />}
          label="Link"
          shortcut="Ctrl+K"
          onClick={() => insertLink(view)}
        />
        <ToolbarButton
          icon={<ImageIcon />}
          label="Imagem"
          onClick={() => insertImage(view)}
        />
        <ToolbarButton
          icon="`"
          label="Código inline"
          shortcut="Ctrl+E"
          onClick={() => toggleCode(view)}
        />
        <ToolbarButton
          icon="```"
          label="Bloco de código"
          onClick={() => insertCodeBlock(view)}
        />
        <ToolbarButton
          icon={<SparklesIcon />}
          label="Formatar código"
          shortcut="Shift+Alt+F"
          onClick={() => {
            if (view) void formatDocumentOrCodeBlock(view);
          }}
        />
      </ToolbarGroup>

      <div className="toolbar-separator" aria-hidden="true" />

      {/* Grupo 4: Menu Inserir Escalável */}
      <div ref={insertContainerRef} className="toolbar-insert-container">
        <button
          ref={insertTriggerRef}
          type="button"
          className="toolbar-insert-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setInsertOpen((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setInsertOpen(true);
            }
          }}
          aria-haspopup="menu"
          aria-expanded={insertOpen}
          aria-label="Inserir elemento"
          title="Inserir elemento..."
        >
          <span>+ Inserir</span>
          <span className="toolbar-insert-arrow" aria-hidden="true">
            ▾
          </span>
        </button>

        <ul
          className="toolbar-insert-menu"
          role="menu"
          aria-label="Opções de inserção"
          hidden={!insertOpen}
        >
          {insertOptions.map((opt, idx) => (
            <li key={opt.id} role="none">
              <button
                ref={(el) => {
                  insertItemsRef.current[idx] = el;
                }}
                role="menuitem"
                type="button"
                className="toolbar-insert-item"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleExecuteOption(opt.action)}
                onKeyDown={(e) => handleItemKeyDown(e, idx)}
              >
                <span className="toolbar-insert-item-left">
                  <span className="toolbar-insert-item-icon">{opt.icon}</span>
                  <span>{opt.label}</span>
                </span>
                {opt.shortcut && (
                  <span className="toolbar-insert-item-shortcut">
                    {opt.shortcut}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {inTable && (
        <>
          <div className="toolbar-separator" aria-hidden="true" />
          <TableToolbar view={view} />
        </>
      )}

      <NewDocumentModal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />
    </div>
  );
}
