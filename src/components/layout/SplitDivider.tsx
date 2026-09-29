import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import "../../styles/split-view.css";

export type SplitOrientation = "vertical" | "horizontal";

export const SPLIT_ORIENTATION_STORAGE_KEY = "md-studio.split-orientation";
export const SPLIT_RATIO_STORAGE_KEY = "md-studio.split-ratio";
export const SPLIT_RATIO_VERTICAL_STORAGE_KEY = "md-studio.split-ratio-vertical";
export const SPLIT_RATIO_HORIZONTAL_STORAGE_KEY = "md-studio.split-ratio-horizontal";
export const DEFAULT_SPLIT_RATIO = 0.5;

export interface SplitDividerProps {
  orientation?: SplitOrientation;
  ratio: number;
  onChangeRatio: (newRatio: number) => void;
  onReset?: () => void;
  containerRef: React.RefObject<HTMLElement | null>;
  className?: string;
  minFirstPx?: number;
  minSecondPx?: number;
}

export function loadSavedSplitOrientation(): SplitOrientation {
  try {
    const saved = localStorage.getItem(SPLIT_ORIENTATION_STORAGE_KEY);
    if (saved === "vertical" || saved === "horizontal") {
      return saved;
    }
  } catch {
    /* ignore */
  }
  return "vertical";
}

export function saveSplitOrientation(orientation: SplitOrientation): void {
  try {
    localStorage.setItem(SPLIT_ORIENTATION_STORAGE_KEY, orientation);
  } catch {
    /* ignore */
  }
}

