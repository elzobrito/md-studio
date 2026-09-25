# MD-SPLIT-SCROLL-001 — auditoria do handoff entre agentes

## Escopo e método

Este relatório registra evidência observável em `.roadmap/activity.jsonl`, projeções ESAA, artefatos TCG em `.esaa/`, comandos e saídas preservados na conversa do Codex, registros de Conversation ESAA e Git. Não avalia se TCG é bom. Timestamps de eventos abaixo estão em UTC; timestamps de `stat` e da interface da conversa estão em America/Sao_Paulo (UTC−03:00). Mtime demonstra quando um arquivo foi observado como gravado, não identifica sozinho o autor da gravação.

## 1–2. Linha do tempo e executores

| Horário | Fase | Evidência e executor registrado |
|---|---|---|
| 2026-09-25 18:18:49Z | Criação | `EV-00003587 task.create`, runner `grok`; criou `MD-SPLIT-SCROLL-001`, tipo `feature`, com targets de ESAA `FN-USE-SCROLL-SYNC`, `STO-SETTINGS` e o sidecar como terceiro target. O evento contém descrição, critérios e `boundary_grant`. |
| 18:18:49–18:18:50Z | Verificação inicial | `EV-00003588 verify.start` e `EV-00003589 verify.ok`, runner `grok`. |
| 18:19:09Z | Claim | `EV-00003590 claim`, actor `agent-impl`, runner `grok`, `prior_status: todo`. A nota diz: “Persiste a rolagem dupla da vista Dividida em Configurações. Projeção já gravada.” Verificação: `EV-00003591–3592`, runner `grok`. |
| 18:19:27Z | Sidecar gravado | Mtime observado na conversa do Codex antes da conclusão: `.esaa/tasks/MD-SPLIT-SCROLL-001.yaml`, 15:19:27. |
| 18:19:31Z | Projeção de impacto | Mtime observado antes da conclusão: `.esaa/analysis/MD-SPLIT-SCROLL-001-impact.yaml`, 15:19:31; seu campo `projected_at` também registra 15:19:31−03. O `trace_task` é `TRACE-017`. |
| 18:20:00Z | Primeira alteração de código observada | Mtime de `src/App.tsx` observado no mesmo comando de inspeção: 15:20:00. `tests/ux/settingsStore.test.ts` aparece às 15:20:23. Os eventos ESAA não registram autor de cada escrita; a atribuição a Grok é consistente com o claim ativo e com o relato do usuário, mas não há commit Git de Grok que prove autoria linha a linha. |
| 18:21:35Z | Atualização concorrente do grafo TCG | `EV-00003593 complete`, `agent-impl`/runner `antigravity`, para `MD-TRACE-V03-001`; registra G1 com `source_commit daf5888731c5ce3cdd5ce0d553a258b3b952f114`. Verify `EV-3594–3595`; review approve `EV-3596` por `agent-qa`/runner `antigravity`, `review_mode: functional`; verify `EV-3597–3598`. Essa manutenção começou antes e terminou depois das primeiras alterações de MD-SPLIT. |
| 18:24:27Z | Pedido de continuação | Registro global Conversation ESAA `13124`, user, contém o pedido de continuar de onde Grok parou e a indicação “00:04:03”/tokens esgotados. |
| 18:29:12Z | Testes projetados | O registro de comando Codex preserva a execução do comando com os oito arquivos de teste projetados e `pnpm typecheck`; 8 arquivos e 51 testes passaram. |
| 18:29:48Z | Footprint | Comando Codex executou `footprint.py` para `MD-SPLIT-SCROLL-001`, base `HEAD`, head `WORKTREE`, oito paths; produziu `.esaa/analysis/MD-SPLIT-SCROLL-001-footprint.yaml` (`TRACE-018`). |
| 18:30:36Z | Drift | A conversa registra inspeção/geração do relatório via `impact.py project`; o artefato final é `.esaa/analysis/MD-SPLIT-SCROLL-001-drift.yaml` (`TRACE-019`), com entradas explícitas para impacto e footprint. |
| 18:35:00Z | Complete | `EV-00003599 complete`, actor `agent-impl`, runner `codex`, `prior_status: in_progress`. O Codex registrou implementação, testes, `verdict: warning` e paths/linhas nas notas. |
| 18:35:01Z | Persistência e verify | `EV-00003600 orchestrator.file.write` lista 12 efeitos; `EV-00003601 verify.start`, `EV-00003602 verify.ok`, runner `codex`. |
| 18:35:19Z | Review e verify final | `EV-00003603 review`, actor `agent-qa`, runner `codex`, `decision: approve`, `review_mode: functional`; `EV-00003604 verify.start`, `EV-00003605 verify.ok`. |

