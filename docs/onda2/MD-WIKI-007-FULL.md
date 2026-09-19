# Onda 2 — Wiki Links | MD-WIKI-007
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
Criar `.md` a partir de wiki link unresolved (preview ou painel ou autocomplete “criar novo”).

## Depende
MD-WIKI-004, MD-WIKI-005

## Trabalho
1. Dialog confirma: nome arquivo (slug do target), pasta default = dir do doc atual ou root workspace
2. Criar arquivo via comando Tauri existente de save/create (reusar; não inventar IO inseguro)
3. Conteúdo inicial: `# {title}\n\n`
4. Reindex incremental / trigger + abrir o novo doc
5. Opcional: substituir seleção unresolved — não obrigatório nesta task

## Segurança
- Só dentro do workspace; sanitize nome de arquivo; sem `..`

## AC
- [ ] Unresolved → criar → arquivo no disco → abre no editor
- [ ] Índice atualiza (link passa a resolved após reindex)
- [ ] Cancelar não cria nada

**Verify:** `wiki_create_from_link_pass`
