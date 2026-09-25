# Relatório de Delta e Débito de Rastreabilidade — Onda v0.3 (G0 → G1)

**Artefato:** `.esaa/traceability/v03-graph-delta.md`  
**Data:** 2026-09-25  
**Autor:** Antigravity (runner ESAA `antigravity`, actor `agent-impl`)  
**Tarefa ESAA:** `MD-TRACE-V03-001`  

---

## 1. Sumário Executivo

Este documento consolida a evolução do Grafo de Rastreabilidade de Software do **MD Studio** da baseline **G0** (pré-v0.3) para a baseline **G1** (pós-v0.3), cobrindo integralmente as implementações das tarefas `MD-V03-012` até `MD-V03-025`, além dos hotfixes da série.

A integridade histórica da evidência experimental foi preservada:
- A baseline **G0** foi arquivada explicitamente em `.esaa/traceability/snapshots/g0-8eb7b6e.json` e `.esaa/traceability/snapshots/g0-validation.yaml`.
- Todos os artefatos prospectivos gerados antes da implementação (`.esaa/tasks/MD-V03-*.yaml`, `.esaa/analysis/MD-V03-*-impact.yaml`, footprint e drift) permanecem inalterados.
- O novo snapshot **G1** baseia-se na revisão git limpa e reproduzível `daf5888731c5ce3cdd5ce0d553a258b3b952f114`.
- A validação oficial via `tools/validate.py` atesta **status: pass, critical: 0, warnings: 23** (uma redução de 3 warnings em relação a G0).

---

## 2. Baselines e Providência

| Dimensão | Baseline G0 (Pré-v0.3) | Baseline G1 (Pós-v0.3) |
|---|---|---|
| **source_commit** | `8eb7b6e18a672b94199397f1cc0d0ec7def6609c` | `daf5888731c5ce3cdd5ce0d553a258b3b952f114` |
| **Commit Subject** | `fix(conflict): "Recarregar do disco" descarta rascunho local antes de reabrir` | `feat(v0.3): implementa capabilities da onda v0.3 (MD-V03-012..025)` |
| **Status Git** | Snapshot congelado em `d6f3159` | Commit reproduzível na branch `main` |
| **Preservação de G0** | Snapshot local arquivado em `snapshots/g0-8eb7b6e.json` | Snapshot ativo em `graph.json` derivado das fontes YAML |
| **Total de Nós** | 724 | **769** (+45) |
| **Total de Arestas** | 2500 | **2604** (+104) |
| **Validação** | `pass` (0 critical, 26 warnings) | `pass` (0 critical, **23 warnings**) |

---

## 3. Comparativo Quantitativo

### 3.1 Nós por Tipo (`nodes_by_kind`)

| Tipo | G0 | G1 | Delta | Observações |
|---|---|---|---|---|
| `code` | 367 | **386** | +19 | Serviços, componentes e funções da v0.3 |
| `test` | 149 | **164** | +15 | 15 novas suítes de teste de integração/unidade |
| `feature` | 48 | **59** | +11 | 11 novas features funcionais modeladas |
| `contract` | 38 | 38 | 0 | Contratos IPC e de dados estáveis |
| `entrypoint` | 71 | 71 | 0 | Entrypoints estáveis (chamadores ativados) |
| `flow` | 22 | 22 | 0 | Fluxos ponta-a-ponta preservados |
| `invariant` | 10 | 10 | 0 | 10 invariantes estruturais do produto |
| `module` | 19 | 19 | 0 | 19 bounded contexts preservados |
| **Total Geral** | **724** | **769** | **+45** | Expansão de cobertura de 6,2% do grafo |

### 3.2 Arestas por Relação (`edges_by_relation`)

