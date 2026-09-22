# MD Studio

> **Markdown local para documentação técnica e engenharia no Linux**  
> *Com realce de código TextMate dual-themes, formatação de código com ferramentas nativas, diagramas interativos Mermaid, conexões bidirecionais (Wiki links & Backlinks) e exportação autônoma — direto da caixa, sem configurações complexas.*

O **MD Studio** é um editor Markdown **local-first** e **100% offline** para Linux, desenvolvido com **Tauri 2** (Rust + React 19 / TypeScript).

Projetado especificamente para engenheiros de software, autores técnicos e equipes de tecnologia que mantêm sua documentação em arquivos `.md` no próprio disco local, o MD Studio reúne em uma única ferramenta nativa:
- **Realce e Formatação de Código de Alta Fidelidade:** Shiki (TextMate com temas duplos claro/escuro) e um hub híbrido de formatação (Prettier Web + formatadores nativos como `ruff`, `rustfmt`, `gofmt`, `clang-format`).
- **Motor de Diagramas Interativos:** Mermaid com suporte a zoom/pan fluido, tolerância a digitação de sintaxe incompleta e exportação fiel em SVG/PNG com estilos computados embutidos.
- **Interconexão de Documentos:** Wiki links (`[[nota]]`), autocompleção instantânea e painel de backlinks com busca contextual no workspace.
- **Persistência Atômica & Auto-Save Silencioso:** Gravação atômica com `fsync` e supressão de notificações internas no `inotify`, prevenindo falsos positivos de conflito durante a digitação.
- **Segurança Rigorosa (Zero-XSS):** Pipeline AST unificado e sanitizado via `rehype-sanitize` e isolamento estrito de caminhos (*Path Fencing*) em Rust.

---

## Downloads e Instalação (v0.2.0)

