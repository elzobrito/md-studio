import React from "react";

export interface ToolbarButtonProps {
  icon: string | React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
}

export function ToolbarButton({
  icon,
  label,
  shortcut,
  onClick,
  isActive = false,
  disabled = false,
}: ToolbarButtonProps) {
  const tooltip = shortcut ? `${label} (${shortcut})` : label;

  return (
    <button
      type="button"
      className={`toolbar-button ${isActive ? "active" : ""}`}
      onMouseDown={(e) => {
        // Prevent stealing focus and selection from the active CodeMirror editor
        e.preventDefault();
      }}
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      aria-label={label}
    >
      {icon}
    </button>
  );
}