Os eventos formais mostram Grok como criador e claimant, Antigravity como executor da tarefa concorrente de grafo e Codex como executor do `complete`, persistência, verify e review final. Não há evento de complete nem de handoff de ESAA atribuído a Grok para a tarefa de split scroll.

## 3–4. Projeção antes da edição e reutilização

Sim. A projeção original de impacto já existia antes da primeira alteração observada em `src/App.tsx`: sidecar às 15:19:27−03, impacto às 15:19:31−03, e `App.tsx` às 15:20:00−03. O campo `projected_before_change: true` está tanto no sidecar quanto no impacto. A nota do claim Grok afirma que a projeção já estava gravada, embora o timestamp formal do claim (18:19:09Z) seja anterior aos mtimes observados dos dois arquivos; portanto, a nota por si só não prova a ordem, mas os mtimes e `projected_at` colocam os artefatos antes do primeiro edit observado.

Sim, Codex reutilizou a mesma projeção `.esaa/analysis/MD-SPLIT-SCROLL-001-impact.yaml`: ela aponta `TRACE-017`, e o `footprint`/`drift` referenciam esse caminho. O complete persistiu o mesmo impacto, com `before_sha256 == after_sha256`; não há indicação de uma segunda projeção de impacto. O Codex também executou footprint e drift sobre a worktree. Ao retomar, o Codex encontrou no sidecar valores de `written_at: 15:30:00−03` e `graph.source_commit: 8eb7b6e…`; a versão final gravada no complete corrige esses metadados para `15:19:27−03` e `daf5888731c5ce3cdd5ce0d553a258b3b952f114`. O sidecar final conserva os campos de escopo listados abaixo. O impacto já apontava para o commit `daf588…`.

## 5. Alterações de escopo após o início

Não encontrei evento `task.amend` nem outro evento de mutação de escopo para `MD-SPLIT-SCROLL-001`. Os targets de tarefa e `boundary_grant` no `task.create` permanecem iguais aos valores persistidos pelo complete. Os campos TCG `targets`, `expected_affected`, `protected_extra`, política de mudança e `expected_uncatalogued` do sidecar final não indicam troca dos conjuntos depois do começo da implementação. O que mudou no sidecar foi `written_at` e `graph.source_commit`; isso é correção de metadado, não alteração de targets/conjuntos/boundary. Impacto, footprint e drift são artefatos de análise novos ou atualizados durante o trabalho.

O grafo TCG teve uma atualização concorrente por `MD-TRACE-V03-001`, cujo complete é posterior ao primeiro mtime de código. Não há evento que mostre alteração da autorização específica de MD-SPLIT em decorrência dessa tarefa; o sidecar e o impacto final usam `daf588…` como commit de grafo.

## 6. Conjuntos registrados nos artefatos

### Escopo ESAA e autorização TCG

- **Targets do evento ESAA:** `FN-USE-SCROLL-SYNC`, `STO-SETTINGS`, `.esaa/tasks/MD-SPLIT-SCROLL-001.yaml`.
- **Boundary grant:** `src/hooks/useScrollSync.ts`; `src/state/settings.ts`; `src/hooks/useSettings.ts`; `src/App.tsx`; `src/components/settings/EditorSettings.tsx`; `tests/**`; `.esaa/tasks/MD-SPLIT-SCROLL-001.yaml`; `.esaa/analysis/**`.
- **Targets TCG / `change_target`:** `FN-USE-SCROLL-SYNC`, `STO-SETTINGS`.
- **Expected affected:** `CMP-SETTINGS-PANEL`, `CFG-DEFAULT-SETTINGS`.
- **Authorized** (união de `change_target` e `expected_affected`, também registrada no drift): `CFG-DEFAULT-SETTINGS`, `CMP-SETTINGS-PANEL`, `FN-USE-SCROLL-SYNC`, `STO-SETTINGS`.

