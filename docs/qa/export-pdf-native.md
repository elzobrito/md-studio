# Exportar PDF pelo diálogo nativo

Data: 2026-09-19

## Implementação

O cabeçalho oferece `Exportar PDF` ao lado de `Exportar HTML`. A ação usa
`window.print()`, que abre o diálogo nativo do Ubuntu; nele o usuário seleciona
“Imprimir para arquivo” e o formato PDF.

O conteúdo impresso é o mesmo DOM sanitizado do preview. Quando o editor está
no modo Markdown, a ação muda para o modo Formatado e aguarda a renderização
assíncrona antes de abrir o diálogo.

`print.css` é agora carregado pela aplicação e, no papel, oculta cabeçalho,
painéis, editor, status e controles. Somente `.preview-body` é impresso, com
margens e proteção básica contra quebras internas em blocos, tabelas e imagens.

## Limites intencionais

- O destino é escolhido no diálogo do sistema; não há geração headless.
- A paginação segue WebKitGTK e o driver de impressão do sistema.
- Não há promessa de paginação acadêmica determinística.

## Evidências

- `pnpm vitest run tests/export/export-pdf.test.tsx`: 4/4 aprovados.
- `pnpm test`: 34 arquivos, 196 testes aprovados.
- `pnpm typecheck`: aprovado.
- `pnpm build`: aprovado.
- `pnpm tauri build --bundles deb`: aprovado.
- Release instalada em `~/.local/bin/md-studio`.
- Smoke visual da release instalada: documento temporário renderizado no modo
  Formatado e botão `Exportar PDF` visível, habilitado e posicionado depois de
  `Exportar HTML` (`/tmp/md-pdf-smoke.png`).

O GNOME/Wayland não permite ao ambiente injetar o clique no WebView. A
invocação do callback está coberta pelo teste do botão; a escolha “Imprimir
para arquivo” no diálogo nativo permanece uma interação humana por definição.
