import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("INV-DESKTOP-LAUNCHER-ENV: Linux Desktop Launchers", () => {
  const repoTemplatePath = path.resolve(
    __dirname,
    "../../src-tauri/linux/md-studio.desktop"
  );
  const userDesktopPath = path.join(
    os.homedir(),
    ".local/share/applications/md-studio.desktop"
  );
  const userDesktopAltPath = path.join(
    os.homedir(),
    ".local/share/applications/MD Studio.desktop"
  );

  it("verifies that repo linux desktop template contains GDK_BACKEND=x11 and WEBKIT_DISABLE_DMABUF_RENDERER=1", () => {
    expect(fs.existsSync(repoTemplatePath)).toBe(true);
    const content = fs.readFileSync(repoTemplatePath, "utf-8");
    const execLine = content
      .split("\n")
      .find((line) => line.startsWith("Exec="));

    expect(execLine).toBeDefined();
    expect(execLine).toContain("GDK_BACKEND=x11");
    expect(execLine).toContain("WEBKIT_DISABLE_DMABUF_RENDERER=1");
    expect(execLine).toContain("%F");
  });

  it("verifies that user-local md-studio.desktop maintains GDK_BACKEND=x11 for Wayland controls fix", () => {
    if (fs.existsSync(userDesktopPath)) {
      const content = fs.readFileSync(userDesktopPath, "utf-8");
      const execLine = content
        .split("\n")
        .find((line) => line.startsWith("Exec="));

      expect(execLine).toBeDefined();
      expect(execLine).toContain("GDK_BACKEND=x11");
      expect(execLine).toContain("WEBKIT_DISABLE_DMABUF_RENDERER=1");
      expect(execLine).toContain("%F");
    }
  });

  it("verifies that user-local MD Studio.desktop maintains GDK_BACKEND=x11 for Wayland controls fix", () => {
    if (fs.existsSync(userDesktopAltPath)) {
      const content = fs.readFileSync(userDesktopAltPath, "utf-8");
      const execLine = content
        .split("\n")
        .find((line) => line.startsWith("Exec="));

      expect(execLine).toBeDefined();
      expect(execLine).toContain("GDK_BACKEND=x11");
      expect(execLine).toContain("WEBKIT_DISABLE_DMABUF_RENDERER=1");
      expect(execLine).toContain("%F");
    }
  });
});