### Observados e potencialmente afetados

- **Observed** (drift): `CFG-DEFAULT-SETTINGS`, `FN-USE-SCROLL-SYNC`, `HDL-APP-SHORTCUTS`, `SCR-APP`, `STO-SETTINGS`, `TST-TS-SETTINGS-SETTINGSPANEL`, `TST-TS-UX-SETTINGSSTORE`.
- **Potentially affected** (impact): `BTN-PREVIEW-FORMAT-CODE`, `CMP-MARKDOWN-EDITOR`, `HDL-APP-START-PRESENTATION`, `HDL-DOC-SET-CONTENT`, `SCR-APP`, `STO-DOCUMENT-STATE`, `STO-EDITOR`. Entre os observados, o drift classifica `SCR-APP` como potencialmente afetado.

### Protegidos, uncatalogued e fora da closure

- **Protected in closure:** `CTR-LSK-SETTINGS`, `LSK-SETTINGS`.
- **Protected declared:** `CFG-DEFAULT-SETTINGS` (razão `security_config`). Assim, o conjunto nominal protegido declarado/presente na closure é `{CFG-DEFAULT-SETTINGS, CTR-LSK-SETTINGS, LSK-SETTINGS}`; o artefato informa `protected_total: 138`. `CFG-DEFAULT-SETTINGS` também consta como autorizado. O drift não classifica nenhum observado como `violation`/protegido.
- **Uncatalogued substantive changes** (paths; drift `other_findings`): `src/components/settings/EditorSettings.tsx` (novas linhas 78–91); `src/hooks/useSettings.ts` (22, 50); `src/state/settings.ts` (19). O footprint usa o hunk 78–92 para `EditorSettings.tsx`, mas marca 78–91 como linhas substantivas.
- **Out of closure** (IDs classificados assim no drift): `HDL-APP-SHORTCUTS`, `TST-TS-SETTINGS-SETTINGSPANEL`, `TST-TS-UX-SETTINGSSTORE`.
- **Arquivo de teste informativo, não warning:** `tests/hooks/useScrollSync.test.tsx`, categoria `new_test_file`, severidade `info`.
- `CMP-SETTINGS-PANEL` está em `not_touched` no drift.

## 7. Veredicto e todos os achados de drift

O valor literal em `MD-SPLIT-SCROLL-001-drift.yaml` é **`verdict: warning`**. Os quatro itens em `drift` são:

| ID | Categoria | Severidade |
|---|---|---|
| `HDL-APP-SHORTCUTS` | `out_of_closure` | `warning` |
| `SCR-APP` | `potentially_affected` | `warning` |
| `TST-TS-SETTINGS-SETTINGSPANEL` | `out_of_closure` | `warning` |
| `TST-TS-UX-SETTINGSSTORE` | `out_of_closure` | `warning` |

`other_findings` contém três achados `uncatalogued_change`, todos `warning`: `src/components/settings/EditorSettings.tsx` nas novas linhas 78–91; `src/hooks/useSettings.ts` nas linhas 22 e 50; `src/state/settings.ts` na linha 19. Também contém `tests/hooks/useScrollSync.test.tsx`, `new_test_file`, `info`. Não há item classificado como `violation`. Métricas registradas: nós `tp=3`, `authorized=4`, `observed=7`, `precision=0.75`, `recall=0.429`, `closure_recall=0.571`; código `precision=0.75`, `recall=0.6`; features `precision_direct=0.6`, `recall_all=0.857`, com `FEAT-GO-TO-LINE` em `observed_missing_from_projection`.

