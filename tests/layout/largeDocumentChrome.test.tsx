import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const styleFiles = [
  "design-tokens.css",
  "app-shell.css",
  "statusbar.css",
  "document-tabs.css",
  "split-view.css",
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

function createLongDocumentShell(mode: "source" | "preview" | "split") {
  const shell = document.createElement("div");
  shell.className = "app-shell";

  const header = document.createElement("header");
  header.className = "global-appbar";

  const workspace = document.createElement("div");
  workspace.className = "workspace";

  const center = document.createElement("main");
  center.className = `center mode-${mode}`;

  const documentBar = document.createElement("div");
  documentBar.className = "document-bar";

  const surface = document.createElement("div");
  surface.className = mode === "split" ? "split-layout is-vertical" : "preview";
  surface.textContent = Array.from({ length: 520 }, (_, index) => `linha ${index + 1}`).join("\n");

  const status = document.createElement("footer");
  status.className = "status-bar";

  center.append(documentBar, surface);
  workspace.append(center);
  shell.append(header, workspace, status);
  document.body.append(shell);

  return { shell, header, workspace, center, surface, status };
}

describe("long document app chrome containment", () => {
  let styles: HTMLStyleElement | undefined;

  afterEach(() => {
    document.body.replaceChildren();
    styles?.remove();
    styles = undefined;
  });

  for (const mode of ["source", "preview", "split"] as const) {
    it(`keeps 520 lines inside the ${mode} workspace track`, () => {
      styles = installStyles();
      const { workspace, center, status } = createLongDocumentShell(mode);

      const workspaceStyle = getComputedStyle(workspace);
      const centerStyle = getComputedStyle(center);
      const statusStyle = getComputedStyle(status);

      expect(workspaceStyle.gridTemplateRows).toBe("minmax(0, 1fr)");
      expect(workspaceStyle.minHeight).toBe("0");
      expect(workspaceStyle.overflow).toBe("hidden");
      expect(centerStyle.minHeight).toBe("0");
      expect(centerStyle.overflow).toBe("hidden");
      expect(statusStyle.flexShrink).toBe("0");
    });
  }
});
