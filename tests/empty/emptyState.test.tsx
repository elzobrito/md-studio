import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { WelcomeScreen } from "../../src/components/empty/WelcomeScreen";
import { EmptyState } from "../../src/components/empty/EmptyState";

describe("MD-UI-EMPTY-001: Empty State & Welcome Screen Hierarchy", () => {
  it("renders WelcomeScreen with Abrir Pasta as primary, Abrir Arquivo as secondary, and Novo Documento as ghost", () => {
    const html = renderToString(
      <WelcomeScreen
        onOpenFolder={() => {}}
        onOpenFile={() => {}}
        onOpenRecent={() => {}}
        onNewDocument={() => {}}
      />
    );

    // Primary CTA is Abrir Pasta
    expect(html).toContain("empty-state-btn primary");
    expect(html).toContain("btn-primary");
    expect(html).toContain("Abrir Pasta");

    // Secondary CTA is Abrir Arquivo
    expect(html).toContain("empty-state-btn secondary");
    expect(html).toContain("btn-secondary");
    expect(html).toContain("Abrir Arquivo");

    // Ghost / tertiary CTA is Novo Documento
    expect(html).toContain("empty-state-btn ghost");
    expect(html).toContain("btn-ghost");
    expect(html).toContain("Novo Documento");

    // Order check: Abrir Pasta appears before Abrir Arquivo, which appears before Novo Documento
    const folderIdx = html.indexOf("Abrir Pasta");
    const fileIdx = html.indexOf("Abrir Arquivo");
    const newDocIdx = html.indexOf("Novo Documento");
    expect(folderIdx).toBeLessThan(fileIdx);
    expect(fileIdx).toBeLessThan(newDocIdx);
  });

  it("does not render interrogation mark (?) icon and displays Ctrl+P hint", () => {
    const html = renderToString(
      <WelcomeScreen
        onOpenFolder={() => {}}
        onOpenFile={() => {}}
        onOpenRecent={() => {}}
      />
    );

    expect(html).not.toContain("?");
    expect(html).toContain("📝");
    expect(html).toContain("Ctrl+P");
  });

  it("renders EmptyState with concise copy, no app title, no ? icon, and Ctrl+P hint", () => {
    const html = renderToString(
      <EmptyState
        onQuickSwitch={() => {}}
        onNewDocument={() => {}}
      />
    );

    expect(html).toContain("Selecione um arquivo na árvore");
    expect(html).not.toContain("<h1>MD Studio</h1>");
    expect(html).not.toContain("?");
    expect(html).toContain("Ctrl+P");
    expect(html).toContain("📄");
  });
});
