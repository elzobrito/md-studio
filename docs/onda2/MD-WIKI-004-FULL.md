# Onda 2 — Wiki Links | MD-WIKI-004
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
Clique no wiki link do preview navega ou sinaliza unresolved.

## Depende
MD-WIKI-003

## Trabalho
1. Em `MarkdownViewer` (ou container pai): delegação de click em `.wiki-link`
2. Resolved → abrir documento no app (mesmo caminho de open file interno / `onOpenRelative`)
3. Unresolved → emitir evento/callback `onUnresolvedWiki(target)` (criar na 007; por enquanto toast/dialog stub OK se 007 ainda não merged — preferir callback tipado)
4. Não navegar href externo; `preventDefault`

## Artefatos
- MOD: `src/components/MarkdownViewer.tsx` (+ App wiring)

## AC
- [ ] Click resolved abre o md correto
- [ ] Click unresolved não quebra; callback disparado
- [ ] Path fence respeitado

**Verify:** `wiki_preview_nav_pass`
