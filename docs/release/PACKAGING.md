# Empacotamento MD Studio (Linux)

## Alvos

| Formato   | Uso típico                          | Onde sai após `pnpm tauri build` |
|-----------|--------------------------------------|----------------------------------|
| `.deb`    | Debian/Ubuntu e derivados            | `src-tauri/target/release/bundle/deb/` |
| AppImage  | Distros gerais, portable             | `src-tauri/target/release/bundle/appimage/` |

Configuração: `src-tauri/tauri.conf.json` → `bundle.targets: ["deb", "appimage"]`.

## Dependências de build (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev libayatana-appindicator3-dev \
  librsvg2-dev patchelf libssl-dev
```

Rust: instale via rustup e use uma toolchain compatível com o `Cargo.lock` (este repo pode exigir rustc ≥ 1.88).

## Build

```bash
pnpm install
pnpm tauri build
```

Não é necessário publicar artefatos neste fluxo — validar localmente o `.deb` / AppImage gerados.

## Instalação rápida (.deb)

```bash
sudo apt install ./src-tauri/target/release/bundle/deb/md-studio_*.deb
```

## AppImage

```bash
chmod +x src-tauri/target/release/bundle/appimage/*.AppImage
./src-tauri/target/release/bundle/appimage/*.AppImage
```

## Notas

- Ícones em `src-tauri/icons/`
- CSP e capabilities mínimas em `src-tauri/capabilities/default.json` (inclui `dialog:allow-ask` para confirmação de sobrescrita)

## Associação de arquivos Markdown

O bundle declara `fileAssociations` para `.md` / `.markdown` / `.mdx` e usa o template
`src-tauri/linux/md-studio.desktop` com `Exec=… %F` e `MimeType=…` para o `.desktop`
gerado no `.deb` / AppImage.

Após instalar, abrir um `.md` pelo gerenciador de arquivos (ou `md-studio /caminho/abs/arquivo.md`)
deve carregar o arquivo no editor (cold start). Encaminhamento com a app já aberta:
ver `docs/followups/single-instance-open-path.md`.
