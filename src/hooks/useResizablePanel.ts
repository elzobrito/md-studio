import { useCallback, useEffect, useState } from "react";

interface Options {
  side: "left" | "right";
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  storageKey?: string;
}

export function useResizablePanel({
  side,
  defaultWidth,
  minWidth,
  maxWidth,
  storageKey,
}: Options) {
  const key = storageKey || `md-studio.panel-width.${side}`;

  const [width, setWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const val = Number(saved);
        if (!isNaN(val) && val >= minWidth && val <= maxWidth) return val;
      }
    } catch {
      /* ignore */
    }
    return defaultWidth;
  });

  const [isResizing, setIsResizing] = useState(false);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      const startX = e.clientX;
      const startWidth = width;

      function onMouseMove(moveEvent: MouseEvent) {
        const delta = moveEvent.clientX - startX;
        const newWidth = side === "left" ? startWidth + delta : startWidth - delta;
        const clamped = Math.min(Math.max(newWidth, minWidth), maxWidth);
        setWidth(clamped);
      }

      function onMouseUp() {
        setIsResizing(false);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [width, side, minWidth, maxWidth],
  );

  useEffect(() => {
    try {
      localStorage.setItem(key, String(width));
    } catch {
      /* ignore */
    }
  }, [key, width]);

  return { width, isResizing, startResize };
}
