# QA — Hotfix do cursor do editor

Data: 2026-09-19  
Task: `MD-HOTFIX-CURSOR-001`

## Causa

O CodeMirror era inicializado sem `drawSelection` e o tema não definia uma cor
explícita para o caret. Assim, o cursor nativo podia perder contraste no fundo
escuro. A regra global de `prefers-reduced-motion` também removia animações sem
declarar explicitamente que o cursor deveria permanecer opaco.

## Correção

- `drawSelection({ cursorBlinkRate: 1200 })` habilita o cursor desenhado pelo
  CodeMirror e seu ciclo de piscar.
- Cursor com 2 px e cor de alto contraste por tema: azul no claro e amarelo no
  escuro.
- `caret-color` explícito mantém um fallback nativo visível.
- Em movimento reduzido, a animação é removida, mas a camada permanece com
  `opacity: 1`.

## Evidência

- `tests/editor/cursor.test.ts`: confirma camada desenhada e blink rate de
  1200 ms.
- `pnpm test`: 31 arquivos e 178 testes aprovados.
- `pnpm typecheck`: aprovado.
- `pnpm build`: aprovado.
- `git diff --check`: aprovado.
- Navegador local: documento novo aberto no modo Markdown; após digitar
  `Posicione aqui`, o caret de 2 px apareceu amarelo no tema escuro e azul no
  tema claro. Duas capturas consecutivas no tema claro mostraram o caret nos
  estados visível e oculto, confirmando que o piscar está ativo.
- A página apresentou conteúdo e controles normais, sem tela em branco ou
  overlay de erro. O servidor e a aba de teste foram encerrados.
