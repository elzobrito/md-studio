import { describe, expect, it } from "vitest";
import { exportHtmlDocument } from "../../src/services/export";

describe("export", () => {
  it("produces standalone html", async () => {
    const html = await exportHtmlDocument("# Title\n\nHi");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Hi");
  });
});