## 8. Correspondência do `complete` com o drift

O complete copiou literalmente `verdict: warning` e declarou “sem violações”. Ele registrou todos os quatro IDs de drift e os três paths uncatalogued; portanto, os sete paths associados a warnings estão presentes. Registrou ainda o arquivo de teste informativo e `FEAT-GO-TO-LINE` fora da projeção.

Há uma diferença de precisão nas linhas: para `EditorSettings.tsx`, a nota do complete diz `78-92`, enquanto os `other_findings.lines` do drift vão de `new:78` a `new:91` (o footprint delimita o hunk até 92, mas apenas 78–91 são substantivas). Para os demais achados, as linhas citadas no complete correspondem às linhas do drift: `App.tsx:297`; `App.tsx:75,297,767`; teste de SettingsPanel `136-166`; store test `68-70,103`; `useSettings.ts:22,50`; `settings.ts:19`. Conclusão observável: veredicto e paths foram reproduzidos; os números de linha não foram copiados literalmente em um dos três paths uncatalogued.

## 9. Evidência de inspeção na review

`EV-00003603` aprova a tarefa em modo funcional, mas o payload não contém notes nem menciona `MD-SPLIT-SCROLL-001-drift.yaml`, o verdict ou qualquer finding. Os registros consultados não fornecem evidência explícita de que o reviewer abriu/inspecionou o artefato de drift. Isso não demonstra que a inspeção não ocorreu; demonstra apenas que ela não está registrada nesse evento.

## 10. Persistência de `file_updates`

Sim. `EV-00003600 orchestrator.file.write` registra 12 paths e associa cada um a um artefato em `.roadmap/artifacts/file-effects/`, com `artifact_sha256`; o complete retorna `files_written: 12`. Os 12 são: sidecar, impacto, footprint, drift; cinco arquivos de produção (`useScrollSync.ts`, `settings.ts`, `useSettings.ts`, `App.tsx`, `EditorSettings.tsx`); e três testes (`settingsStore.test.ts`, `settingsPanel.test.tsx`, `useScrollSync.test.tsx`). Em todos os 12 efeitos, `before_sha256` e `after_sha256` são iguais. Assim, o Event Store reteve os snapshots/payloads de arquivo, enquanto a escrita do complete não alterou os bytes atuais no instante da aplicação; esses bytes já estavam na worktree. O evento seguinte terminou com `verify.ok`.

## 11. Evidência de execução dos `must_run`

O impacto lista oito nós `must_run`: `TST-TS-EDITOR-AUTOSAVE`, `TST-TS-EDITOR-HINTS`, `TST-TS-EDITOR-SMART-PASTE`, `TST-TS-PREVIEW-READING-WIDTH`, `TST-TS-SETTINGS-PREVIEWREADINGWIDTH`, `TST-TS-SETTINGS-SETTINGSPANEL`, `TST-TS-UX-SETTINGSSTORE`, `TST-TS-UX-WIREFRAMEFIDELITY`. O comando Codex preservado às 18:29:12Z executou os arquivos correspondentes:

```text
pnpm exec vitest run tests/editor/autoSave.test.tsx tests/editor/hints.test.ts tests/editor/smart-paste.test.ts tests/settings/previewReadingWidth.test.tsx tests/settings/settingsPanel.test.tsx tests/ux/settingsStore.test.ts tests/ux/wireframeFidelity.test.ts tests/hooks/useScrollSync.test.tsx && pnpm typecheck && git diff --check
```

Saída registrada: `Test Files 8 passed (8)`, `Tests 51 passed (51)`, início 15:28:47−03, duração 6.05s; em seguida `pnpm typecheck` concluiu. Logo, todos os nós must_run têm execução reproduzível registrada para o conjunto de arquivos (dois nós distintos de preview compartilham o mesmo arquivo). A evidência está na saída do comando da conversa Codex e é resumida em `EV-00003599`; não foi encontrado arquivo de log separado para essa execução. O teste focado anterior teve duas execuções falhas e uma posterior aprovada; não substitui nem invalida a execução final dos must_run.

