import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { SaveButton } from "../../src/components/header/SaveButton";
import { WelcomeScreen } from "../../src/components/empty/WelcomeScreen";
import { EmptyState } from "../../src/components/empty/EmptyState";
import { NewDocumentModal } from "../../src/components/editor/NewDocumentModal";

describe("MD-UI-BUTTONS-001: Design System Button Migration Hotspots", () => {
  it("renders SaveButton using design system Button with correct variants and size", () => {
    const htmlSaved = renderToString(
      <SaveButton status="saved" onSave={() => {}} />
    );
    expect(htmlSaved).toContain("btn");
    expect(htmlSaved).toContain("btn-secondary");
    expect(htmlSaved).toContain("btn-size-sm");

    const htmlModified = renderToString(
      <SaveButton status="modified" onSave={() => {}} />
    );
    expect(htmlModified).toContain("btn");
    expect(htmlModified).toContain("btn-primary");
    expect(htmlModified).toContain("btn-size-sm");
  });

  it("renders WelcomeScreen CTAs with design system Button components", () => {
    const html = renderToString(
      <WelcomeScreen
        onOpenFolder={() => {}}
        onOpenFile={() => {}}
        onOpenRecent={() => {}}
        onNewDocument={() => {}}
      />
    );

    expect(html).toContain("btn");
    expect(html).toContain("btn-primary");
    expect(html).toContain("btn-secondary");
    expect(html).toContain("btn-ghost");
    expect(html).toContain("btn-size-md");
  });

  it("renders EmptyState CTA with design system Button", () => {
    const html = renderToString(
      <EmptyState onQuickSwitch={() => {}} onNewDocument={() => {}} />
    );

    expect(html).toContain("btn");
    expect(html).toContain("btn-secondary");
    expect(html).toContain("btn-size-md");
    expect(html).toContain("Escrever Novo Documento");
  });

  it("renders NewDocumentModal with Cancelar and Criar Documento Button actions", async () => {
    const { act } = await import("react");
    const { createRoot } = await import("react-dom/client");
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <NewDocumentModal
          isOpen={true}
          onClose={() => {}}
          onSelectTemplate={() => {}}
        />
      );
    });

    expect(document.body.innerHTML).toContain("Cancelar");
    expect(document.body.innerHTML).toContain("Criar Documento");
    expect(document.body.innerHTML).toContain("btn-secondary");
    expect(document.body.innerHTML).toContain("btn-primary");

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
