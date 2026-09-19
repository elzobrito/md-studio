import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "auto";
export type ViewMode = "source" | "preview" | "split";

/** Bump key when defaults change so first launch after upgrade gets new defaults. */
const KEY = "md-studio-session-v2";

export interface SessionApi {
  theme: Theme;
  viewMode: ViewMode;
  leftOpen: boolean;
  rightOpen: boolean;
  setTheme: (t: Theme) => void;
  setViewMode: (v: ViewMode) => void;
  setLeftOpen: (v: boolean) => void;
  setRightOpen: (v: boolean) => void;
  toggleLeft: () => void;
  toggleRight: () => void;
  toggleZen: () => void;
}

export function useSession(): SessionApi {
  const [theme, setThemeState] = useState<Theme>("light");
  const [viewMode, setViewModeState] = useState<ViewMode>("preview");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        theme?: Theme;
        viewMode?: ViewMode;
        leftOpen?: boolean;
        rightOpen?: boolean;
      };
      if (parsed.theme) setThemeState(parsed.theme);
      if (parsed.viewMode) setViewModeState(parsed.viewMode);
      if (typeof parsed.leftOpen === "boolean") setLeftOpen(parsed.leftOpen);
      if (typeof parsed.rightOpen === "boolean") setRightOpen(parsed.rightOpen);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ theme, viewMode, leftOpen, rightOpen }),
    );
  }, [theme, viewMode, leftOpen, rightOpen]);

  return {
    theme,
    viewMode,
    leftOpen,
    rightOpen,
    setTheme: setThemeState,
    setViewMode: setViewModeState,
    setLeftOpen,
    setRightOpen,
    toggleLeft: () => setLeftOpen((v) => !v),
    toggleRight: () => setRightOpen((v) => !v),
    toggleZen: () => {
      if (!leftOpen && !rightOpen) {
        setLeftOpen(true);
        setRightOpen(true);
      } else {
        setLeftOpen(false);
        setRightOpen(false);
      }
    },
  };
}
