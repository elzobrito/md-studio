# Empacotamento e Distribuição — MD Studio (v0.2.2)

## Alvos Oficiais

| Formato | Plataforma | Uso típico | Onde sai após build | Ferramenta / Configuração |
|---------|------------|------------|---------------------|---------------------------|
| **Snap** (`.snap`) | Linux | Ubuntu Software / Snap Store | `./md-studio_*.snap` (raiz) | `snapcraft` ([`snap/snapcraft.yaml`](../../snap/snapcraft.yaml): `base: core24`, `confinement: strict`, `grade: stable`) |
| **Debian** (`.deb`) | Linux | Debian, Ubuntu e derivados | `src-tauri/target/release/bundle/deb/` | Tauri Bundler (`src-tauri/tauri.conf.json`) |
| **AppImage** | Linux | Portabilidade (Fedora, Arch, openSUSE, Slackware, …) | `src-tauri/target/release/bundle/appimage/` | Tauri Bundler |
| **RPM** (`.rpm`) | Linux | Fedora, RHEL, openSUSE | `src-tauri/target/release/bundle/rpm/` | Tauri Bundler |
| **NSIS** (`.exe`) | Windows | Instalador interativo (Win 10/11 x64) | `src-tauri/target/release/bundle/nsis/` | Tauri Bundler + CI `build-windows.yml` |
| **MSI** (`.msi`) | Windows | Instalação corporativa / silenciosa | `src-tauri/target/release/bundle/msi/` | Tauri Bundler + CI `build-windows.yml` |

CI oficial: [`.github/workflows/build-linux.yml`](../../.github/workflows/build-linux.yml) (`.deb` / AppImage / `.rpm`) e [`.github/workflows/build-windows.yml`](../../.github/workflows/build-windows.yml) (NSIS / MSI).  
**A CI não publica na Snap Store** — o upload é manual/local (ver §1).

Instalação para usuários finais: ver [`README.md`](../../README.md) (v0.2.2).

---

## 1. Empacotamento Snap (Canonical Snap Store)

Configurado em [`snap/snapcraft.yaml`](../../snap/snapcraft.yaml):

- **base:** `core24` (Ubuntu 24.04 LTS)
- **confinement:** `strict`
- **grade:** `stable`
- **license:** MIT
- **Canal público:** `stable` desde **2026-09-23** (`sudo snap install md-studio`)

### Compilação via LXD (recomendado / isolado)

```bash
snapcraft pack --use-lxd
```

Gera na raiz do workspace: `md-studio_<versão>_amd64.snap` (ex.: `md-studio_0.2.2_amd64.snap`).

### Publicação na Snap Store (manual / local)

A publicação **não** é feita pela CI. No host autenticado:

```bash
snapcraft login
snapcraft upload --release=stable md-studio_0.2.2_amd64.snap
snapcraft status md-studio
```

Canais `edge` / `candidate` são opcionais conforme a política de release.

---

## 2. Empacotamento nativo Tauri no Linux (`.deb`, AppImage, `.rpm`)

### Dependências de build (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev libayatana-appindicator3-dev \
  librsvg2-dev patchelf libssl-dev pkg-config build-essential
```

Toolchains: Node.js (≥20 LTS), pnpm (≥9), Rust estável (sincronizado via `Cargo.lock` / `rust-toolchain.toml`).

### Compilação local

```bash
pnpm install
pnpm tauri build
```

Artefatos típicos (v0.2.2):

- `.deb`: `src-tauri/target/release/bundle/deb/md-studio_0.2.2_amd64.deb`
- `AppImage`: `src-tauri/target/release/bundle/appimage/md-studio_0.2.2_amd64.AppImage`
- `.rpm`: `src-tauri/target/release/bundle/rpm/md-studio-0.2.2-1.x86_64.rpm`

### Instalação e teste rápido

```bash
# .deb
sudo apt install ./src-tauri/target/release/bundle/deb/md-studio_*.deb

# AppImage
chmod +x src-tauri/target/release/bundle/appimage/*.AppImage
./src-tauri/target/release/bundle/appimage/*.AppImage

# .rpm (Fedora/RHEL)
sudo dnf install ./src-tauri/target/release/bundle/rpm/*.rpm
# openSUSE:
# sudo zypper install ./src-tauri/target/release/bundle/rpm/*.rpm
```

Workflow CI equivalente: `build-linux.yml` (upload dos três formatos para a GitHub Release quando disparado com tag).

---

## 3. Empacotamento Windows (NSIS `.exe` e MSI)

Build em runner Windows (`windows-latest`), alvo `x86_64-pc-windows-msvc`. Ver [`.github/workflows/build-windows.yml`](../../.github/workflows/build-windows.yml).

Artefatos típicos (v0.2.2):

- NSIS: `MD.Studio_0.2.2_x64-setup.exe`
- MSI: `MD.Studio_0.2.2_x64_en-US.msi`

Localmente (em host Windows com toolchain Tauri):

```powershell
pnpm install
pnpm tauri build
```

Saída esperada sob `src-tauri/target/release/bundle/nsis/` e `.../msi/`.

Instalação silenciosa MSI:

```powershell
msiexec /i MD.Studio_0.2.2_x64_en-US.msi /quiet /qn
```

---

## 4. Compatibilidade gráfica Linux (DMA-BUF / tela em branco)

Em algumas distros (ex.: Slackware) ou drivers NVIDIA/Mesa legados, o WebKitGTK pode abrir janela vazia por conflito com DMA-BUF.

```bash
WEBKIT_DISABLE_DMABUF_RENDERER=1 md-studio
# ou
WEBKIT_DISABLE_DMABUF_RENDERER=1 ./md-studio_0.2.2_amd64.AppImage
```

---

## 5. Governança e segurança do pacote

- Ícones em `src-tauri/icons/`.
- CSP e capabilities mínimas em `src-tauri/capabilities/default.json`.
- Builds oficiais com Cargo `--locked` para reprodutibilidade.
- Versão canônica alinhada em `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` e `snap/snapcraft.yaml` (**0.2.2** neste release).