| Relação | G0 | G1 | Delta | Observações |
|---|---|---|---|---|
| `calls` | 269 | 285 | +16 | Ligações diretas entre novos serviços/fachadas |
| `contains` | 1000 | 1041 | +41 | Componentes React e módulos contendo unidades |
| `covered_by` | 249 | 271 | +22 | Cobertura real dos novos testes sobre novos nós |
| `depends_on` | 135 | 139 | +4 | Dependências estruturais de contratos/módulos |
| `implemented_by` | 485 | 505 | +20 | Mapeamento das 11 novas features para código |
| `verifies` | 27 | 28 | +1 | `INV-PATH-FENCE` verificado por `TST-TS-ASSET-PASTE` |
| `implements` | 67 | 67 | 0 | Estável |
| `configured_by` | 30 | 30 | 0 | Estável |
| `consumes` | 2 | 2 | 0 | Estável |
| `publishes` | 2 | 2 | 0 | Estável |
| `reads` | 40 | 40 | 0 | Estável |
| `requires` | 8 | 8 | 0 | Estável |
| `triggers` | 111 | 111 | 0 | Estável |
| `validates` | 35 | 35 | 0 | Estável |
| `writes` | 40 | 40 | 0 | Estável |
| **Total Geral** | **2500** | **2604** | **+104** | Densidade de conexões aumentada |

### 3.3 Arestas por Método de Captura (`edges_by_method`)

| Método | G0 | G1 | Delta |
|---|---|---|---|
| `derived` | 1591 | 1650 | +59 |
| `observed` | 890 | 935 | +45 |
| `inferred` | 19 | 19 | 0 |

---

## 4. Novas Capabilities Modeladas (19 nós de código)

1. **MD Doctor (`MD-V03-012`):**
   - `SVC-MD-DOCTOR-LINTER`: `src/editor/mdDoctorLinter.ts#mdDoctorExtension` (CodeMirror extension)
   - `FN-MD-DOCTOR-HOVER-TOOLTIP`: `src/editor/mdDoctorLinter.ts#doctorTooltipExtension` (Tooltip de diagnóstico)
   - `CLS-RS-DOCTOR`: `src-tauri/crates/md-studio-core/src/doctor/mod.rs#Doctor` (Engine Rust)
   - `FN-RS-DOCTOR-DIAGNOSE`: `src-tauri/crates/md-studio-core/src/doctor/mod.rs#diagnose` (Regras de validação)

2. **Smart References (`MD-V03-013`):**
   - `SVC-SMART-REFERENCES`: `src/editor/smartReferences.ts#getSmartReferenceCandidates` (Auto-complete de links e referências)
   - `FN-RESOLVE-SMART-REFERENCE`: `src/editor/smartReferences.ts#resolveSmartReference` (Resolução para cabeçalhos e arquivos)

3. **Asset Manager / Asset Paste (`MD-V03-014`):**
   - `SVC-ASSET-PASTE`: `src/services/assetPaste.ts#handlePastedImageAsset` (Orquestração de colagem de imagem)
   - `FN-VALIDATE-ASSET-DESTINATION`: `src/services/assetPaste.ts#validateAssetDestination` (Fronteira contra path traversal)
   - `FN-RS-SAVE-PASTED-ASSET`: `src-tauri/crates/md-studio-core/src/assets/mod.rs#save_pasted_asset` (Persistência segura em disco)

4. **Spell Checker (`MD-V03-015`):**
   - `CLS-LOCAL-SPELL-CHECKER`: `src/editor/spellcheck/spellChecker.ts#LocalSpellChecker` (Dicionário local e algoritmo Levenshtein)
   - `SVC-SPELL-LINTER-EXTENSION`: `src/editor/spellcheck/spellLinter.ts#createSpellExtension` (Linter CodeMirror e decorações)

5. **Table Data Paste (`MD-V03-016`):**
   - `SVC-TABLE-DATA-PASTE`: `src/editor/tableDataPaste.ts#handleTabularPaste` (Conversor TSV/planilha para tabelas GFM)

