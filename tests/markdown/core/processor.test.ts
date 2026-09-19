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

  it("renders wiki targets and aliases as sanitized links", async () => {
    const r = await processMarkdown("See [[Guide]] and [[API|the API]].", {
      wikiLinks: [{ target: "Guide", status: "resolved", path: "docs/guide.md" }],
    });
    expect(r.html).toContain(
      'class="wiki-link is-resolved" href="#" data-wiki-target="Guide" data-wiki-status="resolved" data-wiki-path="docs/guide.md">Guide</a>',
    );
    expect(r.html).toContain(
      'class="wiki-link is-unresolved" href="#" data-wiki-target="API" data-wiki-status="unresolved">the API</a>',
    );
  });

  it("does not transform wiki syntax inside code", async () => {
    const r = await processMarkdown("`[[literal]]`");
    expect(r.html).toContain("[[literal]]");
    expect(r.html).not.toContain("wiki-link");
  });
});
