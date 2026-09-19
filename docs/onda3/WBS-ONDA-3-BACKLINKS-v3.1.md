# WBS-ONDA-3-BACKLINKS v3.1

## MD Studio — Backlinks e Índice Reverso

**Status:** ADMITIDA ESAA  
**Pré:** Onda 2 done + gate `MD-BACKLINK-000` (norma + commit Onda 2)  
**Gate final:** `onda_3_backlinks_v3_1_complete`

### Decisões fechadas
- Só `WikiLinkStatus::Resolved` entra no índice; Unresolved e Ambiguous fora.
- Sem `column`; navegação por `line` (base 1 na API pública).
- Contexto textual: **read-on-demand** (`Option<String>`); falha → `null`, ocorrência permanece.
- Self-links **excluídos** do resultado público.
- Sem persistência própria do BacklinkIndex (derivado do metadata index).
- Reusar ReindexEngine / save / watcher — **proibido** segundo watcher.
- Sem grafo / analytics / rename cascade / HTTP / md-links clássicos.
- Emendar `PROJETO.md` + `docs/spec/G01-...` : backlinks wiki na v1; grafo fora.

### Tasks
| ID | Título | Depende | Verify |
|----|--------|---------|--------|
| MD-BACKLINK-000 | Governança v1 + commit Onda 2 | — | md_backlink_000_governance_pass |
| MD-BACKLINK-001 | Contrato + mapa do repo | 000 | md_backlink_001_contract_pass |
| MD-BACKLINK-002 | Reverse Link Index (Resolved only) | 001 | md_backlink_002_index_pass |
| MD-BACKLINK-003 | Incremental via hooks existentes | 002 | md_backlink_003_incremental_pass |
| MD-BACKLINK-004 | IPC get_backlinks + contexto | 002,003 | md_backlink_004_ipc_pass |
| MD-BACKLINK-005 | Painel Backlinks (painel direito) | 004 | md_backlink_005_panel_pass |
| MD-BACKLINK-006 | Navegação source + line | 005 | md_backlink_006_navigation_pass |
| MD-BACKLINK-007 | A11y + estados | 005,006 | md_backlink_007_ux_pass |
| MD-BACKLINK-008 | QA + encerramento | 000–007 | md_backlink_008_qa_pass |

Detalhe completo: `docs/onda3/MD-BACKLINK-*-FULL.md` e `EXECUTOR-BRIEF.md`.