Você pode baixar os pacotes pré-compilados diretamente da página de [Releases do GitHub](https://github.com/elzobrito/md-studio/releases/latest):

### Pacote Debian / Ubuntu (`.deb`)
```bash
# 1. Baixar o arquivo .deb da versão v0.2.0
wget https://github.com/elzobrito/md-studio/releases/download/v0.2.0/md-studio_0.2.0_amd64.deb

# 2. Instalar no sistema
sudo apt install ./md-studio_0.2.0_amd64.deb

# 3. Executar pelo lançador de aplicativos ou via terminal:
md-studio
```

### Executável Portátil (`AppImage`)
Compatível com qualquer distribuição Linux (Ubuntu, Debian, Fedora, Arch, openSUSE):
```bash
# 1. Baixar o AppImage da versão v0.2.0
wget https://github.com/elzobrito/md-studio/releases/download/v0.2.0/md-studio_0.2.0_amd64.AppImage

# 2. Dar permissão de execução
chmod +x md-studio_0.2.0_amd64.AppImage

# 3. Executar diretamente
./md-studio_0.2.0_amd64.AppImage
```

![Tela inicial do MD Studio](docs/screenshots/welcome.png)

## Capturas

Editor e preview lado a lado, com sumário, wiki links e backlinks no painel direito:

![Editor e preview lado a lado](docs/screenshots/editor-split.png)

Preview formatado (GFM, matemática KaTeX, Shiki syntax highlighting e diagramas Mermaid):

![Preview formatado](docs/screenshots/preview.png)

---

## Tecnologias e Bibliotecas Centrais

| Componente | Tecnologia | Papel na Arquitetura |
| :--- | :--- | :--- |
| **Shell Desktop & IPC** | **Tauri 2 (Rust)** | Shell nativo Linux, sandbox com *Path Fencing*, persistência atômica e IPC de alta performance. |
| **Interface do Usuário** | **React 19 + TypeScript** | UI moderna e modular, hooks reativos e gerenciamento de estado previsível. |
| **Motor de Edição** | **CodeMirror 6** | Editor monoespaçado otimizado com soft wrap, numeração de linhas e histórico atômico. |
| **Syntax Highlighting** | **Shiki (TextMate)** | Realce de sintaxe TextMate dual-themes (`github-light` / `github-dark`) com zero overhead. |
| **Formatação de Código** | **Prettier Standalone + CLI Nativo** | Formatação híbrida: Prettier no navegador (Web) e formatadores nativos via Rust (`ruff`, `rustfmt`, `gofmt`, `clang-format`). |
| **Pipeline Markdown** | **Unified / Remark / Rehype** | Parser AST completo com suporte a CommonMark, GFM, KaTeX e Mermaid. |
| **Diagramas Interativos** | **Mermaid.js + @panzoom/panzoom** | Renderização reativa de diagramas com zoom/pan, alternância de fonte e exportação SVG/PNG com estilos embutidos. |
| **Segurança no Renderizador** | **rehype-sanitize** | Higienização estrita contra XSS: eliminação de `<script>`, `<iframe>` e handlers inline. |
| **Observador do Sistema** | **notify (Rust)** | Monitoramento de disco via `inotify` com debounce e supressão de escritas internas. |

---

## Requisitos de Sistema (Linux)

Para compilar e desenvolver o MD Studio no Ubuntu / Debian ou derivados:

### Dependências do Sistema Operacional

```bash
sudo apt update
sudo apt install -y \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libwebkit2gtk-4.1-dev
```

### Toolchains de Linguagem

- **Node.js**: versão 20 LTS ou superior
- **pnpm**: versão 9 ou superior (o projeto utiliza pnpm para resolução determinística de dependências)
- **Rust**: versão estável 1.77+ (recomendado ≥ 1.88 para compatibilidade total com Tauri 2)

---

## Desenvolvimento Local

```bash
# 1. Instalar dependências Node/TypeScript
pnpm install

# 2. Executar em modo desenvolvimento (Vite + Webview nativa Tauri)
pnpm tauri dev

# 3. Executar apenas a UI no navegador (para testes rápidos de interface)
pnpm dev

# 4. Executar suites de teste
pnpm test          # Testes unitários do frontend (Vitest)
pnpm typecheck     # Verificação de tipos TypeScript (tsc)
cargo test --manifest-path src-tauri/Cargo.toml  # Testes unitários do backend Rust
```

---

## Arquitetura de Persistência, Auto-Save e Concorrência

1. **Gravação Atômica e Segura:**
   Toda gravação no disco (`save_document`) utiliza um padrão de substituição atômica via arquivo temporário oculta (`.{nome}.tmp-{pid}`), com `fsync` dos bytes gravados e renomeação atômica (`fs::rename`). Isso garante integridade absoluta de dados mesmo em casos de desligamento inesperado.

2. **Auto-Save Configurável com Debounce:**
   O MD Studio possui salvamento automático no disco ativado por padrão com debounce configurável (1000ms a 5000ms, padrão 1500ms).
   - O timer de debounce é rearmado a cada digitação e gravado silenciosamente quando o usuário pausa.
   - Qualquer comando manual (`Ctrl+S`, `Salvar`, `Salvar como...`) ou troca de arquivo cancela imediatamente o timer pendente e força a persistência.
   - O recurso pode ser ligado ou desligado a qualquer momento em **Configurações > Editor > Auto-Save**.

3. **Supressão Interna de Eventos no Watcher (`WatcherHub`):**
   Para evitar que a gravação do próprio Auto-Save dispare falsos positivos no diálogo de concorrência (`ConflictDialog`), o backend Rust registra o hash SHA-256 e o timestamp das gravações originadas pelo MD Studio. Eventos emitidos pelo `inotify` com o mesmo hash gravado internamente são consumidos de forma transparente, alertando o usuário apenas se outro processo externo (ex.: `git pull`, terminal, outro editor) modificar o arquivo.

4. **Rascunhos de Recuperação Instantânea:**
   Alterações não salvas também são sincronizadas imediatamente em armazenamento local (`localStorage`), garantindo restauração automática com aviso na interface caso o aplicativo seja encerrado bruscamente antes do flush físico no disco.

---

## Motor de Diagramas Interativos (Mermaid.js)

O MD Studio integra renderização interativa avançada para diagramas Mermaid (`flowchart`, `sequenceDiagram`, `classDiagram`, `erDiagram`, `stateDiagram`, `gantt`, etc.):

- **Interatividade Total (Pan & Zoom):**
  - Botões de controle dedicados: `+` (Zoom In), `-` (Zoom Out) e `1:1` (Reset de escala).
  - Suporte a rolagem com o mouse (wheel zoom) e arrastar com o ponteiro (drag/pan) com cursor visual `grab`/`grabbing`.
- **Resiliência a Digitação em Tempo Real:**
  - Envolve a compilação do Mermaid em ciclo seguro. Enquanto o usuário digita expressões incompletas no editor, o preview retém de forma graciosa a última renderização válida e exibe um indicador discreto `[Sintaxe incompleta]`, prevenindo flashes de tela, mensagens de erro intrusivas ou poluição no DOM.
- **Exportação Fiel de Imagens (SVG e PNG):**
  - **SVG:** Antes do download ou cópia para a área de transferência, todas as regras CSS e estilos computados gerados pelo Mermaid são automaticamente consolidados e embutidos dentro da tag `<defs><style>` do próprio SVG. O arquivo abre com perfeita fidelidade de fontes e cores no Inkscape, Figma, Illustrator ou qualquer navegador web.
  - **PNG:** Renderização em alta resolução em elemento Canvas offscreen com download instantâneo.
  - **Copiar SVG:** Cópia direta do SVG higienizado e estilizado para a área de transferência com feedback visual `✓ Copiado!`.
- **Alternância Rápida Diagrama / Fonte:**
  - Botão de alternância para inspecionar instantaneamente o código-fonte Mermaid original sem sair do modo preview.

---

## Empacotamento Linux (Release)

Alvos oficiais configurados em `src-tauri/tauri.conf.json`: pacote Debian (**`.deb`**) e executável autônomo portátil (**`AppImage`**).

```bash
pnpm tauri build
```

Os pacotes gerados ficam disponíveis em:
- `src-tauri/target/release/bundle/deb/`
- `src-tauri/target/release/bundle/appimage/`

Consulte detalhes adicionais em [docs/release/PACKAGING.md](docs/release/PACKAGING.md).

---

## Segurança e Privacidade

- **Totalmente Local e Offline:** O MD Studio não faz requisições externas para nuvens proprietárias, não possui telemetria oculta e não executa scripts remotos arbitrários.
- **Isolamento de Caminhos (*Path Fencing*):** Todas as leituras e gravações são restritas à raiz do workspace aberto, com bloqueio rígido contra tentativas de *Path Traversal* (`../`).
- **Sanitização Rigorosa (Zero-XSS):** O Markdown renderizado passa por sanitização estrita via `rehype-sanitize`, bloqueando tags perigosas (`<script>`, `<iframe>`, `<object>`) e manipuladores de eventos inline (`onclick`, `onload`, etc.).

---

## Licença

MIT — Livre para uso, adaptação e redistribuição.
