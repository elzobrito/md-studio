## MD Studio v0.2.0

> **Markdown local para documentação técnica e engenharia no Linux**  
> *Com realce TextMate dual-themes, hub de formatação de código, diagramas interativos Mermaid, conexões bidirecionais e auto-save resiliente.*

A versão **v0.2.0** consolida o MD Studio como um ambiente de documentação técnica completo, local-first e 100% offline para Linux, unindo autoria fluida com ferramentas reais de engenharia.

---

### Principais Novidades da v0.2.0

#### 1. Realce de Sintaxe Shiki (TextMate Dual-Themes)
- Integração do motor TextMate de alta precisão via Shiki (`@shikijs/rehype`).
- Suporte simultâneo aos temas `github-light` e `github-dark` mapeados dinamicamente para variáveis CSS.
- Inicialização Wasm instantânea e zero atraso na renderização do preview.

#### 2. Hub Híbrido de Formatação de Código (Web + Rust CLI)
- **Camada Web (Prettier Standalone):** Formatação local instantânea para JavaScript, TypeScript, JSX, TSX, HTML, CSS, SCSS, Less, JSON, YAML e Markdown.
- **Camada Nativa (Rust IPC):** Execução segura de formatadores CLI do sistema (`ruff format` para Python, `rustfmt` para Rust, `gofmt` para Go, `clang-format` para C/C++/C#/Java).
- Botão **Formatar** no cabeçalho de cada bloco de código no Preview e atalho global **`Shift + Alt + F`** no editor CodeMirror 6.
- Timeout estrito de 2s e resiliência: se o código tiver erro de sintaxe, o conteúdo original é preservado sem travar o editor.

#### 3. Auto-Save com Supressão Inteligente no Watcher
- Salvamento automático configurável (debounce de 1000ms a 5000ms, padrão 1500ms).
- **Mecanismo de Hash Pre-Registration no `WatcherHub` (Rust):** O backend calcula o hash SHA-256 e o timestamp das gravações originadas pelo MD Studio, consumindo os eventos de `inotify` gerados pela própria digitação.
- Eliminação total de falsos positivos no diálogo de concorrência (`ConflictDialog`), alertando apenas se processos externos reais alterarem o arquivo no disco.
- Gravação com `fsync` atômico via arquivo temporário oculta.

#### 4. Motor de Diagramas Interativos Mermaid
- Interceptação no AST antes do realce de sintaxe, isolando blocos ````mermaid` em contêineres interativos.
- **Pan & Zoom Fluido:** Controles de zoom (`+`, `-`, `1:1`), arraste com ponteiro (`grab`/`grabbing`) e rolagem com a roda do mouse (*wheel zoom*).
- **Resiliência a Digitação Parcial:** Intercepta erros de compilação durante digitação intermediária, preservando a última renderização válida com indicador discreto `[Sintaxe incompleta]`.
- **Exportação SVG/PNG com Estilos Embutidos:** Consolida as regras de estilo computadas dentro de `<defs><style>` do SVG antes do salvamento ou cópia para o clipboard, assegurando fidelidade visual no Inkscape, Figma, Illustrator ou navegadores.
- Botão de alternância instantânea entre exibição do diagrama e código-fonte.

#### 5. Wiki Links, Backlinks e Segurança Zero-XSS
- Suporte a `[[nota]]` e `[[alvo|rótulo]]` com autocompleção e busca contextual de backlinks em todo o workspace.
- Pipeline sanitizado via `rehype-sanitize` e proteção estrita contra *Path Traversal* (*Path Fencing*) em Rust.

---

### Instalação

#### Debian / Ubuntu (`.deb`)
```bash
wget https://github.com/elzobrito/md-studio/releases/download/v0.2.0/md-studio_0.2.0_amd64.deb
sudo apt install ./md-studio_0.2.0_amd64.deb
md-studio
```

#### Executável Portátil (`AppImage`)
```bash
wget https://github.com/elzobrito/md-studio/releases/download/v0.2.0/md-studio_0.2.0_amd64.AppImage
chmod +x md-studio_0.2.0_amd64.AppImage
./md-studio_0.2.0_amd64.AppImage
```

---

### Checksums SHA-256

```text
2909fd6e913c5b7978f0a2992c0cdf69a926756a14d78f78f29caf4e8a43de95  md-studio_0.2.0_amd64.deb
cdfd28fa16cce74c3b4d15c26bb0929681c7388b4b384d6745d0ff4a0f7c0e7a  md-studio_0.2.0_amd64.AppImage
```
