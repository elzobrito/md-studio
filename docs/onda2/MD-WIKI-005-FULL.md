# Onda 2 — Wiki Links | MD-WIKI-005
**Agente executor.** Task ESAA em `todo`. Claim → implement → prove → complete.
**WBS:** `docs/onda2/WBS-ONDA-2-WIKI-LINKS-v1.0.md`
**Repo:** `/home/elzobrito/desenvolvimento/md-studio`
**Pré:** Foundation done. **Proibido:** grafo, backlinks UI, reparse inventado (reusar parser Onda 1).

## Regras
1. Paths reais — `rg`/`find` antes de criar paralelo.
2. Path fence / workspace root — sem escapar do workspace.
3. Não quebrar 0B/0C/Foundation tests.
4. Dark/light se houver UI.
5. Done só com verify + evidência em `docs/qa/` quando aplicável.


## Objetivo
Autocomplete no editor ao digitar `[[`.

## Depende
MD-WIKI-002 (lista de docs do índice)

## Trabalho
1. Extensão CodeMirror 6 (completion source) em `src/editor/` 
2. Trigger: após `[[` até `]]` ou cursor
3. Candidatos: títulos/stems/paths relativos do `get_all_documents` (cache leve)
4. Inserção: `[[Target]]` ou completa target; alias manual depois
5. Convivência com slash menu / formatting toolbar da 0B (sem roubar teclas)

## Artefatos
- NEW completion module + wire no MarkdownEditor
- Teste unitário do filtro de candidatos se puro TS

## AC
- [ ] `[[` abre completions
- [ ] Escolher item insere wiki link válido
- [ ] Esc fecha; não regressa slash `/`

**Verify:** `wiki_editor_autocomplete_pass`
