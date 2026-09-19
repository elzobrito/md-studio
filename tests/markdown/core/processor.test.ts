import { describe, expect, it } from "vitest";
import { processMarkdown } from "../../../src/markdown/processor";

describe("markdown core", () => {
  it("renders heading", async () => {
    const r = await processMarkdown("# Olá");
    expect(r.html).toContain("Olá");
  });

  it("assigns stable heading ids (sanitize prefix)", async () => {
    const r = await processMarkdown("# Introdução\n\n## Detalhes\n\n## Detalhes");
    expect(r.html).toMatch(/id="user-content-introducao"/);
    expect(r.html).toMatch(/id="user-content-detalhes"/);
    expect(r.html).toMatch(/id="user-content-detalhes-1"/);
  });

  it("strips script tags via sanitize", async () => {
    const r = await processMarkdown('Hello <script>alert(1)</script>');
    expect(r.html.toLowerCase()).not.toContain("<script");
  });
});
