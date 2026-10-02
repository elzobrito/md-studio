# MD-POST051-GIT-AUDIT-001 — mapa do diff pós-0.5.1

Base: `main` em `6dfd998` (`chore(esaa): close MD Studio 0.5.1 release tasks`), igual a `origin/main` no momento da auditoria. Nenhum push foi feito. A versão permanece **0.5.1** em `src-tauri/tauri.conf.json`, `package.json` e `src-tauri/Cargo.toml`. O diff de `tauri.conf.json` acrescenta a janela `splashscreen` e deixa a janela `main` invisível no boot; não altera o campo `version`.

As 399 tarefas cujo id não começa com `MD-POST051-` estão `done`. As quatro tarefas desta consolidação são novas e não substituem nenhuma delas.

## Incluir no commit de consolidação

Entregas de tarefas históricas `done`, ainda só na árvore:

| Caminho | Tarefa done |
|---|---|
| `src/components/tabs/DocumentBar.tsx` | MD-UX-DOCBAR-DEDUP-001 |
| `src/components/tabs/DocumentTabs.tsx` | MD-UX-DOCBAR-DEDUP-001 |
| `src/styles/document-tabs.css` | MD-UX-DOCBAR-DEDUP-001 |
| `tests/runtime/document-tabs-bar.test.ts` | MD-UX-DOCBAR-DEDUP-001 |
| `tests/runtime/accessibility-keyboard.test.ts` | MD-UX-DOCBAR-DEDUP-001 |
| `src/App.tsx` | MD-UX-DOCBAR-DEDUP-001, MD-HOTFIX-LAYOUT-DISPLACEMENT-001, MD-UX-SPLASHSCREEN-RESTORE-001 |
| `src/styles/themes.css` | MD-HOTFIX-SPLIT-CENTER-002, MD-HOTFIX-LONG-DOCUMENT-CHROME-001, MD-HOTFIX-LAYOUT-DISPLACEMENT-001 |
| `tests/layout/splitView.test.tsx` | MD-HOTFIX-SPLIT-CENTER-002 |
| `src/styles/app-shell.css` | MD-HOTFIX-LONG-DOCUMENT-CHROME-001 |
| `tests/layout/largeDocumentChrome.test.tsx` | MD-HOTFIX-LONG-DOCUMENT-CHROME-001 |
| `src/styles/layout.css` | MD-HOTFIX-LAYOUT-DISPLACEMENT-001 |
| `src/components/explorer/FileTree.tsx` | MD-HOTFIX-LAYOUT-DISPLACEMENT-001 |
| `tests/layout/layoutDisplacement.test.tsx` | MD-HOTFIX-LAYOUT-DISPLACEMENT-001 |
| `src-tauri/src/lib.rs` | MD-UX-SPLASHSCREEN-RESTORE-001 |
| `src-tauri/src/commands/mod.rs` | MD-UX-SPLASHSCREEN-RESTORE-001 |
| `src-tauri/tauri.conf.json` | MD-UX-SPLASHSCREEN-RESTORE-001 |
| `tests/desktop/splashscreen.test.ts` | MD-UX-SPLASHSCREEN-RESTORE-001 |

Evidência TCG dessas entregas, ainda não rastreada pelo Git:

