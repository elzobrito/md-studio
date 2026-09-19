import React from "react";

export interface ToolbarGroupProps {
  children: React.ReactNode;
}

export function ToolbarGroup({ children }: ToolbarGroupProps) {
  return (
    <div className="toolbar-group">
      {children}
    </div>
  );
}
