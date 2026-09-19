# Onda 0C — UI Polish | MD-UI-QA-001
**Para o agente executor.** Cadastro ESAA já existe (`todo`). Implementar até done com prova.
**WBS:** `docs/onda0c/WBS-ONDA-0C-UI-POLISH-v2.1.md`
**Repo:** `/home/elzobrito/desenvolvimento/md-studio` (branch `main`)
**Pré-condição:** Onda 0B (`MD-GM-001`…`008`) e splash (`MD-UI-SPLASH-001`) já **done**. NÃO reabrir splash. NÃO reinventar o que já existe — só o delta desta task.

## Regras de execução
1. `claim` → implementar → provar → `complete` com evidência → pedir review.
2. Paths abaixo são os **reais** do tree. Não criar arquivos paralelos com nomes do WBS 2.0 antigo.
3. Não quebrar vitest da 0B, open `.md` pelo SO, nem single-instance.
4. Temas dark e light.
5. Done = critério de aceite + verify id abaixo com prova (comando/log/screenshot em `docs/qa/`).


## Objetivo
Fechar a Onda 0C com prova. Depende de EMPTY, PANEL, SIDEBAR, HEADER, BUTTONS.

## Checklist obrigatório
### Empty
- [ ] 3 CTAs; primary=Abrir pasta; sem `?`; Ctrl+P hint
### Panel
- [ ] × fecha; persistência; [sumário] reabre; Ctrl+Shift+\; editor expande
### Sidebar
- [ ] ações > recentes; Button em uso
### Header / buttons
- [ ] sem título interno duplicado; title dinâmico; hotspots migrados
### Regressão
- [ ] Onda 0B (toolbar, slash, paste, templates, cheatsheet, hints, tables)
- [ ] Splash boot ainda OK (não reimplementar)
- [ ] Abrir `.md` pelo SO + single-instance
### Automatizado
- [ ] `pnpm test` (ou script do repo) — 0 falhas na suíte relevante
- [ ] Evidência escrita em `docs/qa/onda0c-ui-polish.md`

## Artefatos
- NEW: `docs/qa/onda0c-ui-polish.md` (pass/fail + comandos + notas manuais)

**Verify:** `onda_0c_ui_polish_complete`
