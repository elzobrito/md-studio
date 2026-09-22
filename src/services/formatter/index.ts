import { isWebLanguage, formatWebCode } from "./web";
import type { FormatResponse } from "./types";
import { normalizeLanguage } from "../../markdown/code";

export * from "./types";
export { isWebLanguage, formatWebCode };

export async function formatCode(language: string, code: string): Promise<FormatResponse> {
  if (!code || !code.trim()) {
    return { formatted: false, code, formatter: "none" };
  }

  const norm = normalizeLanguage(language);

  // 1. Web Tier: formatted directly in the frontend via Prettier standalone
  if (isWebLanguage(norm)) {
    return formatWebCode(norm, code);
  }

  // 2. Native CLI Tier (invoked via Tauri IPC if running in desktop shell)
  // In Task 3, this calls invoke("format_code", { language: norm, code })
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const res = await invoke<FormatResponse>("format_code", { language: norm, code });
      return res;
    } catch {
      // Fallback silently if command is not available yet or fails
    }
  }

  // 3. Fallback: preserve original code
  return {
    formatted: false,
    code,
    formatter: "unsupported",
  };
}
