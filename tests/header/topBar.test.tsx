import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { AppHeader } from "../../src/components/header/AppHeader";
import { ViewModeToggle } from "../../src/components/header/ViewModeToggle";
import { formatWindowTitle } from "../../src/hooks/useSaveStatus";

describe("MD-UI-HEADER-001: Header Polish & Dynamic Window Title", () => {
  it("does not render internal 'MD Studio' branding text in AppHeader", () => {
    const html = renderToString(
      <AppHeader
        viewMode="source"
        onViewModeChange={() => {}}
        leftOpen={true}
        rightOpen={true}
        onToggleLeft={() => {}}
        onToggleRight={() => {}}
        onSave={() => {}}
        canSave={true}
      />
    );

    expect(html).not.toContain("<strong>MD Studio</strong>");
    expect(html).not.toContain("brand-mark");
  });

  it("formats window title dynamically according to spec", () => {
    // Sem arquivo: "MD Studio"
    expect(formatWindowTitle()).toBe("MD Studio");
    expect(formatWindowTitle("")).toBe("MD Studio");

    // Com arquivo: "MD Studio — nome.md"
    expect(formatWindowTitle("documento.md", false)).toBe("MD Studio — documento.md");

    // Dirty: "MD Studio — ● nome.md"
    expect(formatWindowTitle("documento.md", true)).toBe("MD Studio — ● documento.md");
  });

  it("renders ViewModeToggle with Button components and proper active states", () => {
    const html = renderToString(
      <ViewModeToggle current="source" onChange={() => {}} />
    );

    expect(html).toContain("btn");
    expect(html).toContain("btn-primary");
    expect(html).toContain("btn-ghost");
    expect(html).toContain("Markdown");
    expect(html).toContain("Formatado");
    expect(html).toContain("Dividida");
  });
});
