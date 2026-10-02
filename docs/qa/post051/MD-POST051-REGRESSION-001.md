# MD-POST051-REGRESSION-001 — testes, build e smoke

Base da execução: árvore de trabalho de `main` em `6dfd998`, com o diff mapeado em MD-POST051-GIT-AUDIT-001. Versão dos manifests: 0.5.1. Nenhum arquivo de produto foi editado. Nenhum push.

## Comandos

| Comando | Resultado |
|---|---|
| `pnpm typecheck` | saída 0 |
| `pnpm exec vitest run` nos sete arquivos de smoke | 7 arquivos, 43 testes, saída 0 |
| `pnpm test` | 130 arquivos, 757 testes, saída 0 |
| `pnpm build` | `tsc -b && vite build`, built in 20.93s, saída 0. Aviso de chunk acima de 500 kB. |
| `cargo test --manifest-path src-tauri/Cargo.toml --workspace --offline` | `md_studio_lib` 21 testes ok; `main` 0; doc-tests 0. O manifesto não declara workspace virtual. |
| `cargo test --manifest-path src-tauri/crates/md-studio-core/Cargo.toml --offline` | 65 + 2 + 7 + 1 + 2 + 3 testes ok |

Log completo: `/tmp/md-post051-regression.log`.

## Smoke funcional

Os comportamentos pedidos passaram na suíte Vitest:

- Barra do documento sem ações globais duplicadas: `tests/runtime/document-tabs-bar.test.ts` (6) e `tests/runtime/accessibility-keyboard.test.ts` (7).
- Chrome de documento longo: `tests/layout/largeDocumentChrome.test.tsx` (3).
- Vista Dividida e empilhamento em 960 px: `tests/layout/splitView.test.tsx` (9). Deslocamento: `tests/layout/layoutDisplacement.test.tsx` (2).
- Splash: `tests/desktop/splashscreen.test.ts` (10).
- Largura de leitura, o achado do mapa: `tests/settings/previewReadingWidth.test.tsx` (6) continua verde. Esses testes conferem a variável CSS, não a regra `max-width: 100%` de `.center.mode-preview .preview-body`.

## Smoke de janela

`scripts/desktop-smoke-test.sh debug` falhou porque o binário de debug abre `http://localhost:1420` e o Vite não estava no ar. A captura mostra “Could not connect to localhost: Connection refused”. Isso não exercita o bundle de produção.

`scripts/desktop-smoke-test.sh release` chegou a carregar o binário `src-tauri/target/release/md-studio`. O log registrou page load de `main` e de `splashscreen`, e em seguida `[WARN][SPLASH_FAILSAFE] Frontend readiness signal timed out after 8s; forcing main window visibility`. O `import` do ImageMagick travou na captura da janela; o processo foi encerrado antes do OCR. O marcador “render proof” não foi confirmado. Esta execução de desktop fica inconclusa. O failsafe de 8 s está no binário de release de 30 de setembro e disparou porque o sinal do frontend não fechou a splash dentro desse prazo.

## Decisão

As suítes pedidas passaram. Não há falha de teste que bloqueie o commit. A largura de leitura com laterais abertas permanece o achado de auditoria, sem teste vermelho. O OCR desktop não entra como aprovação.
