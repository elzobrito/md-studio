import { describe, expect, it } from "vitest";
import { exportHtmlDocument } from "../../src/services/export";

describe("export", () => {
  it("produces standalone sanitized html matching preview pipeline", async () => {
    const html = await exportHtmlDocument("# Title\n\nHi **there**\n\n<script>alert(1)</script>");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Title");
    expect(html).toContain("there");
    // Must be rendered HTML, not the old <pre> markdown stub
    expect(html).not.toMatch(/<body><pre>/);
    // Script from source must not survive sanitize
    expect(html).not.toContain("<script>");
  });
});
