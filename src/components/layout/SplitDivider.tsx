import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import "../../styles/split-view.css";

export const SPLIT_RATIO_STORAGE_KEY = "md-studio.split-ratio";
export const DEFAULT_SPLIT_RATIO = 0.5;

export interface SplitDividerProps {
  ratio: number;
  onChangeRatio: (newRatio: number) => void;
  onReset?: () => void;
  containerRef: React.RefObject<HTMLElement | null>;
  className?: string;
  minSourcePx?: number;
  minPreviewPx?: number;
}

export function loadSavedSplitRatio(): number {
  try {
    const saved = localStorage.getItem(SPLIT_RATIO_STORAGE_KEY);
    if (saved) {
      const val = parseFloat(saved);
      if (!isNaN(val) && val >= 0.2 && val <= 0.8) {
        return val;
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_SPLIT_RATIO;
}

export function saveSplitRatio(ratio: number): void {
  try {
    localStorage.setItem(SPLIT_RATIO_STORAGE_KEY, ratio.toFixed(3));
  } catch {
    /* ignore */
  }
}

export function SplitDivider({
  ratio,
  onChangeRatio,
  onReset,
  containerRef,
  className = "",
  minSourcePx = 300,
  minPreviewPx = 300,
}: SplitDividerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  const calculateRatioFromClientX = useCallback(
    (clientX: number): number => {
      if (!containerRef.current) return ratio;
      const rect = containerRef.current.getBoundingClientRect();
      const totalWidth = rect.width;
      if (totalWidth <= 0) return ratio;

      const pointerOffset = clientX - rect.left;
      const rawRatio = pointerOffset / totalWidth;

      const minSourceRatio = Math.max(0.2, minSourcePx / totalWidth);
      const maxSourceRatio = Math.min(0.8, 1 - minPreviewPx / totalWidth);

      const clamped = Math.max(minSourceRatio, Math.min(maxSourceRatio, rawRatio));
      return Number(clamped.toFixed(3));
    },
    [containerRef, minSourcePx, minPreviewPx, ratio]
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
    const newRatio = calculateRatioFromClientX(e.clientX);
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
    saveSplitRatio(ratio);
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
    saveSplitRatio(DEFAULT_SPLIT_RATIO);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      next = Math.max(0.2, ratio - 0.05);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      next = Math.min(0.8, ratio + 0.05);
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
      saveSplitRatio(rounded);
    }
  };

  const applyPreset = (preset: number) => {
    setMenuOpen(false);
    onChangeRatio(preset);
    saveSplitRatio(preset);
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

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={percentage}
      aria-valuemin={20}
      aria-valuemax={80}
      aria-label="Divisor da visualização dividida"
      tabIndex={0}
      className={`split-divider ${isDragging ? "is-dragging" : ""} ${className}`.trim()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      title="Arraste para ajustar proporção. Dois cliques para 50/50."
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
        <span>⋮</span>
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
            <span className="split-preset-hint">Mais Preview</span>
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
            <span className="split-preset-hint">Mais Markdown</span>
          </button>
        </div>
      )}
    </div>
  );
}
