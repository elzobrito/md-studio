# TRACE-020: validação do modelo de impacto (calibração retroativa + bug real)

- Data: 2026-09-24, entre 23:15 e 23:30 BRT, no Nitro.
- Grafo: `.esaa/traceability/graph.json`, source_commit `5fe4f4d` (HEAD); 723 nós, 2492 arestas.
- Modelos: `impact-model.yaml` (TRACE-014), `blast-radius-model.yaml` (TRACE-015), `task-integration.md` (TRACE-016).
- Formatos: `analysis-formats.md` (TRACE-017/018/019).
- Ferramentas (descartáveis): `tools/impact.py` (closure/blast/project), `tools/footprint.py`, `tools/drift.py`.

As métricas são por nó do grafo (code + test).
- precisão = |observado ∩ autorizado| / |autorizado|
- recall = |observado ∩ autorizado| / |observado|
- autorizado = change_target ∪ expected_affected

---

## Caso (a): calibração retroativa, MD-HOTFIX-PREVIEW-LINKS-001 (commit `31bc03f`, 2026-09-23 14:02 BRT)

**Protocolo.**
- A projeção foi escrita **antes** de olhar o diff: `MD-HOTFIX-PREVIEW-LINKS-001-impact.yaml`, gravada às 23:17:25 BRT.
- Entradas usadas: só título + descrição da tarefa em `roadmap.json` (acceptance_criteria = null) e o grafo, com busca por palavra-chave.
- Não foram usados `targets`, `outputs` e `verification` da tarefa, nem o `git show/--stat` do commit, que só foi consultado em TRACE-018.
- Spec retroativo: `MD-HOTFIX-PREVIEW-LINKS-001-traceability.yaml`.

**Âncoras.**
- O grafo é **posterior** ao commit (5fe4f4d, depois de 31bc03f). O `footprint.py` re-localizou cada âncora em `31bc03f^` e `31bc03f` por alinhamento difflib.
- Resultado:
  - HDL-VIEWER-ON-CLICK: old partial / new exact
  - CMP-MARKDOWN-VIEWER: old relocated / new exact
  - FN-RESOLVE-RELATIVE-LINK, OSI-OPEN-EXTERNAL-URL, TST-…RESOLVERELATIVELINK: old missing → `created_by_change`
- **Viés declarado:** a projeção "conhecia" nós que o próprio hotfix criou. Numa projeção real pré-mudança eles seriam nós novos.

| | nós |
|---|---|
| change_target | HDL-VIEWER-ON-CLICK, FN-RESOLVE-RELATIVE-LINK, FN-SCROLL-TO-HEADING, OSI-OPEN-EXTERNAL-URL |
| expected_affected (declarado) | CMP-MARKDOWN-VIEWER, PERM-OPENER-ALLOW-OPEN-URL, FN-RS-RUN, TST-TS-MARKDOWN-CORE-NAVIGATION-RESOLVERELATIVELINK |
| potentially_affected | BTN-EXPORT-PDF, CMP-DOCUMENT-OUTLINE, HDL-APP-EXPORT-PDF, HDL-APP-GO-TO-HEADING, SCR-APP, STO-UI |
| protected declarado (com justificativa) | OSI-OPEN-EXTERNAL-URL (INV-OFFLINE-NO-TELEMETRY), PERM-OPENER-ALLOW-OPEN-URL (security_config, INV-FS-ONLY-VIA-RUST) |
| **observado** (footprint) | CMP-MARKDOWN-VIEWER, HDL-VIEWER-ON-CLICK, FN-RESOLVE-RELATIVE-LINK*, OSI-OPEN-EXTERNAL-URL*, TST-…RESOLVERELATIVELINK* (*criados) |
| authorized não tocado | FN-RS-RUN, FN-SCROLL-TO-HEADING, PERM-OPENER-ALLOW-OPEN-URL |
| linhas sem nó | 19, todas triviais (import, JSDoc, linhas em branco); 0 substantivas |

**Métricas:**
- nós: precisão **0.625** (5/8), recall **1.0** (5/5), closure_recall 1.0
- só code: 0.571 / 1.0
- features: observadas FEAT-PREVIEW e FEAT-WIKI-LINKS, ambas dentro das diretas projetadas. Precisão das diretas 2/9 = 0.22; recall 1.0.
- invariantes: INV-OFFLINE-NO-TELEMETRY projetada = observada.
- teste must_run: TST-…RESOLVERELATIVELINK projetado = alterado.

**Drift:** verdict **ok**. Drift vazio, sem violation ou warning. `created_production_node` ficou como info para 2 nós autorizados.

