import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { Button } from "../../src/components/ui/Button";

describe("MD-UI-SIDEBAR-001: Button Component & Sidebar Hierarchy", () => {
  it("renders Button with primary variant, size md, and icon", () => {
    const html = renderToString(
      <Button variant="primary" size="md" icon={<span>📁</span>}>
        Abrir pasta
      </Button>
    );

    expect(html).toContain("btn");
    expect(html).toContain("btn-primary");
    expect(html).toContain("btn-size-md");
    expect(html).toContain("btn-icon");
    expect(html).toContain("📁");
    expect(html).toContain("Abrir pasta");
  });

  it("renders Button with secondary variant, sm size, and fullWidth", () => {
    const html = renderToString(
      <Button variant="secondary" size="sm" fullWidth>
        Abrir arquivo
      </Button>
    );

    expect(html).toContain("btn-secondary");
    expect(html).toContain("btn-size-sm");
    expect(html).toContain("btn-full-width");
  });

  it("renders Button with ghost variant and disabled state", () => {
    const html = renderToString(
      <Button variant="ghost" disabled>
        Ghost Action
      </Button>
    );

    expect(html).toContain("btn-ghost");
    expect(html).toContain("disabled");
  });
});
