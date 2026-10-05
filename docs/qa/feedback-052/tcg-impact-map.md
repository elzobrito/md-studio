# Mapa TCG — feedback tester → MD Studio 0.5.2

Grafo: `.esaa/traceability/graph.json`  
`source_commit`: `2e5cce855888b404654002fef1d97ebc0db29cf7`  
HEAD local no mapeamento: `b5e2cab8df4c9de9e3b620a094b615403c9cc097` (1 à frente de origin/main).  
Ferramenta: `python .esaa/traceability/tools/impact.py blast --targets …`  
Tester original: v0.2.2 (GitHub Releases). Linha local: 0.5.1 não publicada + hotfixes pós-0.5.1.

Não reancorar `graph.json`. `CFG-SANITIZE-SCHEMA` permanece protected.

## DAG ESAA

| Tarefa | Kind | Depende | Cluster TCG |
|---|---|---|---|
| MD-UX-FEEDBACK-MAP-001 | spec | — | este mapa |
| MD-UX-KATEX-CSS-001 | impl hotfix | MAP | katex/preview |
| MD-UX-NEWDOC-SAFE-001 | impl hotfix | MAP | new-document |
| MD-UX-TOC-MODE-001 | impl hotfix | NEWDOC | outline / goToHeading |
| MD-UX-MATH-INSERT-001 | impl feature | KATEX | formatting toolbar |
| MD-UX-FEEDBACK-QA-001 | qa | 4 impls | regressão |
| MD-V052-RELEASE-001 | impl release | QA | versão 0.5.2 |
| MD-V052-PUBLISH-UA-001 | qa release | RELEASE | UA publicação |

TOC serializa depois de NEWDOC: ambos tocam `SCR-APP` / `src/App.tsx`.  
MATH-INSERT serializa depois de KATEX: a fórmula inserida precisa renderizar.

## Cluster 1 — KaTeX / preview

Alvos: `PIPE-KATEX`, `PIPE-SANITIZE`, `PIPE-REMARK-MATH`, `SVC-PROCESS-MARKDOWN`

- authorized: alvos + `TST-TS-MARKDOWN-CODE-CODE-HIGHLIGHT`, `TST-TS-MARKDOWN-CORE-PROCESSOR`, `TST-TS-MARKDOWN-MERMAID-MERMAID`, `TST-TS-SECURITY-ADVERSARIAL-MARKDOWN-CSS`
- protected_declared: `PIPE-SANITIZE`, `SVC-PROCESS-MARKDOWN` (`invariant_member:INV-SANITIZE-PREVIEW-EXPORT`)
- protected_in_closure: `CFG-SANITIZE-SCHEMA` (contract + invariant + security_config), export HTML, presentation processor
- potentially_affected: `CMP-MARKDOWN-VIEWER`, `SCR-APP`, `PIPE-HAST-TO-HTML`, export HTML/PDF, `SCR-PRESENTATION`
- features diretas: `FEAT-KATEX`, `FEAT-PREVIEW`, `FEAT-SANITIZE`, `FEAT-MERMAID`, `FEAT-SHIKI`
- flow: `FLOW-PREVIEW-RENDER`
- must_run: processor, mermaid, code-highlight, adversarial markdown-css, export, presentation processor

Política da tarefa KATEX: targets só `PIPE-KATEX` e `SVC-PROCESS-MARKDOWN`; **não** editar `CFG-SANITIZE-SCHEMA`. CSS em `src/main.tsx` é uncatalogued esperado. `allow_new_tests: true`.

Causa do bug: `rehype-katex` emite `.katex` / `.katex-mathml` / `.katex-html`; nenhum entrypoint importa `katex/dist/katex.min.css`. Sem o CSS as três camadas aparecem concatenadas (o print do tester e o trecho colado).

## Cluster 2 — Novo documento

