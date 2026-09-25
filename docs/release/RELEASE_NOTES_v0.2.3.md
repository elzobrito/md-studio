## MD Studio v0.2.3

> **Ambiente Local-First para Documentação Técnica, Apresentações e Publicação**  
> *Com Modo Apresentação integrado (Reveal.js), exportação EPUB 3 nativa, temas Catppuccin Latte/Mocha, formatação contextual inteligente e menu de inserção estruturado.*

A versão **v0.2.3** expande expressivamente os horizontes do MD Studio. Além da autoria e navegação de documentação técnica em Markdown, o produto agora se torna uma plataforma completa para palestras/slides e publicação de e-books em EPUB 3, mantendo o compromisso de operação 100% local, offline e segura.

---

### Principais Novidades da v0.2.3

#### 1. Modo Apresentação Integrado (Presentation Mode — F5 / Reveal.js)
- **Transformação Instantânea:** Seus arquivos Markdown viram apresentações de slides modernas instantaneamente, segmentados por divisores horizontais (`---`).
- **Suporte Rico:** Renderização em tempo real de diagramas Mermaid interativos, fórmulas matemáticas KaTeX (`$...$` e `$$...$$`), realce sintático Shiki e alertas/callouts GFM nos slides.
- **Controles de Palco:** Início via atalho `F5` ou botão no cabeçalho; overlay discreto com contagem de slides, botão de saída e navegação total pelo teclado (`Espaço`, setas direcionais e `Esc`).

#### 2. Exportação EPUB 3 Canônica (Livros Digitais)
- **Motor Rust Nativo (`epub-builder`):** Empacotamento assíncrono de arquivos EPUB 3 padrão, gerando `mimetype`, `container.xml`, `content.opf`, `nav.xhtml` e compatibilidade NCX.
- **Estruturação Automática:** Geração de capítulos a partir de títulos `H1`/`H2`, inclusão de metadados de frontmatter (título, autor, idioma) e sanitização estrita para XHTML.
- **Imagens e Diagramas Embutidos:** Resolução segura de imagens locais relativas com proteção contra escape de workspace (*path fencing*) e conversão automática de diagramas Mermaid em imagens fiéis.
- **Acesso Rápido:** Novo menu suspenso `ExportMenu` no cabeçalho da aplicação e diálogo nativo de salvamento `pickSaveEpubFile`.

#### 3. Exportação de PDF Otimizada (Print Engine)
- **Impressão Nativa:** Ação direta no menu de exportação acionando o motor nativo via `window.print()`.
- **CSS `@media print` Especializado:** Ocultação de menus, barras de status, rails laterais e bordas de layout, garantindo impressão ou salvamento em PDF com margens limpas, tabelas alinhadas e diagramas com alta fidelidade.

#### 4. Design System Aprimorado (Catppuccin Latte & Mocha)
- **Contraste e Legibilidade Refinados:** Adoção rigorosa dos tokens oficiais Catppuccin Latte para o modo claro e Catppuccin Mocha para o modo escuro.
- **Polimento da Interface:** Divisor de tela responsivo (`SplitDivider`), trilho de workspace colapsável, nova barra de status e estados vazios com atalhos de boas-vindas.

#### 5. Barra de Ferramentas Escalável & Formatação Contextual
- **Menu `[ + Inserir ▾ ]`:** Acesso rápido em um clique para inserção de tabelas, blocos de código com linguagem, listas numeradas/tarefas, fórmulas LaTeX e novos documentos a partir de modelos.
- **Formatação Contextual Inteligente (`✨` / `Shift+Alt+F`):**
  - Dentro de um bloco de código: formata o código na linguagem correspondente (JS/TS, Python via Ruff, Rust via Rustfmt, Go, etc.).
  - No texto geral: formata o documento Markdown completo via Prettier, alinhando tabelas, padronizando recuos e formatando todos os blocos de código embutidos.
  - **Retenção de Foco:** Prevenção de perda de cursor ou seleção ao clicar em qualquer botão da barra de ferramentas.

#### 6. Catálogo IPC e Documentação Técnica Atualizados
- **21 Comandos IPC:** Inclusão de `export_epub` e unificação dos serviços nativos do Tauri.
- **Mapa de Rotas Completo:** Documentação técnica atualizada em `docs/FUNCIONALIDADES_FUNCOES_E_ROTAS.md`.

---

### Instalação e Download

#### Pacote Debian / Ubuntu (`.deb`)
```bash
wget https://github.com/elzobrito/md-studio/releases/download/v0.2.3/md-studio_0.2.3_amd64.deb
sudo apt install ./md-studio_0.2.3_amd64.deb
md-studio
```

#### Pacote Portátil (`AppImage`)
```bash
wget https://github.com/elzobrito/md-studio/releases/download/v0.2.3/md-studio_0.2.3_amd64.AppImage
chmod +x md-studio_0.2.3_amd64.AppImage
./md-studio_0.2.3_amd64.AppImage
```

#### Ubuntu Snap Store
```bash
sudo snap install md-studio
```
