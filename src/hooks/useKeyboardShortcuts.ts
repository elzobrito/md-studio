import { useEffect } from "react";

export interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
  category: "Arquivo" | "Visualização" | "Navegação" | "Editor" | "Interface";
}

export function useKeyboardShortcuts(shortcuts: Shortcut[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept if typing in an input or textarea unless it's a Ctrl/Cmd shortcut
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      for (const s of shortcuts) {
        const matchCtrl = !!s.ctrl === (e.ctrlKey || e.metaKey);
        const matchShift = !!s.shift === e.shiftKey;
        const matchAlt = !!s.alt === e.altKey;
        const matchKey = e.key.toLowerCase() === s.key.toLowerCase();

        if (matchKey && matchCtrl && matchShift && matchAlt) {
          // If in input and shortcut is a regular typing key (no ctrl/alt and not a function key), let standard input proceed
          if (isInput && !s.ctrl && !s.alt && !s.key.toUpperCase().startsWith("F")) {
            continue;
          }
          e.preventDefault();
          s.action();
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, enabled]);
}
