import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("MD-UX-SPLASHSCREEN-RESTORE-001: Splashscreen Lifecycle & Configuration", () => {
  const rootDir = path.resolve(__dirname, "../..");
  const tauriConfPath = path.join(rootDir, "src-tauri/tauri.conf.json");
  const rootSplashHtmlPath = path.join(rootDir, "splashscreen.html");
  const publicSplashHtmlPath = path.join(rootDir, "public/splashscreen.html");
  const libRsPath = path.join(rootDir, "src-tauri/src/lib.rs");
  const commandsModRsPath = path.join(rootDir, "src-tauri/src/commands/mod.rs");
  const mainRsPath = path.join(rootDir, "src-tauri/src/main.rs");
  const appTsxPath = path.join(rootDir, "src/App.tsx");

  describe("Tauri Window Configuration (src-tauri/tauri.conf.json)", () => {
    it("configures the main window as initially hidden", () => {
      const config = JSON.parse(fs.readFileSync(tauriConfPath, "utf-8"));
      const windows = config.app?.windows ?? [];
      const mainWindow = windows.find((w: { label: string }) => w.label === "main");

      expect(mainWindow).toBeDefined();
      expect(mainWindow.visible).toBe(false);
      expect(mainWindow.url).toBe("index.html");
    });

    it("configures the splashscreen window with required parameters", () => {
      const config = JSON.parse(fs.readFileSync(tauriConfPath, "utf-8"));
      const windows = config.app?.windows ?? [];
      const splashWindow = windows.find(
        (w: { label: string }) => w.label === "splashscreen"
      );

      expect(splashWindow).toBeDefined();
      expect(splashWindow.visible).toBe(true);
      expect(splashWindow.url).toBe("splashscreen.html");
      expect(splashWindow.decorations).toBe(false);
      expect(splashWindow.center).toBe(true);
      expect(splashWindow.alwaysOnTop).toBe(true);
      expect(splashWindow.width).toBe(420);
      expect(splashWindow.height).toBe(280);
      expect(splashWindow.resizable).toBe(false);
    });
  });

  describe("Splashscreen HTML Assets", () => {
    it("ensures root splashscreen.html is self-contained and zero-network", () => {
      expect(fs.existsSync(rootSplashHtmlPath)).toBe(true);
      const content = fs.readFileSync(rootSplashHtmlPath, "utf-8");

      expect(content).not.toMatch(/https?:\/\//i);
      expect(content).not.toMatch(/<script[^>]*src=/i);
      expect(content).not.toMatch(/<link[^>]*rel=["']stylesheet["'][^>]*href=["'](?!data:)/i);
      expect(content).toContain("<style>");
      expect(content).toContain("MD Studio");
      expect(content).toContain("#181818");
    });

    it("ensures public/splashscreen.html is in sync with root splashscreen.html", () => {
      expect(fs.existsSync(publicSplashHtmlPath)).toBe(true);
      const rootContent = fs.readFileSync(rootSplashHtmlPath, "utf-8");
      const publicContent = fs.readFileSync(publicSplashHtmlPath, "utf-8");

      expect(publicContent).toBe(rootContent);
    });
  });

  describe("Rust Backend Lifecycle & Handlers", () => {
    it("registers close_splash in Tauri invoke_handler", () => {
      const libContent = fs.readFileSync(libRsPath, "utf-8");
      expect(libContent).toMatch(/commands::close_splash/);
    });

    it("ensures close_splash displays and focuses main before closing splashscreen", () => {
      const commandsContent = fs.readFileSync(commandsModRsPath, "utf-8");
      const closeSplashMatch = commandsContent.match(
        /pub async fn close_splash[\s\S]*?\{([\s\S]*?)\n\}/
      );

      expect(closeSplashMatch).toBeDefined();
      const fnBody = closeSplashMatch![1];

      const showIdx = fnBody.indexOf("main.show()");
      const focusIdx = fnBody.indexOf("main.set_focus()");
      const splashCloseIdx = fnBody.indexOf("splash.close()");

      expect(showIdx).toBeGreaterThan(-1);
      expect(focusIdx).toBeGreaterThan(-1);
      expect(splashCloseIdx).toBeGreaterThan(-1);

      // Main window must be shown and focused before closing the splash to avoid blank flash
      expect(showIdx).toBeLessThan(splashCloseIdx);
      expect(focusIdx).toBeLessThan(splashCloseIdx);
    });

    it("includes defensive fail-safe timeout with explicit diagnostic logging", () => {
      const libContent = fs.readFileSync(libRsPath, "utf-8");

      expect(libContent).toContain("[WARN][SPLASH_FAILSAFE]");
      expect(libContent).toContain("[WARN][SPLASH_SETUP]");
      expect(libContent).toMatch(/std::thread::spawn/);
      expect(libContent).toMatch(/Duration::from_secs\(\d+\)/);
    });

    it("closes splashscreen on single-instance invocation", () => {
      const libContent = fs.readFileSync(libRsPath, "utf-8");
      const singleInstanceMatch = libContent.match(
        /tauri_plugin_single_instance::init\([\s\S]*?\{([\s\S]*?)\n\s*\}\)\)/
      );

      expect(singleInstanceMatch).toBeDefined();
      expect(singleInstanceMatch![1]).toContain('get_webview_window("splashscreen")');
      expect(singleInstanceMatch![1]).toContain("splash.close()");
    });

    it("does not reintroduce graphics backend workarounds in Rust sources", () => {
      const sources = [libRsPath, mainRsPath, commandsModRsPath].map((p) =>
        fs.readFileSync(p, "utf-8")
      );

      for (const src of sources) {
        expect(src).not.toMatch(/GDK_BACKEND/);
        expect(src).not.toMatch(/WEBKIT_DISABLE_DMABUF_RENDERER/);
      }
    });
  });

  describe("Frontend Readiness Signal (src/App.tsx)", () => {
    it("invokes close_splash upon React shell mount after layout/paint", () => {
      const appContent = fs.readFileSync(appTsxPath, "utf-8");

      expect(appContent).toMatch(/invoke\(["']close_splash["']\)/);
      expect(appContent).toMatch(/requestAnimationFrame/);
    });
  });
});
