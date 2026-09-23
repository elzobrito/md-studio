import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  envPrefix: ["VITE_", "TAURI_"],
  build: { target: "es2022", minify: !process.env.TAURI_DEBUG ? "esbuild" : false, sourcemap: !!process.env.TAURI_DEBUG },
  test: { environment: "jsdom", include: ["tests/**/*.{test,spec}.ts", "tests/**/*.{test,spec}.tsx"] },
  resolve: {
    alias: {
      "@panzoom/panzoom": "@panzoom/panzoom/dist/panzoom.es.js",
    },
  },
});
