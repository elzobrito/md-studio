# Onda 3 — EXECUTOR BRIEF (Backlinks v3.1)

Repo: `/home/elzobrito/desenvolvimento/md-studio`  
WBS: `docs/onda3/WBS-ONDA-3-BACKLINKS-v3.1.md`

## Missão
Índice reverso + painel Backlinks. **Sem grafo.**

## Ordem obrigatória
1. **MD-BACKLINK-000** — emendar PROJETO+G01; **commitar Onda 2** (gate)
2. MD-BACKLINK-001 — contrato
3. MD-BACKLINK-002 — Reverse Link Index
4. MD-BACKLINK-003 — hooks reindex/save/watcher
5. MD-BACKLINK-004 — IPC + context on-demand
6. MD-BACKLINK-005 — painel direito
7. MD-BACKLINK-006 — go-to-line
8. MD-BACKLINK-007 — a11y
9. MD-BACKLINK-008 — QA

## Âncoras reais (confirmar com rg)
- Resolve: `src-tauri/crates/md-studio-core/src/index/wiki_resolve.rs` (`Resolved|Unresolved|Ambiguous`)
- Outgoing UI: `src/components/wiki/OutgoingLinksPanel.tsx`
- Save→reindex: `src-tauri/src/commands/mod.rs` (`save_document`)
- Watcher: `src-tauri/src/watcher/`

## Proibido
Segundo watcher; enum collision; column; self-links no resultado; persistência própria do BacklinkIndex; misturar commit Onda 2 com código 3.

```bash
python3 -m esaa --root /home/elzobrito/desenvolvimento/md-studio state MD-BACKLINK-000
cat docs/onda3/MD-BACKLINK-000-FULL.md
```
