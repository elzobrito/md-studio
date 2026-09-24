# Release — MD Studio v0.2.2

**Status:** liberado (2026-09-23) — lançamento global Linux & Windows.  
**Tag:** `v0.2.2` · Snap Store (`stable`) · GitHub Releases.

## Pacotes oficiais

Ver [PACKAGING.md](./PACKAGING.md) para build e publicação.

| Plataforma | Artefatos |
|---|---|
| Linux | Snap (`sudo snap install md-studio`), `.deb`, AppImage, `.rpm` |
| Windows | NSIS `.exe`, MSI `.msi` |

Artefatos CI: workflows `.github/workflows/build-linux.yml` e `build-windows.yml`.  
Publicação na **Snap Store** é **manual/local** (`snapcraft upload`); a CI **não** publica no Snap Store.

## Gates recomendados

- `pnpm typecheck` + `pnpm test`
- `cargo test --manifest-path src-tauri/crates/md-studio-core/Cargo.toml`
- (Quando rustc do host permitir) `cargo test --manifest-path src-tauri/Cargo.toml --lib`
- Suites security/conformance
- E2E smoke quando display disponível

## Notas de versão

- GitHub Release `v0.2.2` (corpo canônico no GitHub)
- Arquivo histórico: [RELEASE_NOTES_v0.2.0.md](./RELEASE_NOTES_v0.2.0.md)
- Changelog agregado na raiz: [`CHANGELOG.md`](../../CHANGELOG.md)

## Fora deste release

- **Presentation Mode** — implementado, **em teste**; alvo **v0.2.3** (ver `docs/spec/001-presentation-mode.md`).
