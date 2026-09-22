import { useEffect, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { ToolbarButton } from "./ToolbarButton";
import { ToolbarGroup } from "./ToolbarGroup";
import { NewDocumentModal } from "./NewDocumentModal";
import { TableToolbar } from "./TableToolbar";
import { type Template, findFirstEditablePosition } from "../../templates";
import { isInTable } from "../../editor/table/table-helpers";
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
  toggleList,
  insertBlockquote,
  insertDivider,
} from "../../editor/formatting";
import "../../styles/formatting-toolbar.css";

export interface FormattingToolbarProps {
  view: EditorView | null;
  className?: string;
}

export function FormattingToolbar({ view, className = "" }: FormattingToolbarProps) {
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [inTable, setInTable] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

      {/* Grupo 3: Inserções */}
      <ToolbarGroup>
        <ToolbarButton
          icon="🔗"
          label="Link"
          shortcut="Ctrl+K"
          onClick={() => insertLink(view)}
        />
        <ToolbarButton
          icon="🖼️"
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
          icon="✨"
          label="Formatar código"
          shortcut="Shift+Alt+F"
          onClick={() => {
            if (view) void formatCodeBlockAtCursor(view);
          }}
        />
      </ToolbarGroup>

      <div className="toolbar-separator" aria-hidden="true" />

      {/* Grupo 4: Estrutura */}
      <ToolbarGroup>
        <ToolbarButton
          icon="≡"
          label="Lista de tópicos"
          onClick={() => toggleList(view, "unordered")}
        />
        <ToolbarButton
          icon="1."
          label="Lista numerada"
          onClick={() => toggleList(view, "ordered")}
        />
        <ToolbarButton
          icon="☑"
          label="Lista de tarefas"
          onClick={() => toggleList(view, "task")}
        />
        <ToolbarButton
          icon="❝"
          label="Citação"
          onClick={() => insertBlockquote(view)}
        />
        <ToolbarButton
          icon="─"
          label="Separador"
          onClick={() => insertDivider(view)}
        />
      </ToolbarGroup>

      <div className="toolbar-separator" aria-hidden="true" />

      {/* Grupo 5: Modelos */}
      <ToolbarGroup>
        <ToolbarButton
          icon="➕"
          label="Novo a partir de modelo..."
          shortcut="Ctrl+N"
          onClick={() => setTemplateModalOpen(true)}
        />
      </ToolbarGroup>

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
