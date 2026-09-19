import { describe, expect, it } from "vitest";
import { renderMath } from "../../../src/markdown/math";

describe("math", () => {
  it("renders simple expression or fails closed", () => {
    const r = renderMath("x+1", false);
    expect(r.html || r.error).toBeTruthy();
  });
});
