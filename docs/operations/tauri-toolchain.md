# Tauri toolchain — MD Studio

## Host (Linux)

| Component | Observed version |
|-----------|------------------|
| rustc/cargo | 1.96.x |
| node | 22.x (engines >=20) |
| pnpm | 9.15.x |

### Runtime packages present, -dev missing on host

Runtime libraries (`libwebkit2gtk-4.1-0`, `libjavascriptcoregtk-4.1-0`) may exist without `.pc` files. Without:

- `libwebkit2gtk-4.1-dev`
- `libjavascriptcoregtk-4.1-dev`

`cargo build -p md-studio` and host `pnpm tauri build` fail at pkg-config.

### Install (requires sudo)

```bash
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev libjavascriptcoregtk-4.1-dev \
  libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev \
  patchelf libssl-dev pkg-config build-essential \
  xdg-utils desktop-file-utils
```

## Green paths without host sudo

### Unit tests (host)

```bash
cargo test --manifest-path src-tauri/crates/md-studio-core/Cargo.toml
```

Pure Rust workspace/path/save tests; no WebKit.

### Full Tauri build (Docker)

```bash
./tools/tauri-docker-build.sh
```

Produces:

- `src-tauri/target/release/md-studio`
- `src-tauri/target/release/bundle/deb/*.deb`
- `src-tauri/target/release/bundle/appimage/*.AppImage`

## Fixes applied under G24

- Extracted `md-studio-core` crate for host-testable logic.
- Removed Cargo workspace feature bleed (`tauri/custom-protocol` on core).
- Added `custom-protocol` feature to app package.
- RGBA icons for Tauri codegen.
- TypeScript build fixes (`@types/node`, processor typing).


## Host native path (G25)

Deps `-dev` instaladas no host via apt com autorização do usuário. Validado:

```bash
cargo test --manifest-path src-tauri/crates/md-studio-core/Cargo.toml
cargo build --release --manifest-path src-tauri/Cargo.toml
pnpm build && pnpm exec tauri build --ci --bundles deb,appimage
```

Senha de root **não** é armazenada em artefatos do repositório nem em docs.
