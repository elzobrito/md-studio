# Onda 2 — Pacote para o agente executor

Repo: `/home/elzobrito/desenvolvimento/md-studio`  
WBS: `docs/onda2/WBS-ONDA-2-WIKI-LINKS-v1.0.md`

## Missão
Entregar **Wiki Links usáveis** sobre a Knowledge Foundation (já done).  
**Não** implementar grafo nem backlinks (fora da v1).

## Ordem
1. MD-WIKI-001 Resolve engine  
2. MD-WIKI-002 IPC + tipos FE  
3. Em paralelo após 002: **003** preview, **005** autocomplete, **006** outgoing panel  
4. MD-WIKI-004 navegação preview  
5. MD-WIKI-007 criar nota  
6. MD-WIKI-008 QA  

## Protocolo
```bash
ROOT=/home/elzobrito/desenvolvimento/md-studio
python3 -m esaa --root "$ROOT" state MD-WIKI-001
# claim → implement → prove → complete
cat docs/onda2/MD-WIKI-001-FULL.md
```

## Âncoras
Parser/index já existem em `md-studio-core`. Preview: `src/markdown/processor.ts` + `MarkdownViewer.tsx`. Metadata IPC já em `src/lib/ipc/metadata.ts`.

## Done da onda
Resolve + preview clicável + autocomplete + outgoing + create-from-unresolved + QA verde, sem grafo/backlinks.
