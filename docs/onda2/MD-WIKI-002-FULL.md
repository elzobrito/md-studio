# Onda 2 — Wiki Links | MD-WIKI-002
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
Expor resolução via Tauri IPC + tipos/hooks FE.

## Depende
MD-WIKI-001

## Trabalho
1. Comandos (nomes finais via generate_handler existente em metadata):
   - `resolve_wiki_link { target }`
   - `get_resolved_wiki_links_for { path }` (outgoing enriquecido)
   - opcional: `list_unresolved_wiki_links` (workspace)
2. Atualizar `src/types/metadata.ts` com `ResolvedWikiLink` / status
3. `src/lib/ipc/metadata.ts` + `useMetadata` (ou hook dedicado `useWikiLinks`)
4. Não quebrar comandos já existentes (`get_wiki_links_for` pode permanecer como raw parse)

## Artefatos
- MOD: `src-tauri/src/commands/metadata.rs` (+ lib.rs handler)
- MOD: types/ipc/hooks FE

## AC
- [ ] FE consegue listar outgoing resolved/unresolved do doc atual
- [ ] Tipos camelCase alinhados ao serde Rust
- [ ] Teste smoke IPC ou unit do comando

**Verify:** `wiki_resolve_ipc_pass`
