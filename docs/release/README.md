# Release candidata MD Studio 0.1.0

## Pacotes

Ver [PACKAGING.md](./PACKAGING.md) para `.deb` e AppImage.

## Gates

- `pnpm typecheck` + `pnpm test`
- `cargo test --manifest-path src-tauri/crates/md-studio-core/Cargo.toml`
- (Quando rustc do host permitir) `cargo test --manifest-path src-tauri/Cargo.toml --lib`
- Suites security/conformance
- E2E smoke quando display disponível

## Produto

- Watcher FS real + UI de conflito dirty
- Export HTML unificado com preview (+ confirmação de overwrite)
- README / onboarding Tauri-first / chrome Mermaid mínimo / docs de packaging
