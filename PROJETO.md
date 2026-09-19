# MD Studio

## Objetivo

MD Studio é um aplicativo desktop local para Linux destinado à leitura, edição,
visualização e exportação segura de documentos Markdown. A v1 combina editor de
fonte, preview, navegação por workspace e renderizadores controlados para código,
matemática e diagramas.

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
- Mermaid, KaTeX e highlight.js por adaptadores isolados.

## Limites da v1

A v1 é local, Linux-first e não inclui WYSIWYG, colaboração, autenticação,
backend remoto, sincronização em nuvem, plugins JavaScript, backlinks, grafo de
documentos, compatibilidade Obsidian completa, Pandoc ou BibTeX.

## Política de entrega

O roadmap é governado por ESAA. `activity.jsonl` é append-only, tarefas `done`
são imutáveis e toda entrega percorre especificação, implementação, QA e revisão
independente com evidências verificáveis.