## 12 e 14. Informação formal versus conversacional

**Obtida de ESAA/TCG formal:** descrição funcional, aceite, dependência, actor/runner e estado; limites dos paths; targets formais; sidecar, grafo e commit de referência; autorização, nós protegidos, nós possivelmente afetados e testes must_run; execução do Codex, findings/verdict enviados em complete, file effects persistidos, review e verifies. O evento de claim formal identifica Grok como executor atribuído, mas não registra progresso de código, duração do trabalho ou causa da transferência.

**Obtida de Conversation ESAA:** o registro global `13124` é a mensagem do usuário que diz que Grok estava implementando, exibe `00:04:03`, informa que os tokens acabaram e pede continuação. O registro global `13134` é o resumo posterior do Codex. Não encontrei registro correspondente ao ID em `.conversation-esaa/activity.jsonl` do checkout md-studio nem no projeto Conversation ESAA em `/home/elzobrito/desenvolvimento/conversation-esaa`; também não há nesse conjunto uma conversa de Grok com suas ações. Portanto, a duração e a falta de tokens, além da instrução de continuar o trabalho de Grok, só aparecem no histórico conversacional consultado, não no contrato formal da tarefa.

A conversa Codex preserva as inspeções e saídas usadas nesta auditoria, incluindo os mtimes antes da conclusão, execuções dos testes, comandos TCG, sidecar lido no handoff e a correção posterior dos metadados. Isso documenta ações do Codex; não substitui um log de execução de Grok.

## 13. Decisões influenciadas por artefatos TCG — evidência direta

- O Codex leu o sidecar e impacto e executou a análise `footprint.py` contra os paths definidos para a tarefa; os artefatos finais registram os mesmos paths. O sidecar declara política `surgical`, permite novos testes e não permite novos nós de produção; a worktree final contém oito paths e um arquivo novo de teste.
- A lista `must_run` no impacto corresponde aos arquivos incluídos na execução Vitest registrada pelo Codex; o comando adicionou o novo teste `useScrollSync.test.tsx` ao conjunto. O complete reporta o resultado dos oito arquivos.
- O Codex executou `impact.py blast --spec .esaa/tasks/MD-SPLIT-SCROLL-001.yaml` e `impact.py project`/geração de drift; esses passos produziram/revisaram footprint e drift da implementação. Portanto, os artefatos dirigiram a seleção e o registro da verificação TCG.
- O sidecar e o impacto devem concordar em `graph.source_commit`; o complete corrigiu o sidecar de `8eb7b6e…` para o commit de G1 `daf588…`, e depois anotou que ambos apontavam para o mesmo commit. A decisão de correção de metadado está evidenciada pela diferença entre o YAML lido no início do handoff e o YAML persistido no complete.
- O complete transcreveu o veredicto e findings do drift para as notas, de acordo com a instrução formal “No complete, copiar o verdict do drift” e com `close_rule` no sidecar. A execução de persistência incluiu as quatro peças TCG (sidecar, impacto, footprint, drift).

Os registros disponíveis não atribuem cada decisão de desenho de produto/código exclusivamente a um artefato TCG. Os requisitos de preferência, chave persistida, interface, statusbar, atalho e condicionamento à vista split já constam na descrição formal da tarefa ESAA; são evidência do contrato de feature, não evidência isolada de influência TCG.

## Fontes primárias consultadas

- `.roadmap/activity.jsonl`: `EV-00003587–3592`, tarefa concorrente `EV-00003581–3598`, e `EV-00003599–3605`.
- `.esaa/tasks/MD-SPLIT-SCROLL-001.yaml`.
- `.esaa/analysis/MD-SPLIT-SCROLL-001-impact.yaml`, `…-footprint.yaml`, `…-drift.yaml`.
- `.esaa/traceability/graph.json` e Git commit `daf5888731c5ce3cdd5ce0d553a258b3b952f114`.
- Conversation ESAA global: eventos `13124` e `13134`; histórico Codex `01a0d406-56e5-7ed2-9eac-acdab70b1376`.
