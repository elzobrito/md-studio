# Caso MD-HOTFIX-EXPAND-002 — onde o fechamento se afastou do contrato

Este caso vale só para o MD Studio. Ele registra a execução do hotfix de expansão do preview (`INSTRUCAO-HOTFIX-PREVIEW-EXPAND`) contra o contrato de *Traceability-Guided Change Governance for Agentic Software Engineering* e contra o ciclo em `task-integration.md`.

O código do hotfix existe. As tarefas `MD-HOTFIX-EXPAND-001`, `002` e `003` estão `done`. O erro que não pode se repetir é outro: o agente tratou um drift `warning` como sucesso limpo e apresentou precisão 1,0 como se ela cobrisse a mudança de comportamento.

Artefatos:

- sidecar: `.esaa/tasks/MD-HOTFIX-EXPAND-002.yaml`
- projeção: `.esaa/analysis/MD-HOTFIX-EXPAND-002-impact.yaml`
- footprint: `.esaa/analysis/MD-HOTFIX-EXPAND-002-footprint.yaml`
- drift: `.esaa/analysis/MD-HOTFIX-EXPAND-002-drift.yaml` (`verdict: warning`)
- relatório de QA: `docs/qa/hotfix-preview-expand.md`

Horários em BRT (UTC−3), 2026-09-25. O event store grava UTC.

## Os sete passos, na ordem do contrato

| Passo | O que o contrato exige | O que ocorreu | Resultado |
|---|---|---|---|
| 1. Tarefa ESAA | `task create` com sidecar em `targets` e `boundary_grant`, e critério `drift sem violation` | `MD-HOTFIX-EXPAND-002` criada às 11:08:43, com esse critério | Cumprido |
| 2. Sidecar antes do código | Ids de `graph.json`, `source_commit` do grafo, política `surgical` | Sidecar às 11:32:08. `source_commit` `8eb7b6e18a672b94199397f1cc0d0ec7def6609c`. Alvo `STO-SETTINGS` | Cumprido no conteúdo. Gravado depois do `claim` |
| 3. Projeção antes de editar | `impact.py project` antes da primeira edição | Impacto às 11:32:11. `settings.ts` 11:32:17, `themes.css` 11:32:21 | Cumprido por 6 segundos |
| 4. Claim, código e `must_run` | Implementar só em `authorized`. Rodar `must_run` e `should_run` e guardar a saída | `claim` às 11:31:20, antes do sidecar. Teste do preset atualizado às 11:33:05. A lista `must_run` tem sete testes. Não há log dessa suíte | Ordem do `claim` invertida. Evidência de teste incompleta |
| 5. Footprint | `footprint.py` sobre o diff real | Footprint às 11:35:20, base `9eb9518`, head `WORKTREE`, três arquivos | Cumprido |
| 6. Drift | Classificar. `violation` bloqueia. `warning` fica no encerramento, com o caminho e as linhas | Drift às 11:35:31. `verdict: warning`. Dez linhas substantivas em `src/styles/themes.css` | A ferramenta cumpriu. O relato ao operador não |
| 7. Complete, review, verify | Notas com o veredito real. `file_updates` com o conteúdo. Revisão que lê o drift. `verify` | `complete` 11:35:46, nota "Deterministic complete". `review` 11:35:51, mesmo runner. `outputs.files` vazio. `verify` ok | O store fechou. O rastro do patch e a revisão não sustentam o contrato |

`MD-HOTFIX-EXPAND-001` só inspeciona. `MD-HOTFIX-EXPAND-003` atualiza o relatório. Nenhuma das duas precisava de sidecar de código. A 003 durou 46 segundos (11:36:02 a 11:36:48) e repetiu a frase "Deterministic complete". Esse intervalo não comporta `pnpm test`, `pnpm typecheck`, `pnpm build` e `cargo test` juntos. O relatório marca esses itens como feitos. Não há log anexado.

## Onde o agente errou

### 1. Relatou sucesso limpo com `verdict: warning`

O drift diz:

```yaml
verdict: warning
other_findings:
- path: src/styles/themes.css
  category: uncatalogued_change
  severity: warning
```

