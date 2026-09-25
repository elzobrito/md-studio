import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import {
  HoverPreview,
  isSafeWorkspacePath,
  type HoverPreviewData,
} from "../../src/components/editor/HoverPreview";
import { MarkdownViewer } from "../../src/components/MarkdownViewer";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Mock metadata IPC
vi.mock("../../src/lib/ipc/metadata", () => ({
  getDocumentMetadata: vi.fn().mockImplementation(async (path: string) => {
    if (path.includes("inexistente")) return null;
    return {
      path,
      title: "Guia de Arquitetura",
      headings: [
        { depth: 1, text: "Introdução", anchor: "introducao" },
        { depth: 2, text: "Componentes", anchor: "componentes" },
      ],
      links: [],
      wikiLinks: [],
      tags: ["arquitetura", "docs"],
      images: [],
      tables: 0,
      mermaidBlocks: 0,
      katexBlocks: 0,
      wordCount: 350,
      lineCount: 45,
      lastModified: 1700000000,
    };
  }),
  resolveWikiLink: vi.fn().mockImplementation(async (target: string) => {
    if (target === "Ambiguo") {
      return {
        target,
        alias: null,
        line: 0,
        status: "ambiguous",
        path: null,
        candidates: ["docs/ambiguo-1.md", "sub/ambiguo-2.md"],
      };
    }
    if (target === "Inexistente") {
      return {
        target,
        alias: null,
        line: 0,
        status: "unresolved",
        path: null,
        candidates: [],
      };
    }
    return {
      target,
      alias: null,
      line: 0,
      status: "resolved",
      path: "docs/guia.md",
      candidates: ["docs/guia.md"],
    };
  }),
}));