**Contrafactuais:**
- Com expected_affected **derivado** (CMP-MARKDOWN-VIEWER + teste), a precisão seria 5/6 = 0.83 com recall 1.0.
- A declaração manual piorou a precisão: incluí infraestrutura do plugin opener porque a descrição dizia "abertura externa com tauri-plugin-opener". Porém o plugin, a capability e o `.plugin(...)` existiam desde o commit inicial `0c455eb`.
- Os `targets` da tarefa original, por arquivo, eram exatamente os 3 arquivos alterados (precisão por arquivo 1.0). A projeção por nó, somada por arquivo, deu 3/5 = 0.6.

---

## Caso (b): bug real novo, MD-BUG-CONFLICT-RELOAD-001

**Bug.** No ConflictDialog, "Recarregar do disco" reaplicava o rascunho local em vez de carregar o conteúdo do disco.

**Causa raiz** (`src/state/documentState.ts`):
1. `setContent` grava rascunho no localStorage a cada tecla (`saveDraft`).
2. Com edição local suja e mudança externa, o watch effect abre o conflito.
3. `resolveConflict('reload')` chamava `openRelative(path)`, que faz `loadDraft()` e `setContentState(draft ?? snap.content)`, ou seja, o **rascunho vence o disco**.
4. Em seguida `setDirty(false)` mascarava o estado: o editor mostrava a edição local como se estivesse limpa, com o diagnóstico "Recarregado do disco", e o rascunho continuava no localStorage.

**Correção** (cirúrgica, +3 linhas, só em HDL-DOC-RESOLVE-CONFLICT): antes de `openRelative(path)`, o ramo reload faz
```ts
const ws = workspaceRef.current;
if (ws) clearDraft(draftRoot(ws), path);
```
A escolha explícita do usuário descarta a edição local. `openRelative` fica intacto: é um hub com 10 chamadores.

**Testes:** `tests/editor/conflictReload.test.tsx` (novo), dois casos:
- reload
- keep (guarda contra correção excessiva)

| | antes da correção | depois |
|---|---|---|
| conflictReload | 1 falha: `expected 'local edit' to be 'disk v2'`; keep passa | 2/2 passam |
| `pnpm test` completo | n/a | 67 arquivos, 364 testes, todos passam |
| `pnpm typecheck` | n/a | ok (exit 0) |
| cargo | não se aplica: Rust não foi tocado | não se aplica |

**Protocolo.**
1. Tarefa ESAA criada às 23:20:04 BRT.
2. Sidecar `.esaa/tasks/MD-BUG-CONFLICT-RELOAD-001.yaml` escrito.
3. Projeção `MD-BUG-CONFLICT-RELOAD-001-impact.yaml` gravada às **23:20:25 BRT**, com `documentState.ts` ainda intacto (sha256 `b583db1b…`, igual ao anterior).
4. Teste falhando às 23:21:16; correção às 23:21:30.
5. Footprint em modo WORKTREE restrito aos 2 arquivos, com o conjunto MD-SEC-AUDIT-CI-001 + `.roadmap/*` em `--exclude`, sem sobreposição. Hashes MD-SEC conferidos: OK.

| | nós |
|---|---|
| change_target | HDL-DOC-RESOLVE-CONFLICT |
| expected_affected | STO-DOCUMENT-STATE (contêiner) |
| potentially_affected | BTN-CONFLICT-KEEP, BTN-CONFLICT-RELOAD, BTN-CONFLICT-SAVE-AS, SCR-APP |
| protected (extra declarado) | HDL-DOC-OPEN-RELATIVE, FN-LOAD-DRAFT, FN-CLEAR-DRAFT, CMP-CONFLICT-DIALOG (este também membro de INV-SHA256-CONFLICT) |
| **observado** | HDL-DOC-RESOLVE-CONFLICT (3 linhas, lado new; âncora old exact / new relocated) |
| enclosing (não conta como alterado) | STO-DOCUMENT-STATE |
| arquivos novos | tests/editor/conflictReload.test.tsx (new_test_file, info) |

**Métricas:**
- nós: precisão **0.5** (1/2), recall **1.0**, closure_recall 1.0
- features: observada FEAT-CONFLICT, dentro das diretas projetadas (FEAT-CONFLICT, FEAT-WATCHER). Precisão das diretas 0.5; recall 1.0.
- invariantes: projetada INV-SHA256-CONFLICT (via CMP-CONFLICT-DIALOG, a distância 2); nenhuma tocada.

**Drift:** verdict **ok**. Drift vazio, sem violation ou warning. A única informação é o teste novo.

