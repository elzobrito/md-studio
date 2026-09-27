# Relatório de Reconciliação e Delta de Rastreabilidade — Baseline G2 (G1 → G2)

**Artefato:** `.esaa/traceability/g2-graph-delta.md`  
**Data:** 2026-09-27  
**Autor:** Antigravity (runner ESAA `antigravity`, actor `agent-impl`)  
**Tarefa ESAA:** `MD-TRACE-G2-001`  

---

## 1. Sumário Executivo

Este documento consolida a reconciliação e atualização da baseline do Grafo de Rastreabilidade Semântica de Software (**TCG**) do **MD Studio** da baseline **G1** (`daf5888731c5ce3cdd5ce0d553a258b3b952f114`) para a baseline **G2** (`bf5d9b485db1dab7eafd89ff1b5a0e23bf9e7e6c`), cobrindo as implementações pós-v0.3 (`MD-HOTFIX-EXPAND-002`, `MD-SPLIT-SCROLL-001`, `MD-HOTFIX-DESKTOP-003`, `MD-UX-RIGHT-PANEL-001`, `MD-UX-SUMARIO-COLLAPSE-001`).

A integridade histórica da evidência experimental foi preservada:
- A baseline **G1** foi arquivada explicitamente em `.esaa/traceability/snapshots/g1-daf5888.json` e `.esaa/traceability/snapshots/g1-validation.yaml`.
- Todos os arquivos de análise e tarefas anteriores (`.esaa/tasks/`, `.esaa/analysis/`) permanecem intactos.
- O novo snapshot **G2** baseia-se na revisão git limpa e reproduzível `bf5d9b485db1dab7eafd89ff1b5a0e23bf9e7e6c`.
- A validação oficial via `tools/validate.py` atesta **status: pass, critical: 0, warnings: 24**, eliminando o `source_commit_drift` e restabelecendo 100% da confiabilidade projetiva do TCG.

---

## 2. Baselines e Providência

| Dimensão | Baseline G1 (Pós-v0.3) | Baseline G2 (Reconciliada) |
|---|---|---|
| **source_commit** | `daf5888731c5ce3cdd5ce0d553a258b3b952f114` | `bf5d9b485db1dab7eafd89ff1b5a0e23bf9e7e6c` |
| **Commit Subject** | `feat(v0.3): implementa capabilities da onda v0.3 (MD-V03-012..025)` | `feat(ux): remover fechar do sumario, fazer colapsar secoes recolher o card e recompilar app` |
| **Preservação de G1** | Snapshot ativo anterior | Snapshot local arquivado em `snapshots/g1-daf5888.json` |
| **Total de Nós** | 770 | **774** (+4) |
| **Total de Arestas** | 2605 | **2618** (+13) |
| **Validação** | `pass` (0 critical, 25 warnings antes da reconciliação) | `pass` (0 critical, **24 warnings**) |
| **source_commit_drift** | 1 (warning) | **0** (sincronizado) |

---

## 3. Comparativo Quantitativo

### 3.1 Nós por Tipo (`nodes_by_kind`)

| Tipo | G1 | G2 | Delta | Observações |
|---|---|---|---|---|
| `code` | 386 | **387** | +1 | Adicionado `CMP-SETTINGS` (`src/components/Settings.tsx`) |
| `test` | 164 | **167** | +3 | Adicionados `TST-TS-PANEL-RIGHT-PANEL-ACCORDION`, `TST-TS-DESKTOP-LAUNCHER` e `TST-TS-HOOKS-USE-SCROLL-SYNC` |
| `feature` | 59 | 59 | 0 | Features ativas preservadas e mapeamentos enriquecidos |
| `contract` | 38 | 38 | 0 | Estável |
| `entrypoint` | 71 | 71 | 0 | Estável |
| `flow` | 22 | 22 | 0 | Estável |
| `invariant` | 11 | 11 | 0 | `INV-DESKTOP-LAUNCHER-ENV` agora com teste associado |
| `module` | 19 | 19 | 0 | 19 bounded contexts preservados |
| **Total Geral** | **770** | **774** | **+4** | Expansão de cobertura do grafo |

### 3.2 Arestas por Relação (`edges_by_relation`)

| Relação | G1 | G2 | Delta | Observações |
|---|---|---|---|---|
| `contains` | 1041 | **1046** | +5 | Ligações de módulos e tela App contendo novos nós |
| `covered_by` | 271 | **277** | +6 | Cobertura real dos novos testes sobre componentes e hooks |
| `verifies` | 28 | **29** | +1 | `INV-DESKTOP-LAUNCHER-ENV` verificado por `TST-TS-DESKTOP-LAUNCHER` |
| `implemented_by` | 506 | **507** | +1 | Mapeamento de `CMP-SETTINGS` em `FEAT-SETTINGS` |
| Demais | 759 | 759 | 0 | Estáveis |
| **Total Geral** | **2605** | **2618** | **+13** | Densidade de conexões aumentada |

---

## 4. Re-ancoragens e Ajustes de Precisão

Foram corrigidos e re-ancorados com precisão cirúrgica os 9 nós cujas linhas haviam sofrido deslocamento pelas inserções no código entre `daf5888` e `bf5d9b4`:
1. `HDL-APP-BACKLINK-OPEN-OCCURRENCE`: re-ancorado em `src/App.tsx:758-769`.
2. `STO-SETTINGS`: re-ancorado em `src/state/settings.ts:114-345`.
3. `CFG-DEFAULT-SETTINGS`: re-ancorado em `src/state/settings.ts:93-108`.
4. `LSK-SETTINGS`: re-ancorado em `src/state/settings.ts:22-22`.
5. `CMP-OUTGOING-LINKS-PANEL`: re-ancorado em `src/components/wiki/OutgoingLinksPanel.tsx:5-70`.
6. `SVC-ASSET-PASTE`: re-ancorado em `src/services/assetPaste.ts:72-134`.
7. `TST-TS-PANEL-COLLAPSIBLEPANEL`: re-ancorado em `tests/panel/collapsiblePanel.test.tsx:8-67`.
8. `CMP-DOCUMENT-OUTLINE`: re-ancorado em `src/components/DocumentOutline.tsx:15-207`.
9. `CMP-BACKLINKS-PANEL`: re-ancorado em `src/components/wiki/BacklinksPanel.tsx:28-105`.

Evidências de arestas e contratos atualizadas:
- `STO-SETTINGS|reads|LSK-SETTINGS`: `src/state/settings.ts:129`.
- `STO-SETTINGS|configured_by|CFG-DEFAULT-SETTINGS`: `src/state/settings.ts:115`.
- Contrato `LSK-SETTINGS`: `src/state/settings.ts:22`.

---

## 5. Débito Residual (24 warnings)

A validação final atesta 24 warnings, todos documentados e esperados:
1. `entrypoints_without_flow` (1): `ENT-IPC-RESOLVE-WIKI-LINK`.
2. `tests_without_mapped_node` (13): Testes legados utilitários finos anteriores à modelagem individual.
3. `invariants_with_gap` (10): Invariantes arquiteturais do produto com cobertura parcial ou sem teste de exibição headless ponta a ponta (com `gap: true` explícito).
4. `source_commit_drift`: **0** (resolvido integralmente na reconciliação G2).
