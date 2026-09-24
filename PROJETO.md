# MD Studio

## Objetivo

MD Studio é um aplicativo desktop local para **Linux e Windows** destinado à
leitura, edição, visualização e exportação segura de documentos Markdown. A
linha v0.2 combina editor de fonte, preview, navegação por workspace e
renderizadores controlados para código, matemática e diagramas.

## Público

Usuários técnicos, desenvolvedores, autores e pesquisadores que trabalham com
arquivos Markdown locais e precisam de boa fidelidade de renderização sem enviar
documentos a serviços externos.

## Eixo PRD

- `app/PRD-MD-STUDIO-CORE.md`: workspace, persistência e experiência de autoria.
- `app/PRD-MD-STUDIO-EXTENSIONS.md`: Markdown, código, matemática e diagramas.
- `app/PRD-MD-STUDIO-QUALITY.md`: segurança, qualidade, exportação e distribuição.

## Stack aprovada

- Tauri 2 e Rust para shell, filesystem, watcher, busca e persistência.
- React e TypeScript para interface.
- CodeMirror 6 para edição de fonte.
- Unified, Remark e Rehype para o pipeline Markdown.
- Mermaid, KaTeX e **Shiki** (TextMate dual-themes) por adaptadores isolados.

## Distribuição (v0.2.2)

- Linux: Snap Store (`sudo snap install md-studio`, canal `stable` desde
  2026-09-23), `.deb`, AppImage e `.rpm`.
- Windows: instaladores NSIS (`.exe`) e MSI.
- Detalhes de build/publicação: `docs/release/PACKAGING.md`.

## Limites da linha v0.2

O produto é local-first (Linux e Windows) e inclui backlinks de Wiki Links
internos. Não inclui WYSIWYG, colaboração, autenticação, backend remoto,
sincronização em nuvem, plugins JavaScript, grafo de documentos / Knowledge
Graph (previsto para a Onda 4), compatibilidade Obsidian completa, Pandoc ou
BibTeX.

**Presentation Mode** (F5 / Reveal.js) está **implementado e em teste**, com
alvo de liberação **v0.2.3** — não faz parte do release v0.2.2. Ver
`docs/spec/001-presentation-mode.md`.

## Política de entrega

O roadmap é governado por ESAA. `activity.jsonl` é append-only, tarefas `done`
são imutáveis e toda entrega percorre especificação, implementação, QA e revisão
independente com evidências verificáveis.
