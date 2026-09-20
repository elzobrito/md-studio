import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ExportPdfButton } from "../../src/components/header/ExportPdfButton";
import { AppHeader } from "../../src/components/header/AppHeader";

const baseHeaderProps = {
  viewMode: "preview" as const,
  onViewModeChange: () => {},
  leftOpen: true,
  rightOpen: true,
  onToggleLeft: () => {},
  onToggleRight: () => {},
  onSave: () => {},
  canSave: true,
};

describe("Exportar PDF pelo diálogo nativo", () => {
  it("aciona o callback pelo botão habilitado", () => {
    const onExport = vi.fn();
    const element = ExportPdfButton({ onExport, disabled: false });

    expect(element.props["aria-label"]).toBe("Exportar PDF");
    element.props.onClick();
    expect(onExport).toHaveBeenCalledOnce();
  });

  it("fica desabilitado quando não há documento ativo", () => {
    const html = renderToString(<ExportPdfButton onExport={() => {}} disabled />);

    expect(html).toContain("Exportar PDF");
    expect(html).toContain("disabled");
    expect(html).toContain("Nenhum documento aberto para exportar");
  });

  it("aparece imediatamente depois de Exportar HTML no cabeçalho", () => {
    const html = renderToString(
      <AppHeader
        {...baseHeaderProps}
        canExport
        onExportHtml={() => {}}
        onExportPdf={() => {}}
      />,
    );

    expect(html.indexOf("Exportar HTML")).toBeGreaterThan(-1);
    expect(html.indexOf("Exportar PDF")).toBeGreaterThan(html.indexOf("Exportar HTML"));
  });

  it("carrega CSS que imprime somente o preview formatado", () => {
    const css = readFileSync("src/styles/print.css", "utf8");

    expect(css).toContain("@media print");
    expect(css).toMatch(/\.app-header[\s\S]*display:\s*none\s*!important/);
    expect(css).toMatch(/\.editor[\s\S]*display:\s*none\s*!important/);
    expect(css).toMatch(/\.preview-body[\s\S]*max-width:\s*100%\s*!important/);
    expect(css).toContain("break-inside: avoid");
  });

  it("força contraste legível em code blocks e syntax highlighting no PDF", () => {
    const css = readFileSync("src/styles/print.css", "utf8");

    expect(css).toMatch(/\.preview-body pre\s*\{[\s\S]*color:\s*#111827\s*!important/);
    expect(css).toMatch(/\.preview-body pre\s*\{[\s\S]*background:\s*#f3f4f6\s*!important/);
    expect(css).toMatch(/\.preview-body pre code \*[\s\S]*color:\s*#111827\s*!important/);
    expect(css).toContain("white-space: pre-wrap !important");
    expect(css).toContain("overflow-wrap: anywhere");
  });
});
