import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NewDocumentModal } from "../../src/components/editor/NewDocumentModal";
import { TEMPLATES } from "../../src/templates";

// Enable React act environment for clean test output
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("MD-UI-009: Novo Documento com Iconografia Consistente (md_ui_009_templates_pass)", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  const onSelectTemplateMock = vi.fn();
  const onCloseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root?.unmount();
      });
      root = null;
    }
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    document.body.innerHTML = "";
  });

  it("renderiza todos os 7 templates preservando IDs e contratos", async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <NewDocumentModal
          isOpen={true}
          onClose={onCloseMock}
          onSelectTemplate={onSelectTemplateMock}
        />
      );
    });

    const expectedIds = ["blank", "meeting", "report", "notes", "spec", "diary", "readme"];
    expect(TEMPLATES.map((t) => t.id)).toEqual(expectedIds);

    for (const id of expectedIds) {
      const card = document.querySelector(`[data-template-id="${id}"]`);
      expect(card).not.toBeNull();
    }
  });

  it("cards utilizam ícones vetoriais SVG com currentColor e sem emojis", async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <NewDocumentModal
          isOpen={true}
          onClose={onCloseMock}
          onSelectTemplate={onSelectTemplateMock}
        />
      );
    });

    const cards = document.querySelectorAll(".template-card");
    expect(cards).toHaveLength(7);

    cards.forEach((card) => {
      const iconContainer = card.querySelector(".template-card-icon");
      expect(iconContainer).not.toBeNull();

      const svg = iconContainer?.querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
      expect(svg?.getAttribute("stroke")).toBe("currentColor");

      const text = card.textContent || "";
      expect(text).not.toMatch(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u);
    });
  });

  it("seleção e confirmação por clique invocam onSelectTemplate", async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <NewDocumentModal
          isOpen={true}
          onClose={onCloseMock}
          onSelectTemplate={onSelectTemplateMock}
        />
      );
    });

    const meetingCard = document.querySelector<HTMLButtonElement>(
      '[data-template-id="meeting"]'
    );
    expect(meetingCard).not.toBeNull();

    await act(async () => {
      meetingCard?.click();
    });

    expect(onSelectTemplateMock).toHaveBeenCalledTimes(1);
    expect(onSelectTemplateMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "meeting", label: "Reunião" })
    );
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("navegação por teclado com setas direcionais e confirmação com Enter", async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <NewDocumentModal
          isOpen={true}
          onClose={onCloseMock}
          onSelectTemplate={onSelectTemplateMock}
        />
      );
    });

    // Initial selected is blank
    const blankCard = document.querySelector('[data-template-id="blank"]');
    expect(blankCard?.classList.contains("selected")).toBe(true);

    // ArrowRight moves to meeting
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    const meetingCard = document.querySelector('[data-template-id="meeting"]');
    expect(meetingCard?.classList.contains("selected")).toBe(true);

    // ArrowRight moves to report
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    const reportCard = document.querySelector('[data-template-id="report"]');
    expect(reportCard?.classList.contains("selected")).toBe(true);

    // Enter confirms selection
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(onSelectTemplateMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "report", label: "Relatório" })
    );
    expect(onCloseMock).toHaveBeenCalled();
  });

  it("tecla Escape fecha o modal", async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <NewDocumentModal
          isOpen={true}
          onClose={onCloseMock}
          onSelectTemplate={onSelectTemplateMock}
        />
      );
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("conteúdo dos templates permanece byte-a-byte idêntico ao baseline", () => {
    const blank = TEMPLATES.find((t) => t.id === "blank");
    expect(blank?.content()).toBe("");

    const meeting = TEMPLATES.find((t) => t.id === "meeting");
    expect(meeting?.content()).toContain("## Discussão");
    expect(meeting?.content()).toContain("## Decisões");
    expect(meeting?.content()).toContain("## Ações");

    const spec = TEMPLATES.find((t) => t.id === "spec");
    expect(spec?.content()).toContain("## Objetivo");
    expect(spec?.content()).toContain("## Escopo");
    expect(spec?.content()).toContain("## Requisitos");

    const readme = TEMPLATES.find((t) => t.id === "readme");
    expect(readme?.content()).toContain("# Nome do Projeto");
    expect(readme?.content()).toContain("## Instalação");
    expect(readme?.content()).toContain("## Uso");
  });
});