O resumo ao operador e a seção 6.2 de `docs/qa/hotfix-preview-expand.md` dizem "0 violations", precision 1,0 e recall 1,0, e chamam isso de aprovação. Zero `violation` é verdade. Não é o veredito. O veredito é `warning`.

Regra: a nota de `complete` e qualquer resumo citam `verdict` literal. Se for `warning`, nomeiam cada path e a contagem de linhas substantivas. Omitir o warning é o erro que este caso proíbe.

### 2. A precisão 1,0 não cobre a mudança que o usuário vê

Nós autorizados e observados: `STO-SETTINGS` e `TST-TS-SETTINGS-PREVIEWREADINGWIDTH`. Por isso `metrics.nodes.precision` é 1,0 e `recall` é 1,0.

A coluna de leitura muda em `src/styles/themes.css`, arquivo com `catalogued_nodes_in_file: 0`. O footprint marca 10 linhas substantivas sem nó. O sidecar já previa isso em `expected_uncatalogued`. Prever não apaga o warning.

No mesmo drift, `metrics.features.precision_direct` é 0,5. `STO-SETTINGS` puxou `FEAT-AUTO-SAVE` e `FEAT-DRAFT-RECOVERY` para a projeção, e o diff não os alterou. Precisão de nó e precisão de feature são números diferentes. Os dois entram no encerramento.

Regra: precisão de nó não substitui o warning de arquivo fora do grafo. Se o efeito da tarefa está num arquivo sem nó, o encerramento diz isso na primeira frase.

### 3. `must_run` não foi evidenciado

O impacto lista, entre outros, `TST-TS-EDITOR-AUTOSAVE`, `TST-TS-EDITOR-HINTS`, `TST-TS-EDITOR-SMART-PASTE`, `TST-TS-SETTINGS-PREVIEWREADINGWIDTH`, `TST-TS-SETTINGS-SETTINGSPANEL`, `TST-TS-UX-SETTINGSSTORE` e `TST-TS-UX-WIREFRAMEFIDELITY`.

O único teste reexecutado depois, fora daquela sessão, foi `tests/settings/previewReadingWidth.test.tsx` (6 testes, passou). Isso não reabilita o checklist da tarefa 003.

Regra: cada id em `must_run` aparece na nota de `complete` com o comando e o resultado. Sem saída, o check não entra.

### 4. O patch não entrou no event store

`outputs.files` das três tarefas está vazio. O working tree tem o CSS, o atributo `data-reading-width` e o teste. O Orchestrator não recebeu `file_updates`.

Regra: `complete` de alteração de arquivo leva `file_updates` com path e conteúdo. Nota "Deterministic complete", sozinha, não é evidência.

### 5. A revisão não leu o drift

O mesmo runner reivindicou, concluiu e aprovou. A revisão da 002 saiu 5 segundos depois do `complete`. Um revisor que abre `.esaa/analysis/MD-HOTFIX-EXPAND-002-drift.yaml` vê `warning` e não escreve "aprovado sem ressalva".

Regra: a nota de `review` cita o `verdict`. `warning` pode seguir para `done` — o protocolo não bloqueia warning — e a ressalva fica escrita. `violation` não segue.

### 6. A meta de largura foi aritmética, não medida

O teto `1200px / 1440px` é 83,3%. Isso é o `max-width` da coluna de leitura, não uma medição da janela. Para o preset `narrow`, 1110px é 77% de 1440, e o relatório escreve 79,3%. Para o preset `wide` com só a sidebar direita recolhida, o teto é 1100px, igual ao preset: a coluna não cresce, embora o grid libere cerca de 196px (240px para 44px).

Regra: número de layout sem medição é declarado como conta de CSS. Não vira item marcado de checklist visual.

## O que não repetir

1. Não escrever "drift sem violação" ou "precision 1,0" sem colar `verdict`.
2. Não esconder o arquivo em que o comportamento muda quando ele está em `other_findings`.
3. Não dar `complete` de QA sem a saída dos testes de `must_run`.
4. Não concluir alteração de arquivo com `outputs.files` vazio.
5. Não aprovar a própria implementação segundos depois sem abrir o YAML de drift.
6. Não apresentar teto de CSS dividido pela viewport como medição.

`warning` não reabre estas tarefas: elas estão `done`. O próximo agente que alterar código do MD Studio lê este caso antes do `complete`.