**Grafo:**
- A correção desloca âncoras: HDL-DOC-RESOLVE-CONFLICT 454–474 → 454–477; STO-DOCUMENT-STATE 28–496 → 28–499; 4 evidências passam de :464/:470 para :467/:473.
- Ela também cria a aresta `HDL-DOC-RESOLVE-CONFLICT calls FN-CLEAR-DRAFT` (:466) e o teste TST-TS-EDITOR-CONFLICTRELOAD.
- Pela staleness_rule, a re-âncora exige avançar source_commit, e isso exige commit, que é proibido. Por isso os artefatos canônicos seguem em 5fe4f4d.
- O que aplicar no commit está registrado, com evidência verificada no WORKTREE, em `MD-BUG-CONFLICT-RELOAD-001-graph-delta.yaml`.
- `build_graph.py` e `validate.py` foram re-executados: **pass, 0 critical**, 27 warnings. O warning novo é `source_commit_drift` apontando `documentState.ts` no working tree.

### As 7 perguntas (caso b)

1. **Onde estava o bug?**
   - Em `src/state/documentState.ts`, na interação `HDL-DOC-RESOLVE-CONFLICT` → `HDL-DOC-OPEN-RELATIVE` → `FN-LOAD-DRAFT`, que lê a chave persistida `LSK-DRAFTS`.
   - A falha está no ramo `reload` de `resolveConflict`, que delega a `openRelative`, cuja semântica é "rascunho vence disco".
2. **Elementos envolvidos:**
   - BTN-CONFLICT-RELOAD → HDL-DOC-RESOLVE-CONFLICT
   - HDL-DOC-OPEN-RELATIVE, FN-LOAD-DRAFT, FN-SAVE-DRAFT (via HDL-DOC-SET-CONTENT), FN-CLEAR-DRAFT, LSK-DRAFTS
   - HDL-DOC-WATCH-EFFECT (origem do conflito), CMP-CONFLICT-DIALOG, STO-DOCUMENT-STATE, STO-EDITOR (saveStatus)
3. **Features possivelmente afetadas:**
   - diretas: FEAT-CONFLICT, FEAT-WATCHER
   - afetadas de fato pela semântica: FEAT-DRAFT-RECOVERY (o rascunho do arquivo em conflito é descartado no reload)
   - indiretas, pelo fechamento: FEAT-OPEN-FILE, FEAT-SAVE e as de preview/app via SCR-APP, todas sem mudança observada.
4. **Invariantes que precisavam continuar intactas:**
   - INV-SHA256-CONFLICT: nada é sobrescrito em silêncio. O dialog e a detecção por hash não mudaram.
   - INV-DRAFT-RETENTION: a retenção de 90 dias e os avisos não mudaram. Só o rascunho do caminho que o usuário escolheu recarregar é descartado.
   - INV-WATCHER-ECHO-SUPPRESSION: não tocada.
   - O teste de guarda `keep` prova que "Manter minha edição" preserva conteúdo e rascunho.
5. **Arquivos alterados:**
   - `src/state/documentState.ts` (+3 linhas)
   - `tests/editor/conflictReload.test.tsx` (novo)
   - Os artefatos ESAA e de rastreabilidade (`.esaa/tasks/…yaml`, `.esaa/analysis/MD-BUG-CONFLICT-RELOAD-001-*`) não são código.
6. **Houve expansão de escopo inesperada?**
   - Não. O único nó observado estava em authorized.
   - A alternativa que expandiria o escopo seria uma opção `ignoreDraft` em `openRelative` (hub com 10 chamadores e protected_extra), e foi rejeitada na projeção.
   - Houve uma mudança comportamental que o footprint estrutural não enxerga: um novo efeito de escrita em dado persistido (`clearDraft` → LSK-DRAFTS) por uma nova aresta `calls`. Ver lições.
7. **Testes que devem verificar:**
   - novo: TST-TS-EDITOR-CONFLICTRELOAD (reload + keep)
   - projetados pelo modelo como should_run: TST-RS-DETECTS-CONFLICT, TST-TS-EDITOR-AUTOSAVE
   - relevantes que o modelo não listou: TST-TS-SECURITY-ADVERSARIAL-DRAFT-RECOVERY (recuperação de rascunhos)
   - suíte completa `pnpm test` (364/364)

---

## Resumo comparativo

| caso | autorizado | observado | TP | precisão | recall | closure_recall | drift |
|---|---|---|---|---|---|---|---|
| (a) retroativo | 8 | 5 | 5 | 0.625 | 1.0 | 1.0 | ok (0 warning, 0 violation) |
| (b) bug real | 2 | 1 | 1 | 0.5 | 1.0 | 1.0 | ok (0 warning, 0 violation) |

Os casos são pequenos (n=2 tarefas, 6 nós observados), então os números indicam tendência e não precisão estatística.
O padrão é **recall alto e precisão média**: o modelo, junto com a declaração, sempre conteve o que mudou, mas autoriza demais.

## Lições para o modelo (o que o grafo errou ou não viu)

