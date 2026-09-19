import type { ReactNode } from "react";

interface Props {
  side: "left" | "right";
  width: number;
  onStartResize: (e: React.MouseEvent) => void;
  children: ReactNode;
  className?: string;
  isResizing?: boolean;
}

export function ResizablePanel({
  side,
  width,
  onStartResize,
  children,
  className = "",
  isResizing,
}: Props) {
  return (
    <aside
      className={`resizable-panel panel ${side} ${className}${isResizing ? " is-resizing" : ""}`}
      style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}
    >
      <div className="resizable-panel-content">{children}</div>
      <div
        className={`resize-handle resize-handle-${side}`}
        onMouseDown={onStartResize}
        title="Arrastar para redimensionar"
      />
    </aside>
  );
}
