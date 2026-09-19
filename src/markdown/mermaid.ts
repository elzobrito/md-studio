export async function renderMermaid(id: string, source: string): Promise<{ svg?: string; error?: string }> {
  try {
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "neutral",
    });
    const { svg } = await mermaid.render(id, source);
    return { svg };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Mermaid error" };
  }
}
