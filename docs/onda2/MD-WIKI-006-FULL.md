# Onda 2 — Wiki Links | MD-WIKI-006
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
Painel “Links” do documento atual: lista outgoing resolved/unresolved (NÃO backlinks).

## Depende
MD-WIKI-002

## Trabalho
1. UI no right panel (aba ao lado de Sumário) ou seção colapsável — reusar padrões 0C
2. Lista: label, status badge, click → open ou unresolved action
3. Empty state: “Nenhum wiki link neste documento”
4. Atualiza ao trocar doc / após reindex

## Artefatos
- NEW component ex. `src/components/wiki/OutgoingLinksPanel.tsx`
- MOD right panel shell

## Fora
Backlinks, grafo, filtro workspace-wide (pode ser follow-up)

## AC
- [ ] Lista outgoing correta vs índice
- [ ] Click resolved abre
- [ ] Unresolved distinguível
- [ ] Dark/light OK

**Verify:** `wiki_outgoing_panel_pass`