6. **Command Palette & Registry (`MD-V03-017`):**
   - `SVC-COMMAND-REGISTRY`: `src/commands/commandRegistry.ts#commandRegistry` (Instância central de registro e disparo de comandos)

7. **Code Block Metadata & Tabs (`MD-V03-018`):**
   - `SVC-CODEBLOCK-METADATA`: `src/markdown/codeBlockMetadata.ts#parseCodeBlockMetadata` (Parser de atributos de blocos e abas de código)

8. **Preview ↔ Source Mapping (`MD-V03-019`):**
   - `SVC-SOURCE-MAP`: `src/markdown/sourceMap.ts#attachSourcePositionsToHast` (Injeção de atributos `data-source-line/offset`)

9. **Workspace Search UI & Replace (`MD-V03-020` / `021`):**
   - `CMP-WORKSPACE-SEARCH`: `src/components/workspace/WorkspaceSearch.tsx#WorkspaceSearch` (UI completa de busca textual e replace all)

10. **Tooling Settings (`MD-V03-022`):**
    - `CMP-TOOLING-SETTINGS`: `src/components/settings/ToolingSettings.tsx#ToolingSettings` (Painel informativo e toggles de ferramentas)

11. **Formatter Capabilities Hub (`MD-V03-020`):**
    - `SVC-FORMATTER-CAPABILITIES`: `src/services/formatter/capabilities.ts#getFormatterCapabilitiesSnapshot` (Consulta de formatadores disponíveis)

12. **Hover Preview (`MD-V03-025`):**
    - `CMP-HOVER-PREVIEW`: `src/components/editor/HoverPreview.tsx#HoverPreview` (Popup local, sanitizado e cancelável)

---

## 5. Novos Testes Modelados (15 nós de teste)

Todas as 15 novas suítes de teste criadas na onda v0.3 foram indexadas em `nodes.yaml` e mapeadas em `tests.yaml`, ligadas aos nós de código que exercitam:

1. `TST-TS-COMMAND-REGISTRY` (`tests/commands/commandRegistry.test.ts`) → cobre `SVC-COMMAND-REGISTRY`, `CMP-COMMAND-PALETTE`
2. `TST-TS-DOCUMENT-OUTLINE-FILTER` (`tests/components/documentOutline.test.tsx`) → cobre `CMP-DOCUMENT-OUTLINE`, `FN-SCROLL-TO-HEADING`
3. `TST-TS-HIDE-INTERNAL-FILES` (`tests/components/hideInternalFiles.test.tsx`) → cobre `CMP-FILE-EXPLORER`, `STO-SETTINGS`
4. `TST-TS-HOVER-PREVIEW` (`tests/components/hoverPreview.test.tsx`) → cobre `CMP-HOVER-PREVIEW`, `CMP-MARKDOWN-VIEWER`
5. `TST-TS-MD-DOCTOR-LINTER` (`tests/editor/mdDoctorLinter.test.ts`) → cobre `SVC-MD-DOCTOR-LINTER`, `FN-MD-DOCTOR-HOVER-TOOLTIP`, `CLS-RS-DOCTOR`, `FN-RS-DOCTOR-DIAGNOSE`
6. `TST-TS-SMART-REFERENCES` (`tests/editor/smartReferences.test.ts`) → cobre `SVC-SMART-REFERENCES`, `FN-RESOLVE-SMART-REFERENCE`
7. `TST-TS-SPELL-CHECKER` (`tests/editor/spellChecker.test.ts`) → cobre `CLS-LOCAL-SPELL-CHECKER`, `SVC-SPELL-LINTER-EXTENSION`
8. `TST-TS-TABLE-DATA-PASTE` (`tests/editor/tableDataPaste.test.ts`) → cobre `SVC-TABLE-DATA-PASTE`
9. `TST-TS-CODEBLOCK-METADATA` (`tests/markdown/codeBlockMetadata.test.ts`) → cobre `SVC-CODEBLOCK-METADATA`
10. `TST-TS-SOURCE-MAP` (`tests/markdown/sourceMap.test.ts`) → cobre `SVC-SOURCE-MAP`, `SVC-PROCESS-MARKDOWN`
11. `TST-TS-ASSET-PASTE` (`tests/services/assetPaste.test.ts`) → cobre `SVC-ASSET-PASTE`, `FN-VALIDATE-ASSET-DESTINATION`, `FN-RS-SAVE-PASTED-ASSET`
12. `TST-TS-FORMATTER-CAPABILITIES` (`tests/services/formatterCapabilities.test.ts`) → cobre `SVC-FORMATTER-CAPABILITIES`, `SVC-FORMAT-CODE`
13. `TST-TS-PREVIEW-READING-WIDTH` (`tests/settings/previewReadingWidth.test.tsx`) → cobre `STO-SETTINGS`, `CMP-MARKDOWN-VIEWER`
14. `TST-TS-TOOLING-SETTINGS` (`tests/settings/toolingSettings.test.tsx`) → cobre `CMP-TOOLING-SETTINGS`, `STO-SETTINGS`
15. `TST-TS-WORKSPACE-SEARCH` (`tests/workspace/workspaceSearch.test.tsx`) → cobre `CMP-WORKSPACE-SEARCH`, `IPCC-SEARCH-WORKSPACE`