- `.esaa/tasks/MD-UX-DOCBAR-DEDUP-001.yaml`
- `.esaa/tasks/MD-HOTFIX-SPLIT-CENTER-002.yaml`
- `.esaa/tasks/MD-HOTFIX-LONG-DOCUMENT-CHROME-001.yaml`
- `.esaa/analysis/MD-UX-DOCBAR-DEDUP-001-impact.yaml`
- `.esaa/analysis/MD-UX-DOCBAR-DEDUP-001-footprint.yaml`
- `.esaa/analysis/MD-UX-DOCBAR-DEDUP-001-drift.yaml`
- `.esaa/analysis/MD-UX-DOCBAR-DEDUP-001-functional-visual.md`
- `.esaa/analysis/MD-HOTFIX-SPLIT-CENTER-002-impact.yaml`
- `.esaa/analysis/MD-HOTFIX-SPLIT-CENTER-002-footprint.yaml`
- `.esaa/analysis/MD-HOTFIX-SPLIT-CENTER-002-drift.yaml`
- `.esaa/analysis/MD-HOTFIX-SPLIT-CENTER-002-functional-visual.md`
- `.esaa/analysis/MD-HOTFIX-LONG-DOCUMENT-CHROME-001-impact.yaml`
- `.esaa/analysis/MD-HOTFIX-LONG-DOCUMENT-CHROME-001-footprint.yaml`
- `.esaa/analysis/MD-HOTFIX-LONG-DOCUMENT-CHROME-001-drift.yaml`

Livro de baseline já produzido e ainda fora do commit. Não é reancoragem semântica: `graph.json` só muda `generated_at` para `2026-09-29T01:47:36-03:00`; `source_commit` continua `2e5cce855888b404654002fef1d97ebc0db29cf7`.

- `.esaa/traceability/README.md`
- `.esaa/traceability/case-MD-SPLIT-SCROLL-001-handoff.md`
- `.esaa/traceability/graph.json`
- `.esaa/traceability/validation.yaml`
- `.esaa/traceability/tcg-reconciliation-20260929.md`
- `.esaa/traceability/snapshots/pre-reconcile-20260929.json`

Projeções do Orchestrator, gravadas por eventos posteriores a `6dfd998`. Entram no commit no estado em que estiverem no momento do `git commit`:

- `.roadmap/activity.jsonl`
- `.roadmap/issues.json`
- `.roadmap/lessons.json`
- `.roadmap/roadmap.json`

Também entram os recibos desta consolidação que já existirem nesse momento (`docs/qa/post051/`, sidecars e `.esaa/analysis/MD-POST051-*`).

## Excluir

| Caminho | Motivo |
|---|---|
| `scripts/rebuild-test.sh` | Script local que cria tarefas `MD-REBUILD-CSS-*` com runner próprio. Nenhuma tarefa done o cita. |
| `scripts/rebuild-test-fixed.sh` | Mesma classe de script local. Nenhuma tarefa done o cita. |
| `scripts/esaa-hotfix-workspace-containment.sh` | Runner local da tarefa já `done` MD-HOTFIX-WORKSPACE-CONTAINMENT-001. Não está nas outputs dela e submete eventos. Fica de fora para não reexecutar governança. |
| `.mdstudio/` | Índice local. Não está no diff. |
| `.roadmap/staging/` | Envelopes temporários. Não está no diff. |

## Achado dentro de arquivo aprovado

Em `src/styles/themes.css`, linhas 612–613, a regra `.center.mode-preview .preview-body` passou de `max-width: var(--preview-reading-width, 920px)` para `max-width: 100%`. O arquivo pertence aos hotfixes de layout já `done`. Nenhum critério desses hotfixes nomeia a largura de leitura. Com as duas laterais abertas, Estreita, Confortável e Ampla deixam de limitar a coluna. As regras das linhas 622–631 ainda usam `--preview-reading-width` quando uma lateral está recolhida. A vista Dividida continua com `max-width: none` nas linhas 635–638. Isto não é caminho órfão e não bloqueia o mapa. A regressão precisa registrar se os testes da preferência continuam verdes; eles checam a variável, não esta regra.

`DocumentTabs` deixou de desenhar o botão “Nova aba”. `App.tsx` ainda passa `onNewTab`. Novo documento permanece no cabeçalho e em Ctrl+N. É efeito da deduplicação, não um arquivo sem tarefa.

## Decisão

Não há caminho modificado ou não rastreado sem classe. Não há bloqueio para a regressão. Nenhum arquivo de produto foi editado por esta auditoria.