1. **O fechamento só olha upstream, e a causa do bug estava downstream.**
   - Em (b), `closure(HDL-DOC-RESOLVE-CONFLICT)` não alcança HDL-DOC-OPEN-RELATIVE, FN-LOAD-DRAFT, LSK-DRAFTS nem FEAT-DRAFT-RECOVERY. A regra `calls` só propaga reverse.
   - Isso está certo para "quem é afetado", mas não serve para **localizar a causa** nem para listar invariantes e testes relevantes.
   - Proposta: acrescentar um modo `explain`, forward por `calls`/`reads` até distância 2, que alimente protected_extra e testes (ex.: TST-TS-SECURITY-ADVERSARIAL-DRAFT-RECOVERY).
2. **Autorizar o contêiner derruba a precisão.** Com a atribuição ao nó mais interno, o contêiner (STO-DOCUMENT-STATE, CMP-MARKDOWN-VIEWER) só "muda" se linhas próprias mudarem.
   - Em (b) ele ficou só como enclosing. Em (a) mudou por causa do registro do listener.
   - Proposta: o default de expected_affected deve tratar o contêiner como `tolerated` (nem conta como autorizado-esperado, nem gera warning). Com isso a precisão de (b) iria a 1.0.
3. **Declaração guiada por texto superestima a infraestrutura.** "Com tauri-plugin-opener" me levou a autorizar PERM-OPENER-ALLOW-OPEN-URL e FN-RS-RUN, mas o plugin já existia.
   - O grafo tinha a informação: OSI-OPEN-EXTERNAL-URL `requires` PERM-OPENER-ALLOW-OPEN-URL já existente.
   - Regra proposta: se o pré-requisito já está no grafo por `requires`/`configured_by`, ele vai para potentially_affected e não para expected_affected. O expected_affected derivado (0.83) venceu o declarado (0.625).
4. **Um grafo posterior contamina a calibração retroativa.** Nós criados pelo próprio commit aparecem como existentes.
   - O `footprint.py` detecta isso (`created_by_change`), mas a projeção retroativa fica otimista.
   - Para calibração limpa, é preciso regenerar o grafo no commit-pai. As ferramentas de geração da fase A permitem, mas isso não foi feito aqui por escopo.
5. **O footprint estrutural não vê mudança de comportamento por aresta nova.** Em (b), `HDL-DOC-RESOLVE-CONFLICT` passou a chamar `FN-CLEAR-DRAFT`, que escreve em LSK-DRAFTS, um dado persistido e protected. Mesmo assim, `data_touched` ficou vazio, porque a aresta não existe no grafo base.
   - Proposta: o footprint deve extrair chamadas novas nas linhas adicionadas (tokens de símbolos catalogados) e reportar `new_edges` → `data_touched` indireto.
   - Uma nova escrita em protected deveria virar warning `new_effect_on_protected`.
6. **A checagem de staleness do `validate.py` é fraca.** Ela só confere o símbolo na linha inicial, então marcou todas as âncoras de `documentState.ts` como "ainda válidas". O graph-delta mostrou 2 fins de âncora e 4 evidências deslocadas.
   - Proposta: re-localizar via difflib (como faz o footprint) e checar início, fim e evidências.
7. **Hubs.** O `hub_threshold=8` cortou corretamente os 9 chamadores por `calls` de openRelative (10 contando o `triggers` de CMP-OUTGOING-LINKS-PANEL), o que evita ruído. O custo é que eles aparecem como potentially sem expansão.
   - Em (b) isso ajudou: protegeu openRelative e orientou a correção cirúrgica para fora do hub.
8. **Features e testes por arquivo são grossos demais.**
   - A precisão das features diretas foi 0.22 em (a). A inflação veio do rollup por fluxo: HDL-VIEWER-ON-CLICK está em FLOW-PREVIEW-RENDER, e esse fluxo é contido por 6 features (PREVIEW, KATEX, MERMAID, SHIKI, SANITIZE…). Por isso toda feature do fluxo virou "direta". Proposta: considerar direta só a feature com `implemented_by` do nó alterado; features via fluxo compartilhado devem ser indiretas.
   - must_run ficou vazio em (b) porque HDL-DOC-RESOLVE-CONFLICT não tinha `covered_by`. Era uma lacuna real de cobertura, confirmada pelo bug.

## Artefatos
- `.esaa/analysis/MD-HOTFIX-PREVIEW-LINKS-001-{traceability,impact,footprint,drift}.yaml`
- `.esaa/tasks/MD-BUG-CONFLICT-RELOAD-001.yaml`
- `.esaa/analysis/MD-BUG-CONFLICT-RELOAD-001-{impact,footprint,drift,graph-delta}.yaml`
- Código: `src/state/documentState.ts`, `tests/editor/conflictReload.test.tsx`. Nada commitado ou staged.
