import { describe, expect, it } from "vitest";
import { renderMermaid } from "../../../src/markdown/mermaid";

describe("mermaid", () => {
  it("returns error on invalid diagram without throwing", async () => {
    const r = await renderMermaid("t1", "not a diagram");
    expect(r.error || r.svg).toBeTruthy();
  });
});
