import type { EditorView } from "@codemirror/view";
import { ToolbarButton } from "./ToolbarButton";
import { ToolbarGroup } from "./ToolbarGroup";
import {
  addColumn,
  removeColumn,
  addRow,
  removeRow,
  setColumnAlignment,
  parseTable,
} from "../../editor/table/table-helpers";

export interface TableToolbarProps {
  view: EditorView;
}

export function TableToolbar({ view }: TableToolbarProps) {
  const handleAlign = (align: "left" | "center" | "right") => {
    const data = parseTable(view);
    if (!data) return;
    setColumnAlignment(view, data.cursorCol, align);
  };

  return (
    <div className="table-toolbar-context" style={{ display: "flex", alignItems: "center", gap: "2px" }}>
      <ToolbarGroup>
        <ToolbarButton
          icon="+col"
          label="Adicionar coluna após a atual"
          onClick={() => addColumn(view)}
        />
        <ToolbarButton
          icon="-col"
          label="Remover coluna atual"
          onClick={() => removeColumn(view)}
        />
      </ToolbarGroup>

      <div className="toolbar-separator" aria-hidden="true" />

      <ToolbarGroup>
        <ToolbarButton
          icon="+linha"
          label="Adicionar linha após a atual"
          onClick={() => addRow(view)}
        />
        <ToolbarButton
          icon="-linha"
          label="Remover linha atual"
          onClick={() => removeRow(view)}
        />
      </ToolbarGroup>

      <div className="toolbar-separator" aria-hidden="true" />

      <ToolbarGroup>
        <ToolbarButton
          icon="←"
          label="Alinhar coluna à esquerda"
          onClick={() => handleAlign("left")}
        />
        <ToolbarButton
          icon="↔"
          label="Centralizar coluna"
          onClick={() => handleAlign("center")}
        />
        <ToolbarButton
          icon="→"
          label="Alinhar coluna à direita"
          onClick={() => handleAlign("right")}
        />
      </ToolbarGroup>
    </div>
  );
}
