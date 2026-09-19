# Onda 2 — Wiki Links | MD-WIKI-001
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
Motor de resolução: dado `target` de um `WikiLink`, achar o `.md` no `MetadataIndex` ou marcar unresolved.

## Trabalho
1. Em `md-studio-core` (módulo index), implementar resolução com ordem documentada, ex.:
   1. path relativo exato (com ou sem `.md`)
   2. stem do arquivo == target (case-fold configurável; default case-insensitive em Linux? **documentar escolha** — preferir case-sensitive no path, case-insensitive no título/stem se houver colisão → lista)
   3. título (`DocumentMetadata.title`) == target
2. Tipo `ResolvedWikiLink { target, alias, line, status: Resolved|Unresolved, path: Option<PathBuf> }`
3. API no índice: `resolve_wiki_link(target) -> …` e `resolve_all(doc) -> Vec<ResolvedWikiLink>`
4. Testes unitários Rust: hit path, hit title, miss, alias ignorado na resolução (alias só display), colisão documentada

## Artefatos
- NEW/MOD sob `src-tauri/crates/md-studio-core/src/index/`
- Testes no crate core

## Fora
IPC, UI, preview.

## AC
- [ ] Regras de resolve documentadas no código ou `docs/onda2/resolve-rules.md`
- [ ] Resolved vs Unresolved cobertos por testes
- [ ] Sem I/O fora do índice (resolve é puro sobre o index)

**Verify:** `wiki_resolve_engine_pass`
