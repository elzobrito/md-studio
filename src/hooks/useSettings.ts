import { useEffect, useState } from "react";
import { settingsStore, type SettingsState } from "../state/settings";

export function useSettings(): SettingsState & {
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setLineHeight: (lineHeight: number) => void;
  setTheme: (theme: SettingsState["theme"]) => void;
  setPreviewFontSize: (size: number) => void;
  setPreviewFontFamily: (family: string) => void;
  setLineWrapping: (enabled: boolean) => void;
  setLineNumbers: (enabled: boolean) => void;
  resetToDefaults: () => void;
} {
  const [state, setState] = useState(() => settingsStore.getState());

  useEffect(() => {
    return settingsStore.subscribe(() => {
      setState(settingsStore.getState());
    });
  }, []);

  return {
    ...state,
    setFontSize: (s) => settingsStore.setFontSize(s),
    setFontFamily: (f) => settingsStore.setFontFamily(f),
    setZoom: (z) => settingsStore.setZoom(z),
    zoomIn: () => settingsStore.zoomIn(),
    zoomOut: () => settingsStore.zoomOut(),
    resetZoom: () => settingsStore.resetZoom(),
    setLineHeight: (lh) => settingsStore.setLineHeight(lh),
    setTheme: (t) => settingsStore.setTheme(t),
    setPreviewFontSize: (pfs) => settingsStore.setPreviewFontSize(pfs),
    setPreviewFontFamily: (pff) => settingsStore.setPreviewFontFamily(pff),
    setLineWrapping: (lw) => settingsStore.setLineWrapping(lw),
    setLineNumbers: (ln) => settingsStore.setLineNumbers(ln),
    resetToDefaults: () => settingsStore.resetToDefaults(),
  };
}
