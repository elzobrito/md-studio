> **Status atualizado em 2026-09-24:** todas as tarefas da Onda 1 (MD-FOUNDATION-001–010) estão **concluídas** (`done` no ESAA). Este handoff permanece como registro histórico; ver `.roadmap/roadmap.json` / `activity.jsonl`.

# Onda 1 — Handoff ESAA (Knowledge Foundation)

**Repo:** https://github.com/elzobrito/md-studio  
**Workspace local:** `/home/elzobrito/desenvolvimento/md-studio`  
**Executor:** outro agente (estas tasks estão `todo` no ESAA do projeto)

## Tasks criadas (ordem)

| ID | Título | Depende de |
|----|--------|------------|
| MD-FOUNDATION-001 | DocumentMetadata model | — |
| MD-FOUNDATION-002 | MetadataIndex core | 001 |
| MD-FOUNDATION-003 | Wiki link parser | 001 |
| MD-FOUNDATION-004 | Tag parser | 001 |
| MD-FOUNDATION-005 | WorkspaceScanner + extractor | 001,003,004 |
| MD-FOUNDATION-006 | ReindexEngine | 002,005 |
| MD-FOUNDATION-007 | Persistência `.mdstudio/index.json` | 002,006 |
| MD-FOUNDATION-008 | Metadata IPC + FE | 002,006,007 |
| MD-FOUNDATION-009 | save → reindex (+ watcher bridge) | 006,008 |
| MD-FOUNDATION-010 | QA / gate encerramento | 001–009 |

## Complementar (já done)

- `MDS-PROD-OPEN-FILE-001` — abrir `.md` via SO/argv (PR #2). Não reabrir como bug da Onda 1.

## Paths reais (obrigatório)

- Core: `src-tauri/crates/md-studio-core/`
- App: `src-tauri/src/`
- FE IPC: `src/lib/ipc/` (não `src/ipc/`)
- Watcher existente: `src-tauri/src/watcher/` — **reusar**, não duplicar

## Princípios

Local-first; não deletar `.md` do usuário; manter path fence; sem regressão Onda 0 (40 testes); testes por módulo.

Cada task no ESAA contém a **descrição completa** no campo description — ler com:

```bash
python3 -m esaa --root /home/elzobrito/desenvolvimento/md-studio state MD-FOUNDATION-001
```
