# Hotfix — contraste de código no PDF

Data: 2026-09-19

## Evidência inicial

Na saída PDF real, blocos fenced mantinham o fundo azul-escuro do tema enquanto
o WebKit imprimia comandos e tokens em tons escuros. O trecho CLI de
`AGENTS.md` ficava praticamente ilegível, embora estivesse correto no preview.

## Correção

Somente em `@media print`:

- `pre` usa fundo `#f3f4f6`, texto `#111827` e borda clara;
- `pre code` e todos os spans de syntax highlighting herdam texto escuro e
  fundo transparente;
- sombras de texto são removidas;
- linhas longas usam `pre-wrap` e `overflow-wrap`, evitando corte horizontal;
- inline code recebe fundo claro e borda discreta.

O tema exibido no aplicativo não foi alterado.

## Evidências de validação

- teste focal de exportação PDF: 5/5 testes aprovados;
- suíte completa: 34 arquivos e 197 testes aprovados;
- `pnpm typecheck` e `pnpm build`: aprovados;
- `pnpm tauri build --bundles deb`: aprovado, com pacote `.deb` gerado;
- smoke de PDF real: página renderizada e inspecionada visualmente, com blocos
  claros, texto escuro legível, inline code distinguível e comando longo sem
  corte horizontal;
- executável instalado em `~/.local/bin/md-studio` e idêntico à build release:
  SHA-256 `2f095159637d0360aff1800adb4d0231248b8d5cf6c27f90899533231231a0e0`.