export function loadSavedSplitRatio(orientation: SplitOrientation = "vertical"): number {
  try {
    const key =
      orientation === "horizontal"
        ? SPLIT_RATIO_HORIZONTAL_STORAGE_KEY
        : SPLIT_RATIO_VERTICAL_STORAGE_KEY;
    const saved = localStorage.getItem(key) ?? (orientation === "vertical" ? localStorage.getItem(SPLIT_RATIO_STORAGE_KEY) : null);
    if (saved) {
      const val = parseFloat(saved);
      if (!isNaN(val) && val >= 0.15 && val <= 0.85) {
        return val;
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_SPLIT_RATIO;
}

export function saveSplitRatio(ratio: number, orientation: SplitOrientation = "vertical"): void {
  try {
    const key =
      orientation === "horizontal"
        ? SPLIT_RATIO_HORIZONTAL_STORAGE_KEY
        : SPLIT_RATIO_VERTICAL_STORAGE_KEY;
    const formatted = ratio.toFixed(3);
    localStorage.setItem(key, formatted);
    if (orientation === "vertical") {
      localStorage.setItem(SPLIT_RATIO_STORAGE_KEY, formatted);
    }
  } catch {
    /* ignore */
  }
}

export function SplitDivider({
  orientation = "vertical",
  ratio,
  onChangeRatio,
  onReset,
  containerRef,
  className = "",
  minFirstPx = 180,
  minSecondPx = 180,
}: SplitDividerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  const calculateRatioFromPointer = useCallback(
    (clientX: number, clientY: number): number => {
      if (!containerRef.current) return ratio;
      const rect = containerRef.current.getBoundingClientRect();

      if (orientation === "horizontal") {
        const totalHeight = rect.height;
        if (totalHeight <= 0) return ratio;
        const pointerOffset = clientY - rect.top;
        const rawRatio = pointerOffset / totalHeight;

        const minRatio = Math.max(0.15, minFirstPx / totalHeight);
        const maxRatio = Math.min(0.85, 1 - minSecondPx / totalHeight);

        const clamped = Math.max(minRatio, Math.min(maxRatio, rawRatio));
        return Number(clamped.toFixed(3));
      } else {
        const totalWidth = rect.width;
        if (totalWidth <= 0) return ratio;
        const pointerOffset = clientX - rect.left;
        const rawRatio = pointerOffset / totalWidth;

        const minRatio = Math.max(0.15, minFirstPx / totalWidth);
        const maxRatio = Math.min(0.85, 1 - minSecondPx / totalWidth);

        const clamped = Math.max(minRatio, Math.min(maxRatio, rawRatio));
        return Number(clamped.toFixed(3));
      }
    },
    [containerRef, orientation, minFirstPx, minSecondPx, ratio]
  );

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // Only primary button
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    setMenuOpen(false);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    const newRatio = calculateRatioFromPointer(e.clientX, e.clientY);
    onChangeRatio(newRatio);
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setIsDragging(false);
    saveSplitRatio(ratio, orientation);
  };

  const handlePointerCancel = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (onReset) {
      onReset();
    } else {
      onChangeRatio(DEFAULT_SPLIT_RATIO);
    }
    saveSplitRatio(DEFAULT_SPLIT_RATIO, orientation);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    const isHorz = orientation === "horizontal";

    if ((!isHorz && e.key === "ArrowLeft") || (isHorz && e.key === "ArrowUp")) {
      e.preventDefault();
      next = Math.max(0.15, ratio - 0.05);
    } else if ((!isHorz && e.key === "ArrowRight") || (isHorz && e.key === "ArrowDown")) {
      e.preventDefault();
      next = Math.min(0.85, ratio + 0.05);
    } else if (e.key === "Home") {
      e.preventDefault();
      next = 0.2;
    } else if (e.key === "End") {
      e.preventDefault();
      next = 0.8;
    } else if (e.key === "Enter" || e.key === " " || e.key.toLowerCase() === "r") {
      e.preventDefault();
      next = DEFAULT_SPLIT_RATIO;
    }

    if (next !== null) {
      const rounded = Number(next.toFixed(3));
      onChangeRatio(rounded);
      saveSplitRatio(rounded, orientation);
    }
  };

  const applyPreset = (preset: number) => {
    setMenuOpen(false);
    onChangeRatio(preset);
    saveSplitRatio(preset, orientation);
  };

  // Close preset menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const percentage = Math.round(ratio * 100);
  const isHorz = orientation === "horizontal";

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-valuenow={percentage}
      aria-valuemin={15}
      aria-valuemax={85}
      aria-label={`Divisor da visualização dividida (${orientation})`}
      tabIndex={0}
      className={`split-divider is-${orientation} ${isDragging ? "is-dragging" : ""} ${className}`.trim()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      title={
        isHorz
          ? "Arraste verticalmente para ajustar altura. Dois cliques para 50/50."
          : "Arraste lateralmente para ajustar proporção. Dois cliques para 50/50."
      }
    >
      <div className="split-divider-line" aria-hidden="true" />

      <div
        ref={handleRef}
        className="split-divider-handle"
        aria-hidden="true"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((prev) => !prev);
        }}
        title="Opções de divisão"
      >
        <span>{isHorz ? "⋯" : "⋮"}</span>
      </div>

      {menuOpen && (
        <div
          ref={menuRef}
          className="split-preset-menu"
          role="menu"
          aria-label="Predefinições de divisão"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            className={`split-preset-btn ${Math.abs(ratio - 0.4) < 0.02 ? "active" : ""}`}
            onClick={() => applyPreset(0.4)}
          >
            <span>40 / 60</span>
            <span className="split-preset-hint">{isHorz ? "Mais Abaixo" : "Mais Preview"}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className={`split-preset-btn ${Math.abs(ratio - 0.5) < 0.02 ? "active" : ""}`}
            onClick={() => applyPreset(0.5)}
          >
            <span>50 / 50</span>
            <span className="split-preset-hint">Equilíbrio</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className={`split-preset-btn ${Math.abs(ratio - 0.6) < 0.02 ? "active" : ""}`}
            onClick={() => applyPreset(0.6)}
          >
            <span>60 / 40</span>
            <span className="split-preset-hint">{isHorz ? "Mais Acima" : "Mais Markdown"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
