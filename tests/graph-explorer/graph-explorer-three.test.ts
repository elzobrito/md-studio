import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("TCG graph explorer Three.js 2D renderer", () => {
  it("serves a WebGL canvas instead of an SVG scene", () => {
    const html = read("public/graph_explorer.html");
    expect(html).toContain('id="graph-canvas"');
    expect(html).toContain('id="label-canvas"');
    expect(html).toContain('src="./graph_explorer.js"');
    expect(html).not.toContain("<svg");
    expect(html).not.toMatch(/cdn\.|unpkg\.com|jsdelivr/i);
    expect(html).toContain('id="embedded-graph"');
  });

  it("keeps d3-force layout and interpolates node positions", () => {
    const js = read("public/graph_explorer.js");
    expect(js).toContain('from "./vendor/three.module.min.js"');
    expect(js).toContain("OrthographicCamera");
    expect(js).toContain("InstancedMesh");
    expect(js).toContain("forceSimulation");
    expect(js).toContain("SMOOTH");
    expect(js).toMatch(/dispX \+= \(n\.x - n\.dispX\) \* SMOOTH/);
    expect(js).not.toMatch(/cdn\.|unpkg\.com|jsdelivr/i);
  });

  it("vendors three.module.min.js and its MIT license", () => {
    expect(existsSync(resolve(root, "public/vendor/three.module.min.js"))).toBe(true);
    const license = read("public/vendor/THREE-LICENSE.txt");
    expect(license).toMatch(/MIT License/i);
    expect(license).toMatch(/three\.js authors/i);
  });
});
