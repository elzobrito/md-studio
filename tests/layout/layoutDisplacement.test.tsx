import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const styleFiles = [
  "design-tokens.css",
  "app-shell.css",
  "statusbar.css",
  "document-tabs.css",
  "split-view.css",
  "layout.css",
  "themes.css",
];

function installStyles() {
  const styles = document.createElement("style");
  styles.textContent = styleFiles
    .map((file) => readFileSync(resolve(process.cwd(), "src/styles", file), "utf8"))
    .join("\n")
    .replace(/^\s*@import[^;]+;\s*$/gm, "");
  document.head.append(styles);
  return styles;
}

describe("MD-HOTFIX-LAYOUT-DISPLACEMENT-001: layout displacement & containment", () => {
  let styles: HTMLStyleElement | undefined;

  afterEach(() => {
    document.body.replaceChildren();
    styles?.remove();
    styles = undefined;
  });

  it("verifies layout containment styles prevent window and panel displacement", () => {
    styles = installStyles();

    const panel = document.createElement("aside");
    panel.className = "resizable-panel";
    const panelContent = document.createElement("div");
    panelContent.className = "resizable-panel-content";
    panel.append(panelContent);

    const workspace = document.createElement("div");
    workspace.className = "workspace";
    const center = document.createElement("main");
    center.className = "center mode-source";
    const docbar = document.createElement("div");
    docbar.className = "document-bar";
    const surface = document.createElement("div");

    center.append(docbar, surface);
    workspace.append(panel, center);
    document.body.append(workspace);

    const panelStyle = getComputedStyle(panel);
    const panelContentStyle = getComputedStyle(panelContent);
    const workspaceStyle = getComputedStyle(workspace);
    const centerStyle = getComputedStyle(center);

    // Resizable panel must contain its overflow and not spill into window
    expect(panelStyle.overflow).toBe("hidden");
    expect(panelContentStyle.overflow).toBe("auto");

    // Workspace and center must have height: 100% and overflow: hidden
    expect(workspaceStyle.overflow).toBe("hidden");
    expect(workspaceStyle.height).toBe("100%");
    expect(centerStyle.overflow).toBe("hidden");
    expect(centerStyle.height).toBe("100%");
  });

  it("verifies responsive rule constrains sidebar container at <= 960px", () => {
    const themesCss = readFileSync(resolve(process.cwd(), "src/styles/themes.css"), "utf8");
    const responsiveStart = themesCss.indexOf("@media (max-width: 960px)");
    expect(responsiveStart).toBeGreaterThanOrEqual(0);
    const responsiveBlock = themesCss.slice(responsiveStart, themesCss.indexOf("}", responsiveStart + 200));

    expect(responsiveBlock).toContain(".workspace-sidebar-container");
    expect(responsiveBlock).toContain("max-height: 28vh");
  });
});
