# MD-UX-FEEDBACK-QA-001 — regressão do feedback 0.5.2

User acceptance interna das quatro entregas do feedback do tester (app pública 0.2.2; linha local 0.5.1 + hotfixes). Nenhum `src/**` editado nesta tarefa. Não autoriza release.

Dependências done: `MD-UX-KATEX-CSS-001`, `MD-UX-NEWDOC-SAFE-001`, `MD-UX-TOC-MODE-001`, `MD-UX-MATH-INSERT-001`.

## Comandos

| Comando | Resultado |
|---|---|
| `pnpm typecheck` | saída 0 (`tsc -b --pretty false`) |
| `pnpm exec vitest run` nos 10 arquivos abaixo | 10 arquivos, 49 testes, saída 0 |

Arquivos Vitest: `tests/markdown/math/github-math.test.ts`, `tests/markdown/math/math.test.ts`, `tests/markdown/core/processor.test.ts`, `tests/security/adversarial/markdown-css.test.ts`, `tests/templates/new-document-modal.test.tsx`, `tests/runtime/global-app-shell.test.ts`, `tests/layout/outline-navigation.test.tsx`, `tests/components/documentOutline.test.tsx`, `tests/editor/insertMath.test.ts`, `tests/editor/formattingToolbar.test.tsx`.

## ACs de produto

| Entrega | AC | Evidência | Resultado |
|---|---|---|---|
| KaTeX visível | Preview GitHub math (`$` / `$$`) usa CSS KaTeX | `github-math.test.ts` (3) renderiza Haversine/velocidade; `src/main.tsx` importa `katex/dist/katex.min.css`; `markdown-css.test.ts` (4) adversarial continua verde | pass |
| Novo documento seguro | `+` / Ctrl+N não substitui dirty sem confirmação; primário cria em branco; ícone FilePlus | `new-document-modal.test.tsx` (10): card não aplica, primário blank, dirty recusada mantém modal; `global-app-shell.test.ts` (4) title/aria/FilePlus | pass |
| Sumário no modo atual | Clique no TOC em Markdown não força Formatado | `outline-navigation.test.tsx` (3): clique envia linha; `goToHeading` sem `setViewMode`; `documentOutline.test.tsx` (5) | pass |
| Inserir equação | Botão Equação com GitHub/LaTeX e paleta | `formattingToolbar.test.tsx` (8) aria-label Equação e wrap `$Hello$`; `insertMath.test.ts` (5) `$`/`$$`, `\( \)`/`\[ \]`, frac/sqrt/alpha | pass |

## Limitações

- `$$` isolado em linha própria ainda pode virar bloco `language-text` no pipeline Shiki (achado da tarefa KaTeX; fora do hotfix de CSS).
- QA não reconstrói o binário desktop nem substitui `~/.local/bin/md-studio`. Isso fica em `MD-V052-RELEASE-001`.
- `documentOutline.test.tsx` emite avisos `act(...)` pré-existentes; os testes passam.

## Decisão

As quatro entregas passam nos testes de regressão pedidos. typecheck verde. Nenhum `src/**` alterado. Release permanece em `MD-V052-RELEASE-001`.
