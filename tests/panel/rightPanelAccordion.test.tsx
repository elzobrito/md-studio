import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { DocumentOutline } from "../../src/components/DocumentOutline";
import { OutgoingLinksPanel } from "../../src/components/wiki/OutgoingLinksPanel";
import { BacklinksPanel } from "../../src/components/wiki/BacklinksPanel";
import { Settings } from "../../src/components/Settings";
import type { SessionApi } from "../../src/state/session";
import type { BacklinkResult, ResolvedWikiLink } from "../../src/types/metadata";

describe("MD-UX-RIGHT-PANEL-001: Right Panel Accordion & UX Parity", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);

    // Mock IntersectionObserver
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    return () => {
      if (container.parentElement) {
        document.body.removeChild(container);
      }
    };
  });

  it("DocumentOutline: fecha o painel invocando onClose ao clicar em [×]", async () => {
    let closed = false;
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <DocumentOutline
          content="# MD Studio"
          onNavigate={() => {}}
          onClose={() => {
            closed = true;
          }}
        />
      );
    });

    const closeBtn = container.querySelector<HTMLButtonElement>(".outline-close-btn");
    expect(closeBtn).not.toBeNull();
    expect(closeBtn?.getAttribute("aria-label")).toBe("Fechar painel");

    await act(async () => {
      closeBtn?.click();
    });

    expect(closed).toBe(true);

    act(() => root.unmount());
  });

  it("DocumentOutline: botão de colapsar subtópicos [≡] fica desabilitado quando não há subseções", async () => {
    const root = createRoot(container);

    // Documento com apenas 1 heading (como no print do usuário)
    await act(async () => {
      root.render(<DocumentOutline content="# MD Studio" onNavigate={() => {}} />);
    });

    const collapseAllBtn = container.querySelector<HTMLButtonElement>(".outline-collapse-all-btn");
    expect(collapseAllBtn).not.toBeNull();
    expect(collapseAllBtn?.disabled).toBe(true);
    expect(collapseAllBtn?.title).toBe("Sem subtópicos aninhados para colapsar");

    act(() => root.unmount());
  });

  it("DocumentOutline: botão de colapsar subtópicos [≡] fica habilitado quando há subseções", async () => {
    const root = createRoot(container);

    // Documento com H1 e H2
    await act(async () => {
      root.render(
        <DocumentOutline content={"# MD Studio\n## Subseção"} onNavigate={() => {}} />
      );
    });

    const collapseAllBtn = container.querySelector<HTMLButtonElement>(".outline-collapse-all-btn");
    expect(collapseAllBtn).not.toBeNull();
    expect(collapseAllBtn?.disabled).toBe(false);
    expect(collapseAllBtn?.title).toBe("Colapsar seções");

    act(() => root.unmount());
  });

  it("DocumentOutline: acordeão recolhe e expande o corpo do sumário ao clicar no cabeçalho", async () => {
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <DocumentOutline content={"# Heading 1\n## Heading 2"} onNavigate={() => {}} />
      );
    });

    const toggleBtn = container.querySelector<HTMLButtonElement>(".outline-accordion-toggle");
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn?.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector(".outline-list")).not.toBeNull();
    expect(container.querySelector(".outline-depth-controls")).not.toBeNull();

    // Clicar para recolher o sumário
    await act(async () => {
      toggleBtn?.click();
    });

    expect(toggleBtn?.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector(".outline-list")).toBeNull();
    expect(container.querySelector(".outline-depth-controls")).toBeNull();

    // Clicar para re-expandir o sumário
    await act(async () => {
      toggleBtn?.click();
    });

    expect(toggleBtn?.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector(".outline-list")).not.toBeNull();

    act(() => root.unmount());
  });

  it("OutgoingLinksPanel: acordeão recolhe e expande a lista de links", async () => {
    const root = createRoot(container);
    const mockLinks: ResolvedWikiLink[] = [
      {
        target: "nota",
        alias: null,
        candidates: [],
        path: "nota.md",
        line: 1,
        status: "resolved",
      },
    ];

    await act(async () => {
      root.render(
        <OutgoingLinksPanel
          links={mockLinks}
          onOpen={() => {}}
          onUnresolved={() => {}}
        />
      );
    });

    const header = container.querySelector<HTMLElement>(".panel-accordion-header");
    expect(header).not.toBeNull();
    expect(header?.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector("ul")).not.toBeNull();

    // Clicar para colapsar
    await act(async () => {
      header?.click();
    });

    expect(header?.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector("ul")).toBeNull();

    act(() => root.unmount());
  });

  it("BacklinksPanel: acordeão recolhe e expande a lista de backlinks", async () => {
    const root = createRoot(container);
    const mockResult: BacklinkResult = {
      targetPath: "doc.md",
      documentCount: 0,
      occurrenceCount: 0,
      groups: [],
    };

    await act(async () => {
      root.render(<BacklinksPanel result={mockResult} />);
    });

    const header = container.querySelector<HTMLElement>(".panel-accordion-header");
    expect(header).not.toBeNull();
    expect(header?.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector(".outgoing-links-empty")).not.toBeNull();

    // Clicar para colapsar
    await act(async () => {
      header?.click();
    });

    expect(header?.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector(".outgoing-links-empty")).toBeNull();

    act(() => root.unmount());
  });

  it("Settings: inicia recolhido e expande ao clicar no acordeão", async () => {
    const root = createRoot(container);
    const mockSession: Partial<SessionApi> = {
      viewMode: "split",
      setViewMode: vi.fn(),
    };

    await act(async () => {
      root.render(<Settings session={mockSession as SessionApi} />);
    });

    const header = container.querySelector<HTMLElement>(".panel-accordion-header");
    expect(header).not.toBeNull();
    expect(header?.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector("select")).toBeNull();

    // Clicar para expandir
    await act(async () => {
      header?.click();
    });

    expect(header?.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector("select")).not.toBeNull();

    act(() => root.unmount());
  });
});