describe("MD-V03-025: Hover Previews locais, sanitizados e canceláveis", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    vi.clearAllMocks();
  });

  describe("Path Fence Security (isSafeWorkspacePath)", () => {
    it("permite caminhos relativos seguros dentro do workspace", () => {
      expect(isSafeWorkspacePath("notes.md")).toBe(true);
      expect(isSafeWorkspacePath("docs/guia.md")).toBe(true);
      expect(isSafeWorkspacePath("sub/folder/file.md")).toBe(true);
      expect(isSafeWorkspacePath("./rel/doc.md")).toBe(true);
    });

    it("bloqueia caminhos fora da fronteira do workspace (path fence)", () => {
      expect(isSafeWorkspacePath("../outside.md")).toBe(false);
      expect(isSafeWorkspacePath("docs/../../escape.md")).toBe(false);
      expect(isSafeWorkspacePath("/etc/passwd")).toBe(false);
      expect(isSafeWorkspacePath("C:\\Windows\\System32")).toBe(false);
      expect(isSafeWorkspacePath("https://external.com/doc.md")).toBe(false);
      expect(isSafeWorkspacePath("file:///root/file.md")).toBe(false);
    });
  });

  describe("HoverPreview Component Rendering and Sanitization", () => {
    it("não renderiza nada se data for null", async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(<HoverPreview data={null} position={{ x: 100, y: 100 }} />);
      });

      expect(container.innerHTML).toBe("");
      act(() => {
        root.unmount();
      });
    });

    it("renderiza estado resolved com título, path, trecho, headings e metadata sem diagramas", async () => {
      const resolvedData: HoverPreviewData = {
        target: "docs/guia.md",
        status: "resolved",
        path: "docs/guia.md",
        title: "Guia de Arquitetura",
        snippet: "Primeira seção: Introdução",
        headings: [
          { depth: 1, text: "Introdução", anchor: "introducao" },
          { depth: 2, text: "Componentes", anchor: "componentes" },
        ],
        tags: ["arquitetura"],
        wordCount: 350,
      };

      const root = createRoot(container);
      await act(async () => {
        root.render(<HoverPreview data={resolvedData} position={{ x: 50, y: 50 }} />);
      });

      const tooltip = container.querySelector(".hover-preview-popover");
      expect(tooltip).not.toBeNull();
      expect(tooltip?.textContent).toContain("Guia de Arquitetura");
      expect(tooltip?.textContent).toContain("docs/guia.md");
      expect(tooltip?.textContent).toContain("Primeira seção: Introdução");
      expect(tooltip?.textContent).toContain("Introdução");
      expect(tooltip?.textContent).toContain("Componentes");
      expect(tooltip?.textContent).toContain("350 palavras");
      expect(tooltip?.textContent).toContain("#arquitetura");

      // Verificação sanitizada: proíbe diagramas Mermaid, KaTeX e raw HTML executável
      expect(tooltip?.querySelector(".mermaid-diagram-container")).toBeNull();
      expect(tooltip?.querySelector(".katex")).toBeNull();
      expect(tooltip?.querySelector("script")).toBeNull();

      act(() => {
        root.unmount();
      });
    });

    it("renderiza estado unresolved explicando que o destino não existe", async () => {
      const unresolvedData: HoverPreviewData = {
        target: "Nota Fantasma",
        status: "unresolved",
      };

      const root = createRoot(container);
      await act(async () => {
        root.render(<HoverPreview data={unresolvedData} position={{ x: 50, y: 50 }} />);
      });

      const tooltip = container.querySelector(".hover-preview-popover");
      expect(tooltip).not.toBeNull();
      expect(tooltip?.textContent).toContain("Não Encontrado");
      expect(tooltip?.textContent).toContain("Nota Fantasma");
      expect(tooltip?.textContent).toContain("Destino não existe no workspace");

      act(() => {
        root.unmount();
      });
    });

    it("renderiza estado ambiguous listando os candidatos disponíveis", async () => {
      const ambiguousData: HoverPreviewData = {
        target: "Ambiguo",
        status: "ambiguous",
        candidates: ["docs/ambiguo-1.md", "sub/ambiguo-2.md"],
      };

      const root = createRoot(container);
      await act(async () => {
        root.render(<HoverPreview data={ambiguousData} position={{ x: 50, y: 50 }} />);
      });

      const tooltip = container.querySelector(".hover-preview-popover");
      expect(tooltip).not.toBeNull();
      expect(tooltip?.textContent).toContain("Destino Ambíguo");
      expect(tooltip?.textContent).toContain("Ambiguo");
      expect(tooltip?.textContent).toContain("docs/ambiguo-1.md");
      expect(tooltip?.textContent).toContain("sub/ambiguo-2.md");

      act(() => {
        root.unmount();
      });
    });
  });

  describe("MarkdownViewer Hover Interaction and Cancellation", () => {
    it("mostra hover preview ao passar o mouse em link e cancela ao sair", async () => {
      const markdown = `
# Teste de Links

Veja o [[Guia]] para detalhes ou [link local](docs/guia.md).
Também temos [[Inexistente]].
      `;

      const root = createRoot(container);
      await act(async () => {
        root.render(
          <MarkdownViewer
            content={markdown}
            relativePath="index.md"
            wikiLinks={[
              {
                target: "Guia",
                alias: null,
                line: 3,
                status: "resolved",
                path: "docs/guia.md",
                candidates: ["docs/guia.md"],
              },
              {
                target: "Inexistente",
                alias: null,
                line: 4,
                status: "unresolved",
                path: null,
                candidates: [],
              },
            ]}
          />,
        );
      });

      // Allow markdown processor to render
      let link: HTMLAnchorElement | null = null;
      for (let i = 0; i < 20; i++) {
        await act(async () => {
          await new Promise((r) => setTimeout(r, 50));
        });
        link = container.querySelector<HTMLAnchorElement>("a");
        if (link) break;
      }
      expect(link).not.toBeNull();

      // Trigger mouseover
      await act(async () => {
        link!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      });

      // Initially not visible before timer delay (200ms)
      expect(container.querySelector(".hover-preview-popover")).toBeNull();

      // Advance past delay
      await act(async () => {
        await new Promise((r) => setTimeout(r, 260));
      });

      // Now popover should be visible with document info
      const popover = container.querySelector(".hover-preview-popover");
      expect(popover).not.toBeNull();
      expect(popover?.textContent).toContain("Guia");

      // Trigger mouseout (cancel/dismiss)
      const liveLink = container.querySelector<HTMLAnchorElement>(".preview-body a");
      expect(liveLink).not.toBeNull();
      await act(async () => {
        liveLink!.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 200));
      });

      // Popover should be closed after leave
      expect(container.querySelector(".hover-preview-popover")).toBeNull();

      act(() => {
        root.unmount();
      });
    });
  });
});
