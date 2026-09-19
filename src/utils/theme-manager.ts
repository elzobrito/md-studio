import type { ThemeMode } from "../state/settings";

export function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "dark";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getEffectiveTheme(theme: ThemeMode): "dark" | "light" {
  if (theme === "auto") {
    return getSystemTheme();
  }
  return theme;
}

export function applyThemeClass(theme: ThemeMode, rootElement?: HTMLElement) {
  const el = rootElement || (typeof document !== "undefined" ? document.documentElement : null);
  if (!el) return;

  el.classList.remove("theme-light", "theme-dark", "theme-auto");
  el.classList.add(`theme-${theme}`);
}
