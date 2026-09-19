# Onda 2 — Wiki Links | MD-WIKI-003
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
Preview renderiza `[[Target]]` / `[[Target|Alias]]` como elementos clicáveis (não texto cru).

## Depende
MD-WIKI-002 (para classes resolved/unresolved se a resolução for no FE; se o plugin só emite `data-wiki-target`, a resolução pode ser lazy no click — preferir marcar status se barato)

## Trabalho
1. Plugin remark/micromark/rehype em `src/markdown/plugins/` integrado em `processor.ts`
2. HTML sugerido: `<a class="wiki-link is-resolved|is-unresolved" data-wiki-target="…" href="#">label</a>`
3. Não quebrar sanitize (`sanitize.ts`) — allowlist de class/data attrs
4. Testes do processor com fixtures `[[A]]` e `[[A|B]]`

## Artefatos
- NEW plugin + MOD processor/sanitize
- Testes em `tests/markdown/` ou equivalente

## AC
- [ ] Preview mostra label (alias ou target)
- [ ] Unresolved com estilo distinto (CSS)
- [ ] Sanitize não stripa o link

**Verify:** `wiki_preview_render_pass`