Alvos: `HDL-APP-OPEN-NEW-DOCUMENT`, `CMP-NEW-DOCUMENT-MODAL`, `HDL-APP-SELECT-TEMPLATE`, `HDL-DOC-NEW-DOCUMENT`, `BTN-HEADER-NEW-DOCUMENT`

- authorized: alvos + `CMP-APP-HEADER`, `SCR-APP`, `STO-DOCUMENT-STATE`, `TST-TS-TEMPLATES-NEW-DOCUMENT-MODAL`, `TST-TS-UI-DESIGNSYSTEM`
- protected_in_closure: vazio
- potentially_affected: `BTN-WELCOME-NEW-DOCUMENT`, `HDL-APP-SHORTCUTS`, `SHC-CTRL-N`, `SCR-WELCOME`, `STO-EDITOR`, presentation
- features diretas: `FEAT-TEMPLATES`
- flow: `FLOW-NEW-DOCUMENT`
- must_run: `TST-TS-TEMPLATES-NEW-DOCUMENT-MODAL`, `TST-TS-UI-DESIGNSYSTEM`
- should_run: autosave, singleSave, header topbar/export, editorStore

`GlobalAppBar` (botão + do header na GUI R3) não está no grafo como `BTN-HEADER-NEW-DOCUMENT` (âncora histórica em `AppHeader.tsx`). Tratar como uncatalogued se o arquivo tocado for `src/components/shell/GlobalAppBar.tsx`.

Bug: clique no card chama `newDocument(template.content())` sem confirmação dirty e sem aba nova.

## Cluster 3 — Sumário / modo de vista

Alvos: `HDL-APP-GO-TO-HEADING`, `CMP-DOCUMENT-OUTLINE`

- authorized: alvos + `SCR-APP`, `TST-TS-DOCUMENT-OUTLINE-FILTER`, `TST-TS-PANEL-COLLAPSIBLEPANEL`, `TST-TS-PANEL-RIGHT-PANEL-ACCORDION`
- protected_in_closure: `CTR-LSK-UI-STATE`, `LSK-UI-STATE` — **não tocar**
- potentially_affected: `STO-UI`
- features diretas: `FEAT-OUTLINE`, `FEAT-OUTLINE-FILTER`
- must_run: outline-filter, collapsible panel, right-panel accordion

Bug: `goToHeading` faz `session.setViewMode("preview")` quando `view === "source"`.

Sobreposição com cluster 2: `SCR-APP`. Por isso `MD-UX-TOC-MODE-001` depende de `MD-UX-NEWDOC-SAFE-001`.

## Cluster 4 — Toolbar / inserir equação

Alvo: `CMP-FORMATTING-TOOLBAR`

- authorized: `CMP-FORMATTING-TOOLBAR`, `CMP-MARKDOWN-EDITOR`, `TST-TS-EDITOR-FORMATTINGTOOLBAR`
- protected_in_closure: vazio
- potentially_affected: `HDL-APP-START-PRESENTATION`, `SCR-APP`, `STO-EDITOR`
- features diretas: `FEAT-FORMATTING-TOOLBAR`, `FEAT-SLASH-COMMANDS`
- must_run: `TST-TS-EDITOR-FORMATTINGTOOLBAR`

Nó de produção novo esperado: helper `insertMath` (`allow_new_production_nodes: true`).

## Fora de tarefa de código

O toggle da árvore na 0.5.1 já é `SidebarIcon` (Ctrl+B), não `+`. O comentário do tester sobre `+` no explorador vale para a 0.2.2. Não há cluster TCG para isso nesta campanha.

## Artefatos de blast

- `.esaa/analysis/MD-UX-FEEDBACK-MAP-001-katex-blast.yaml`
- `.esaa/analysis/MD-UX-FEEDBACK-MAP-001-newdoc-blast.yaml`
- `.esaa/analysis/MD-UX-FEEDBACK-MAP-001-toc-blast.yaml`
- `.esaa/analysis/MD-UX-FEEDBACK-MAP-001-toolbar-blast.yaml`
