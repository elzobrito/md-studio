import { describe, expect, it, vi, beforeEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DocumentOutline } from "../../src/components/DocumentOutline";
import { extractOutline } from "../../src/services/navigation";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("MD-UX-TOC-MODE-001: sumário respeita o modo de vista", () => {
  beforeEach(() => {
    (globalThis as any).IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  const sampleMarkdown = ["# Introdução", "", "## Instalação", "texto"].join("\n");

  it("clique no item do sumário envia slug e linha do heading", async () => {
    const onNavigate = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<DocumentOutline content={sampleMarkdown} onNavigate={onNavigate} />);
    });

    const items = Array.from(container.querySelectorAll<HTMLElement>(".outline-item"));
    expect(items.length).toBe(2);

    await act(async () => {
      items[1].click();
    });

    expect(onNavigate).toHaveBeenCalledWith("instalacao", 3);

    act(() => {
      root.unmount();
      document.body.removeChild(container);
    });
  });

  it("goToHeading em App.tsx não força preview e navega o editor no modo source", () => {
    const src = readFileSync(resolve("src/App.tsx"), "utf8");
    const match = src.match(
      /const goToHeading = useCallback\(\s*\([\s\S]*?\},\s*\[[^\]]*\],\s*\);/,
    );
    expect(match).not.toBeNull();
    const body = match![0];
    expect(body).not.toMatch(/setViewMode/);
    expect(body).toContain("editorStore.goToLine");
    expect(body).toContain('view === "source"');
    expect(body).toContain("scrollToHeading");
  });

  it("linha ausente no clique é derivável pelo outline", () => {
    const items = extractOutline(sampleMarkdown);
    expect(items.find((it) => it.id === "introducao")?.line).toBe(1);
    expect(items.find((it) => it.id === "instalacao")?.line).toBe(3);
  });
});
