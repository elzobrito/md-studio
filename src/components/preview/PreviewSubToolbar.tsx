import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { MaximizeIcon, MinimizeIcon } from "../icons";
import "../../styles/preview-surface.css";

export type PreviewSubMode = "view" | "html" | "diff";

export interface PreviewSubToolbarProps {
  currentSubMode: PreviewSubMode;
  availableSubModes?: PreviewSubMode[];
  onChangeSubMode: (mode: PreviewSubMode) => void;
  zoomLevel: number; // e.g. 1.0 = 100%
  onChangeZoom: (level: number) => void;
  isMaximized: boolean;
  onToggleMaximize?: () => void;
}

const ZOOM_PRESETS = [0.8, 0.9, 1.0, 1.1, 1.25, 1.5];

export function PreviewSubToolbar({
  currentSubMode,
  availableSubModes = ["view", "html", "diff"],
  onChangeSubMode,
  zoomLevel,
  onChangeZoom,
  isMaximized,
  onToggleMaximize,
}: PreviewSubToolbarProps) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const zoomMenuRef = useRef<HTMLDivElement>(null);
  const zoomTriggerRef = useRef<HTMLButtonElement>(null);

  // Close zoom menu on outside click
  useEffect(() => {
    if (!zoomOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        zoomMenuRef.current &&
        !zoomMenuRef.current.contains(e.target as Node) &&
        zoomTriggerRef.current &&
        !zoomTriggerRef.current.contains(e.target as Node)
      ) {
        setZoomOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [zoomOpen]);

  const handleKeyDownZoom = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      setZoomOpen(false);
      zoomTriggerRef.current?.focus();
    }
  };

  const getSubModeLabel = (mode: PreviewSubMode): string => {
    switch (mode) {
      case "view":
        return "Visualização";
      case "html":
        return "HTML gerado";
      case "diff":
        return "Diff vs salvo";
    }
  };

  return (
    <div
      className="preview-sub-toolbar"
      role="toolbar"
      aria-label="Barra de ferramentas do preview"
    >
      {/* Submode buttons with dynamic cardinality */}
      <div
        className="preview-submode-group"
        role="radiogroup"
        aria-label="Modo de exibição do preview"
      >
        {availableSubModes.map((mode) => {
          const isActive = currentSubMode === mode;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={isActive}
              className={`preview-submode-btn ${isActive ? "active" : ""}`}
              onClick={() => onChangeSubMode(mode)}
              title={
                mode === "view"
                  ? "Visualização renderizada do documento"
                  : mode === "html"
                  ? "Inspecionar o HTML intermediário gerado e sanitizado"
                  : "Comparar alterações em relação ao arquivo em disco"
              }
            >
              {getSubModeLabel(mode)}
            </button>
          );
        })}
      </div>

      {/* Right actions: Zoom Popover & Maximize */}
      <div className="preview-toolbar-actions">
        {/* Zoom selector */}
        <div className="preview-zoom-container">
          <button
            ref={zoomTriggerRef}
            type="button"
            className="preview-zoom-trigger"
            onClick={() => setZoomOpen((prev) => !prev)}
            aria-expanded={zoomOpen}
            aria-haspopup="menu"
            title="Ajustar nível de zoom do preview"
          >
            <span>{Math.round(zoomLevel * 100)}%</span>
            <span style={{ fontSize: "9px", opacity: 0.7 }}>▼</span>
          </button>

          {zoomOpen && (
            <div
              ref={zoomMenuRef}
              className="preview-zoom-menu"
              role="menu"
              aria-label="Níveis de zoom"
              onKeyDown={handleKeyDownZoom}
            >
              {ZOOM_PRESETS.map((preset) => {
                const percent = Math.round(preset * 100);
                const isSelected = Math.abs(zoomLevel - preset) < 0.02;
                return (
                  <button
                    key={preset}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isSelected}
                    className={`preview-zoom-item ${isSelected ? "active" : ""}`}
                    onClick={() => {
                      onChangeZoom(preset);
                      setZoomOpen(false);
                      zoomTriggerRef.current?.focus();
                    }}
                  >
                    <span>{percent}%</span>
                    {isSelected && <span aria-hidden="true">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Maximize / Restore Toggle */}
        {onToggleMaximize && (
          <button
            type="button"
            className={`preview-action-btn ${isMaximized ? "active" : ""}`}
            onClick={onToggleMaximize}
            title={isMaximized ? "Restaurar tamanho do preview" : "Maximizar área do preview"}
            aria-label={isMaximized ? "Restaurar tamanho do preview" : "Maximizar área do preview"}
            aria-pressed={isMaximized}
          >
            {isMaximized ? (
              <MinimizeIcon width={14} height={14} />
            ) : (
              <MaximizeIcon width={14} height={14} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