Nenhum dos novos testes foi deixado como unmapped: `tests_without_mapped_node` permaneceu estritamente nos 13 casos preexistentes de G0.

---

## 6. Resolução de Contratos e Divergências de Features

### 6.1 Contratos sem Consumidor: de 2 para 0
Em G0, havia dois contratos com a advertência `consumer_gap`:
- `CTR-IPC-SEARCH-WORKSPACE`: cliente TS existia mas sem chamador no frontend.  
  **Resolução em G1:** agora consumido diretamente por `CMP-WORKSPACE-SEARCH` (`src/components/workspace/WorkspaceSearch.tsx:280`).
- `CTR-IPC-RESOLVE-WIKI-LINK`: cliente TS existia mas sem chamador no frontend.  
  **Resolução em G1:** agora consumido por `CMP-MARKDOWN-VIEWER` (`MarkdownViewer.tsx:185`), `CMP-HOVER-PREVIEW` (`HoverPreview.tsx:83`) e `SVC-SMART-REFERENCES` (`smartReferences.ts:133`).

Resultado em `contracts.yaml`: `without_real_consumer` foi zerado (`[]`).

### 6.2 Entrypoints IPC Inativos: de 2 para 0
- `ENT-IPC-SEARCH-WORKSPACE`: status promovido de `dead_code` para `active`, com `ts_callers: [CMP-WORKSPACE-SEARCH]`.
- `ENT-IPC-RESOLVE-WIKI-LINK`: status promovido de `dead_code` para `active`, com `ts_callers: [CMP-MARKDOWN-VIEWER, CMP-HOVER-PREVIEW, SVC-SMART-REFERENCES]`.
- Resumo `ipc_without_frontend_caller` foi zerado (`[]`).

### 6.3 Resolução de Divergências em Features
- `FEAT-COMMAND-PALETTE`: em G0 figurava com status `partial` e 2 divergências (busca limitada a recentes e falta de passagem de handlers). Na v0.3 foi integrado ao `SVC-COMMAND-REGISTRY` central com atalhos e categorização. Status promovido a `active` e divergências resolvidas (`[]`).
- `FEAT-WORKSPACE-SEARCH`: em G0 figurava como `backend_only` com 1 divergência (sem UI). Na v0.3 ganhou componente `CMP-WORKSPACE-SEARCH` completo com substituição confirmada e exclusão de caminhos. Status promovido a `active` e divergência resolvida (`[]`).
- Total de features com divergências caiu de 16 em G0 para 14 em G1.

