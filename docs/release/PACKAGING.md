# Empacotamento e Distribuição — MD Studio (Linux)

## Alvos Oficiais

| Formato   | Uso típico                          | Onde sai após build | Ferramenta / Configuração |
|-----------|--------------------------------------|----------------------------------|---------------------------|
| **Snap** (`.snap`) | Ubuntu Software / Snap Store canônica | `./md-studio_*.snap` | `snapcraft` (`snap/snapcraft.yaml`, base `core24`, `strict`) |
| **Debian** (`.deb`) | Debian, Ubuntu e derivados nativos | `src-tauri/target/release/bundle/deb/` | Tauri Bundler (`src-tauri/tauri.conf.json`) |
| **AppImage** | Distribuições gerais, portabilidade (Fedora, Arch, openSUSE, Slackware) | `src-tauri/target/release/bundle/appimage/` | Tauri Bundler (`src-tauri/tauri.conf.json`) |

---

## 1. Empacotamento Snap (Canonical Snap Store)

O pacote Snap é o formato canônico de distribuição oficial na Central de Aplicativos do Ubuntu. Configurado em [`snap/snapcraft.yaml`](file:///home/elzobrito/desenvolvimento/md-studio/snap/snapcraft.yaml) com base **Ubuntu 24.04 LTS (`core24`)** e confinamento estrito (`confinement: strict`).

### Compilação do Snap via LXD (Recomendado / Isolado)

```bash
# Executa build isolada no contêiner gerenciado Ubuntu 24.04
snapcraft pack --use-lxd
```
*Gera o artefato na raiz do workspace:* `md-studio_<versão>_amd64.snap`.

### Publicação na Canonical Snap Store

```bash
# Autenticar na Canonical Snap Store (se necessário)
snapcraft login

# Enviar e publicar nos canais oficiais (edge, candidate e stable)
snapcraft upload --release=edge,candidate,stable md-studio_0.2.1_amd64.snap

# Verificar status das revisões nos canais
snapcraft status md-studio
```

---

## 2. Empacotamento Nativo Tauri (.deb e AppImage)

### Dependências de build no host (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev libayatana-appindicator3-dev \
  librsvg2-dev patchelf libssl-dev pkg-config build-essential
```

Toolchains: Node.js (≥20 LTS), pnpm (≥9), Rust (≥1.88 estável, sincronizado via `Cargo.lock`).

### Compilação dos Pacotes Locais

```bash
pnpm install
pnpm tauri build
```

Artefatos gerados:
- `.deb`: `src-tauri/target/release/bundle/deb/md-studio_0.2.1_amd64.deb`
- `AppImage`: `src-tauri/target/release/bundle/appimage/md-studio_0.2.1_amd64.AppImage`

### Instalação e Teste Rápido

```bash
# Instalação do .deb
sudo apt install ./src-tauri/target/release/bundle/deb/md-studio_*.deb

# Execução do AppImage
chmod +x src-tauri/target/release/bundle/appimage/*.AppImage
./src-tauri/target/release/bundle/appimage/*.AppImage
```

---

## 3. Compatibilidade Gráfica e Execução em Distros Diversas (Ex.: Slackware)

Em distribuições Linux não-Debian (como **Slackware**) ou em computadores com drivers proprietários legados (como NVIDIA com drivers antigos ou certos chipsets Intel/Mesa), a inicialização do WebKitGTK pode apresentar uma **tela em branco ou interface completamente vazia**.

Isso decorre de conflitos no renderizador por aceleração de hardware via buffers compartilhados (**DMA-BUF**).

### Solução Universal

Defina a variável de ambiente `WEBKIT_DISABLE_DMABUF_RENDERER=1` ao inicializar a aplicação:

```bash
# Execução direta do binário ou atalho
WEBKIT_DISABLE_DMABUF_RENDERER=1 md-studio

# Execução via AppImage
WEBKIT_DISABLE_DMABUF_RENDERER=1 ./md-studio_0.2.1_amd64.AppImage
```

Essa diretiva instrui o WebKitGTK a ignorar o pipeline de renderização DMA-BUF, garantindo exibição de 100% da interface do usuário com aceleração padrão por software/OpenGL estável sem impacto perceptível de performance.

---

## 4. Notas de Governança e Segurança

- Ícones vetoriais e bitmaps em `src-tauri/icons/`.
- CSP e capabilities mínimas em `src-tauri/capabilities/default.json` (inclui permissões mínimas de diálogo e bloqueio rígido contra APIs não-autorizadas).
- Builds oficiais devem ser executadas com `--locked` no Cargo para garantir reprodutibilidade estrita de dependências.
