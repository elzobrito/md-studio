import { describe, expect, it } from "vitest";
import { normalizeLanguage } from "../../../src/markdown/code";

describe("code", () => {
  it("allowlists languages", () => {
    expect(normalizeLanguage("typescript")).toBe("typescript");
    expect(normalizeLanguage("foobar")).toBe("text");
  });
});
