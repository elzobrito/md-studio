import { useEffect, useState } from "react";
import { editorStore } from "../../state/editor";

export function CursorPosition({ onClick }: { onClick?: () => void }) {
  const [cursor, setCursor] = useState(() => editorStore.getCursor());

  useEffect(() => {
    return editorStore.subscribe(() => {
      setCursor(editorStore.getCursor());
    });
  }, []);

  return (
    <span
      className={`status-bar-item cursor-position ${onClick ? "clickable" : ""}`}
      onClick={onClick}
      title="Linha e coluna do cursor (clique ou Ctrl+G para ir para linha)"
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      Ln {cursor.line}, Col {cursor.col}
    </span>
  );
}
