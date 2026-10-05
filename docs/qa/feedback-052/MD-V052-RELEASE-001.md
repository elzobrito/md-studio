# MD-V052-RELEASE-001 — preparação 0.5.2

Preparação local da linha 0.5.2. Sem push, tag ou Snap Store.

## Versão

| Manifesto | Valor |
|---|---|
| `package.json` | 0.5.2 |
| `src-tauri/tauri.conf.json` | 0.5.2 |
| `src-tauri/Cargo.toml` | 0.5.2 |
| `snap/snapcraft.yaml` | 0.5.2 |

`CHANGELOG.md` ganhou `[0.5.2]` com as quatro correções do feedback e os hotfixes de interface de `b5e2cab`. Notas: `docs/release/RELEASE_NOTES_v0.5.2.md`.

## Comandos

| Comando | Resultado |
|---|---|
| `pnpm typecheck` | saída 0 |
| `pnpm test` | 133 arquivos, 774 testes, saída 0 |
| `pnpm build` | `tsc -b && vite build`, built in 22.33s |
| `cargo test --manifest-path src-tauri/Cargo.toml --offline` | 21 testes ok |
| `cargo test --manifest-path src-tauri/crates/md-studio-core/Cargo.toml --offline` | 65+2+7+1+2+3 testes ok |
| `pnpm tauri build` | binário + `.deb` + `.rpm` + `.AppImage` 0.5.2 |

Ajuste de regressão no gate: `tests/ui/designSystem.test.tsx` passou a esperar o rótulo **Criar em branco**.

## Binário local

`cp src-tauri/target/release/md-studio ~/.local/bin/md-studio && chmod +x`

| Artefato | Bytes | SHA-256 |
|---|---|---|
| `src-tauri/target/release/md-studio` | 24636576 | `3bc1d90049bb2148f4ac1936e4c3f0f82df982da0ebf64fce967b46df8833532` |
| `~/.local/bin/md-studio` | 24636576 | `3bc1d90049bb2148f4ac1936e4c3f0f82df982da0ebf64fce967b46df8833532` |
| `MD Studio_0.5.2_amd64.deb` | 11977004 | `b4bf64327d3b198358e241f650cf7056fc24467f3f933d7f085b7c1cab50a30b` |
| `MD Studio-0.5.2-1.x86_64.rpm` | 11979931 | `b8e8e471291f0223389a764bf1c7d71ef4b846598411e72c106bc35d7b7fe05d` |
| `MD Studio_0.5.2_amd64.AppImage` | 101078208 | `18a437a6848e316dff8dc20e1680860a6fca26205e1a94046f5632cab4d9a511` |

Hashes src e `~/.local/bin` coincidem.

## Desktop

`~/.local/share/applications/md-studio.desktop` Exec:

```
Exec=/usr/bin/env GDK_BACKEND=x11 WEBKIT_DISABLE_DMABUF_RENDERER=1 /home/elzobrito/.local/bin/md-studio %F
```

`WEBKIT_DISABLE_DMABUF_RENDERER=1` e `%F` permanecem. `GDK_BACKEND=x11` fica no launcher (INV-DESKTOP-LAUNCHER-ENV / LES-0004); não foi injetado no runtime Rust.

Snap Store e GitHub Release ficam em `MD-V052-PUBLISH-UA-001`.
