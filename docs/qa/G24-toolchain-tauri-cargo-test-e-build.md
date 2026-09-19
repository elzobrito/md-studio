# QA G24 — Toolchain Tauri

## Evidências

| Check | Resultado |
|-------|-----------|
| `cargo test --manifest-path src-tauri/crates/md-studio-core/Cargo.toml` | **5 passed** (host) |
| `cargo build -p md-studio --release` (Docker + webkit -dev) | **Finished release** |
| `pnpm tauri build --ci --bundles deb,appimage` (Docker) | **TAURI_OK** — deb + AppImage |
| `pnpm build` (host) | **ok** |
| Host `sudo apt` install -dev packages | **blocked** (no passwordless sudo) |

## Artefatos

- Binary: `src-tauri/target/release/md-studio`
- Deb / AppImage under `src-tauri/target/release/bundle/`
- Ops: `docs/operations/tauri-toolchain.md`
- Script: `tools/tauri-docker-build.sh`

## Resultado

**Aprovado** no escopo da tarefa: testes unitários verdes no host; build Tauri e bundles verdes via Docker com toolchain documentada.
