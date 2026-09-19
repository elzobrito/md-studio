# Onda 0C — UI Polish | MD-UI-HEADER-001
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
Remover título duplicado no chrome interno; título nativo da janela dinâmico.

## Dependência
`MD-UI-SIDEBAR-001` (reusar `Button` se possível no view mode / icon buttons).

## Estado atual
- `src/components/header/AppHeader.tsx` ~L61: `<strong>MD Studio</strong>` → ruído com title da janela OS.

## Trabalho
1. Remover logo/texto "MD Studio" do header interno.
2. Window title via Tauri:
   - sem arquivo: `MD Studio`
   - com arquivo: `MD Studio — nome.md`
   - dirty: `MD Studio — ● nome.md`
3. Layout: esquerda = toggle sidebar + view mode; direita = novo + settings + salvar.
4. ViewModeToggle: preferir Button ghost + estado active.
5. Manter Ctrl+, / atalhos existentes.

## Artefatos
- MOD: `src/components/header/AppHeader.tsx`
- MOD: `src/components/header/ViewModeToggle.tsx` (se aplicável)
- MOD: `src/styles/header.css`
- Hook/util de title: próximo de `useSaveStatus` / session — onde já houver dirty flag

## Fora
Auditoria completa de botões (BUTTONS-001). Splash.

## Acceptance criteria
- [ ] Sem "MD Studio" duplicado no header interno
- [ ] Title nativo dinâmico (inclui dirty)
- [ ] Novo / settings / salvar / view mode OK
- [ ] Header mais compacto

**Verify:** `top_bar_polish_pass`
