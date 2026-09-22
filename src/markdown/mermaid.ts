let mermaidSeq = 0;

export interface RenderMermaidOptions {
  isDark?: boolean;
  theme?: "default" | "dark" | "neutral" | "forest" | "base";
}

export async function renderMermaid(
  id: string,
  source: string,
  options?: RenderMermaidOptions,
): Promise<{ svg?: string; error?: string }> {
  const trimmed = source.trim();
  if (!trimmed) {
    return { error: "Diagrama vazio" };
  }

  const cleanId = `${id.replace(/[^a-zA-Z0-9_-]/g, "")}-${++mermaidSeq}`;

  try {
    const mermaid = (await import("mermaid")).default;
    const isDark = options?.isDark ?? false;
    const selectedTheme = options?.theme ?? (isDark ? "dark" : "neutral");

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: selectedTheme,
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    });

    const { svg } = await mermaid.render(cleanId, trimmed);
    return { svg };
  } catch (e) {
    // Mermaid can leak temporary error containers into document.body on parse error
    if (typeof document !== "undefined") {
      const leaked = document.querySelectorAll(`[id*="${cleanId}"], [id^="d${cleanId}"]`);
      leaked.forEach((el) => {
        if (el.parentNode === document.body) {
          el.remove();
        }
      });
    }
    return { error: e instanceof Error ? e.message : "Mermaid error" };
  }
}
