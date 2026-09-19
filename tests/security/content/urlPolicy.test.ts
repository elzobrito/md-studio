import { describe, expect, it } from "vitest";
import { allowUrl } from "../../../src/security/urlPolicy";

describe("url policy", () => {
  it("blocks javascript", () => {
    expect(allowUrl("javascript:alert(1)")).toBe(false);
  });
  it("allows relative", () => {
    expect(allowUrl("./a.md")).toBe(true);
  });
  it("blocks remote by default", () => {
    expect(allowUrl("https://example.com/x.png")).toBe(false);
  });
});
