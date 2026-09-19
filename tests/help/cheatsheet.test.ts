import { describe, expect, it } from "vitest";
import { CHEATSHEET_ITEMS } from "../../src/components/help/cheatsheet-items";

describe("Markdown Cheatsheet Items", () => {
  it("contains exactly 20 reference items", () => {
    expect(CHEATSHEET_ITEMS).toHaveLength(20);
  });

  it("covers all essential markdown categories", () => {
    const categories = new Set(CHEATSHEET_ITEMS.map((item) => item.category));
    expect(categories.has("Headings")).toBe(true);
    expect(categories.has("Formatação")).toBe(true);
    expect(categories.has("Listas")).toBe(true);
    expect(categories.has("Links")).toBe(true);
    expect(categories.has("Blocos")).toBe(true);
    expect(categories.has("Alertas")).toBe(true);
    expect(categories.has("Tabelas")).toBe(true);
  });

  it("each item has syntax, result description and copyText", () => {
    for (const item of CHEATSHEET_ITEMS) {
      expect(item.syntax).toBeTruthy();
      expect(item.result).toBeTruthy();
      expect(item.copyText).toBeTruthy();
      expect(typeof item.copyText).toBe("string");
    }
  });

  it("alerts contain note, tip and warning variants", () => {
    const alerts = CHEATSHEET_ITEMS.filter((i) => i.category === "Alertas");
    expect(alerts.some((a) => a.syntax.includes("NOTE"))).toBe(true);
    expect(alerts.some((a) => a.syntax.includes("TIP"))).toBe(true);
    expect(alerts.some((a) => a.syntax.includes("WARNING"))).toBe(true);
  });
});