### 6.4 Invariantes Estruturais
- `INV-PATH-FENCE`: cobertura reforçada com a inclusão de `TST-TS-ASSET-PASTE` em `verified_by`, validando a rejeição de escape fora da raiz do vault em colagem de imagens (`src/services/assetPaste.ts`).

---

## 7. Análise de Débito de Rastreabilidade

O débito de rastreabilidade foi quantificado diretamente através do relatório do `validate.py`:

```yaml
# Comparativo de Findings:
G0 (baseline):
  critical_issues: 0
  warning_issues: 26
  findings por verificação:
    entrypoints_without_flow: 1
    contracts_without_consumer: 2
    tests_without_mapped_node: 13
    invariants_with_gap: 9
    source_commit_drift: 1

G1 (atual):
  critical_issues: 0
  warning_issues: 23   # (-3 warnings)
  findings por verificação:
    entrypoints_without_flow: 1
    contracts_without_consumer: 0   # (-2)
    tests_without_mapped_node: 13   # estável
    invariants_with_gap: 9          # estável
    source_commit_drift: 0          # (-1)
```

### Explicação dos 23 warnings residuais em G1:
1. `entrypoints_without_flow` (1): `EP-MENU-EXPORT-PDF` — item de menu que ainda não possui fluxo ponta a ponta modelado.
2. `tests_without_mapped_node` (13): Testes legados anteriores à v0.3 que cobrem utilitários pontuais de formatação e navegação (ex.: `TST-TS-EDITOR-CURSOR`, `TST-TS-UI-BUTTON`).
3. `invariants_with_gap` (9): Invariantes do produto que dependem de testes ponta a ponta adicionais de isolamento de processos (ex.: `INV-REMOTE-RESOURCES-BLOCKED`, `INV-OFFLINE-NO-TELEMETRY`).

Nenhum warning novo foi introduzido pelas 15 tarefas da v0.3.

---

## 8. Relatório Literal de Validação G1 (`tools/validate.py`)

A execução direta do script de validação sobre os artefatos de G1 gerou a seguinte saída JSON:

```json
{
  "status": "pass",
  "critical": 0,
  "warning": 23,
  "by_check": {
    "missing_artifacts": ["critical", 0],
    "source_commit_mismatch": ["critical", 0],
    "duplicate_ids": ["critical", 0],
    "duplicate_anchors": ["warning", 0],
    "unstable_ids": ["critical", 0],
    "broken_refs": ["critical", 0],
    "missing_paths_symbols": ["critical", 0],
    "anchor_out_of_range": ["critical", 0],
    "edges_without_evidence_or_method": ["critical", 0],
    "invalid_evidence_lines": ["critical", 0],
    "invariant_without_test_or_gap": ["critical", 0],
    "entrypoints_without_flow": ["warning", 1],
    "orphan_services": ["warning", 0],
    "known_dead_or_test_only": ["info", 5],
    "contracts_without_consumer": ["warning", 0],
    "tests_without_mapped_node": ["warning", 13],
    "invariants_with_gap": ["warning", 9],
    "features_with_divergences": ["info", 14],
    "source_commit_drift": ["warning", 0],
    "graph_json_stale": ["warning", 0]
  }
}
```

---

## 9. Conclusão

O sistema de rastreabilidade em `.esaa/traceability/` encontra-se plenamente alinhado ao código do **MD Studio v0.3** sob o commit `daf5888731c5ce3cdd5ce0d553a258b3b952f114`.
Todas as regras contratuais foram estritamente cumpridas:
1. G0 preservado sem destruição da memória prévia.
2. G1 construído sobre revisão commitada, limpa e reproduzível.
3. Fontes YAML editadas primeiro e `graph.json` derivado via ferramentas determinísticas.
4. Cobertura expandida para 100% das 15 tarefas da onda v0.3.
5. Débito de rastreabilidade medido e reduzido.
