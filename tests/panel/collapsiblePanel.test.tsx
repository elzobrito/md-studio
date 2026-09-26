import { describe, expect, it, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { DocumentOutline } from "../../src/components/DocumentOutline";
import { StatusBar } from "../../src/components/statusbar/StatusBar";
import { uiStore } from "../../src/state/ui";

describe("MD-UI-PANEL-001: Collapsible Right Panel & StatusBar", () => {
  beforeEach(() => {
    localStorage.clear();
    uiStore.setRight(true);
  });

  it("renders DocumentOutline with a collapse sections button (≡) having aria-label and title", () => {
    const html = renderToString(
      <DocumentOutline
        content="# Hello\n## Sub"
        onNavigate={() => {}}
      />
    );

    expect(html).toContain('class="outline-collapse-all-btn"');
    expect(html).toContain('title="Colapsar seções"');
    expect(html).toContain('≡');
  });

  it("renders [sumário] button in StatusBar when rightOpen is false", () => {
    const htmlClosed = renderToString(
      <StatusBar
        viewMode="source"
        rightOpen={false}
      />
    );

    expect(htmlClosed).toContain('class="status-bar-btn status-bar-summary-btn"');
    expect(htmlClosed).toContain('[sumário]');
    expect(htmlClosed).toContain('aria-label="Abrir sumário"');
  });

  it("does not render [sumário] button in StatusBar when rightOpen is true", () => {
    const htmlOpen = renderToString(
      <StatusBar
        viewMode="source"
        rightOpen={true}
      />
    );

    expect(htmlOpen).not.toContain('[sumário]');
  });

  it("persists rightPanelVisible in localStorage across toggle and set", () => {
    expect(uiStore.getState().rightPanelVisible).toBe(true);

    uiStore.setRight(false);
    expect(uiStore.getState().rightPanelVisible).toBe(false);

    const stored = JSON.parse(localStorage.getItem("md-studio.ui-state") || "{}");
    expect(stored.rightPanelVisible).toBe(false);

    uiStore.toggleRight();
    expect(uiStore.getState().rightPanelVisible).toBe(true);

    const storedAfterToggle = JSON.parse(localStorage.getItem("md-studio.ui-state") || "{}");
    expect(storedAfterToggle.rightPanelVisible).toBe(true);
  });
});
