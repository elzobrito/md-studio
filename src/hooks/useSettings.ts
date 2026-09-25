import { useEffect, useState } from "react";
import {
  settingsStore,
  type SettingsState,
  type PreviewReadingWidth,
} from "../state/settings";

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
  setPreviewReadingWidth: (width: PreviewReadingWidth) => void;
  setLineWrapping: (enabled: boolean) => void;
  setLineNumbers: (enabled: boolean) => void;
  setSplitScrollSync: (enabled: boolean) => void;
  setAutoSave: (enabled: boolean) => void;
  setAutoSaveDelay: (delay: number) => void;
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
    setPreviewReadingWidth: (prw) => settingsStore.setPreviewReadingWidth(prw),
    setLineWrapping: (lw) => settingsStore.setLineWrapping(lw),
    setLineNumbers: (ln) => settingsStore.setLineNumbers(ln),
    setSplitScrollSync: (enabled) => settingsStore.setSplitScrollSync(enabled),
    setAutoSave: (as) => settingsStore.setAutoSave(as),
    setAutoSaveDelay: (asd) => settingsStore.setAutoSaveDelay(asd),
    resetToDefaults: () => settingsStore.resetToDefaults(),
  };
}
