# SEC-002 — Mapa de arquitetura e confiança

Alvo: MD Studio 0.2.0, aplicativo desktop Linux, revisão `f8eaf22`.

## Componentes e direção dos fluxos

1. Arquivo `.md` local → comandos Tauri em Rust (`src-tauri/src/commands/mod.rs`) → estado da WebView (`src/state/documentState.ts`) → parser Unified/Remark/Rehype (`src/markdown/processor.ts`) → sanitização (`src/markdown/sanitize.ts`) → preview React (`src/components/MarkdownViewer.tsx`).
2. Editor CodeMirror → estado do documento → IPC `save_document` → resolução relativa no workspace (`src-tauri/crates/md-studio-core/src/workspace.rs`) → `atomic_save` com hash esperado → sistema de arquivos. Watcher observa mudanças externas e suprime escritas internas reconhecidas.
3. Preview sanitizado → exportação HTML (`src/services/exportHtml.ts`) → IPC `export_html` → arquivo de destino escolhido por diálogo nativo. Preview → `window.print()` para PDF.
4. Blocos de código podem solicitar formatação via IPC `format_code`; Rust seleciona formatter permitido (`src-tauri/src/commands/formatter.rs`) e executa processo local. Mermaid é interpretado na WebView e pode ser exportado para SVG/PNG.
5. Pipeline de build: GitHub Actions → pnpm/Cargo → pacotes Linux/Windows; não é uma API em runtime do produto.

## Fronteiras de confiança

- Conteúdo Markdown do disco é entrada não confiável: alcança parser, preview, links, imagens, Mermaid e exportação. Sanitização e CSP são controles principais.
- WebView → IPC Tauri é fronteira de privilégio: comandos podem ler, gravar, indexar, buscar e formatar arquivos locais. A raiz autorizada do workspace e validações de destino são controles críticos.
- IPC → filesystem: caminhos relativos são validados pela camada de workspace; `open_workspace` e exportação recebem caminhos absolutos sob escolhas da UI/OS e exigem inspeção específica.
- IPC → processos formatadores: código e idioma do documento influenciam seleção/entrada dos formatadores; seleção de executáveis e argumentos devem impedir injeção.
- Dependências npm/Cargo e CI são fronteira de supply chain.

## Integrações/ambientes

Nenhum backend HTTP, webhook, fila, login ou serviço cloud de produto foi identificado. Em desenvolvimento, Vite fornece a WebView; em distribuição, os recursos são empacotados pelo Tauri. `endpoint_base_url` não foi fornecido, portanto não haverá sondagem de um servidor remoto. O aplicativo não tem DMZ/app tier/data tier de serviço web; a equivalência útil é sistema operacional / processo Rust / WebView / workspace local.
