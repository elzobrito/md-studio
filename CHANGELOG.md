# Changelog

Todas as notas abaixo foram derivadas de tags Git, corpos de GitHub Releases e
arquivos versionados em `docs/release/`. Entradas não inventadas.

## [0.2.2] — 2026-09-23

Fontes: tag `v0.2.2`, GitHub Release *MD Studio v0.2.2 — Lançamento Global (Linux & Windows)*, commit `c9ac65a`.

- Lançamento global Linux & Windows.
- Navegação de links no preview: relativos, externos (opener do sistema) e âncoras internas.
- Remediações de segurança (sanitização CSS, retenção de rascunhos, CI security gates).
- Compatibilidade DMA-BUF documentada (`WEBKIT_DISABLE_DMABUF_RENDERER=1`).
- Distribuição: Snap Store (`sudo snap install md-studio`, canal `stable`), `.deb`, AppImage, `.rpm`, NSIS `.exe`, MSI.

## [0.2.1] — 2026-09-23

Fontes: tag `v0.2.1`, commits `071799a` / `3dbe8b2`, documentação consolidada no repositório.

- Remediações de segurança ESAA-Security e reauditoria formal (score 71.44).
- Consolidação da documentação técnica; guia de compatibilidade gráfica DMA-BUF.
- Empacotamento Snap (`core24`) e metadados da loja.

## [0.2.0] — 2026-09-22

Fontes: tag `v0.2.0`, GitHub Release, `docs/release/RELEASE_NOTES_v0.2.0.md`.

- Realce de sintaxe **Shiki** (TextMate dual-themes `github-light` / `github-dark`).
- Hub híbrido de formatação (Prettier Web + CLI nativos: ruff, rustfmt, gofmt, clang-format).
- Auto-save com debounce e supressão de eco no WatcherHub (SHA-256).
- Motor Mermaid interativo (pan/zoom, resiliência a digitação, export SVG/PNG).
- Wiki links, backlinks e pipeline Zero-XSS.
- Pacotes Linux `.deb` e AppImage (notas de instalação na release).

## [0.1.1] — 2026-09-20 (aprox.)

Fontes: tag `v0.1.1`, commit `adbb90a` (*add syntax highlighting theme and release v0.1.1*).  
Não há GitHub Release publicada com corpo para esta tag.

- Tema de syntax highlighting e release v0.1.1.

## [0.1.0] — 2026-09-20

Fontes: tag `v0.1.0`, GitHub Release *MD Studio v0.1.0*.

- Primeiro release público Linux (Tauri 2): workspace com path fence, CodeMirror 6 + preview (GFM, math, highlight, Mermaid).
- Wiki links com autocomplete e criação de nota; backlinks no painel (sem grafo).
- Watcher FS + diálogo de conflito; export HTML/PDF.
- Pacotes `.deb` e AppImage.
