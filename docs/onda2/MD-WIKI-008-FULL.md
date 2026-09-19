# Onda 2 — Wiki Links | MD-WIKI-008
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
Gate de encerramento da Onda 2.

## Depende
MD-WIKI-001…007

## Checklist
- [ ] Resolve rules + testes Rust
- [ ] IPC + FE types
- [ ] Preview render + nav
- [ ] Autocomplete [[
- [ ] Outgoing panel
- [ ] Create from unresolved
- [ ] Regressão: `pnpm test`, typecheck, cargo test relevantes
- [ ] Regressão manual: 0B guided md, 0C polish, splash, open from OS
- [ ] Sem UI de grafo/backlinks
- [ ] Evidência: `docs/qa/onda2-wiki-links.md`

**Verify:** `onda_2_wiki_links_complete`
