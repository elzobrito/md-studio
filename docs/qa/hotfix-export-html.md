# Hotfix — Exportar HTML

Data: 2026-09-19

## Causa raiz

O frontend invocava `export_html` com `{ html, destination, overwrite }`, mas o
comando Rust recebe um único argumento `req: ExportHtmlRequest`. O Tauri
rejeitava a chamada antes de entrar no comando. A falha era registrada apenas
no console, sem retorno visível.

No navegador havia uma segunda falha: o mock IPC retornava sucesso sem gerar
arquivo, tornando inalcançável o fallback por `Blob`.

## Correção

- Envelope Tauri alterado para `{ req: { html, destination, overwrite } }`.
- Download web executado diretamente por `Blob`, sem falso sucesso IPC.
- Cancelamento permanece silencioso; falha real apresenta alerta com a causa.
- Testes cobrem contrato IPC, sucesso, cancelamento, overwrite, erro e download.

## Preservação de trabalho concorrente

As alterações do fluxo Novo documento/modelos presentes em `App.tsx` foram
mantidas. O hotfix alterou nesse arquivo somente a apresentação do erro de
exportação.

## Evidências

- `pnpm vitest run tests/export/export-flow.test.ts`: 6/6 aprovados.
- `pnpm test`: 33 arquivos, 192 testes aprovados.
- `pnpm typecheck`: aprovado.
- `pnpm build`: aprovado.
- `pnpm tauri build --bundles deb`: aprovado.
- Release instalada em `~/.local/bin/md-studio`.
- Smoke da release instalada: Markdown temporário aberto pelo argumento de
  linha de comando; conteúdo renderizado e botão `Exportar HTML` visível e
  habilitado.

O GNOME/Wayland não aceitou a injeção XTest de clique dentro do WebView. Por
isso, a abertura do diálogo por clique permanece como confirmação humana; o
contrato que falhava antes do comando Rust está coberto diretamente pelo teste
que exige `invoke("export_html", { req: ... })`.
