# Onda 0C — UI Polish | MD-UI-PANEL-001
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
Tornar o painel direito (sumário) **obviamente** colapsável. O store já existe — não reescrever.

## Estado atual
- `src/state/ui.ts` — `rightPanelVisible` + `localStorage` + set/toggle.
- `AppHeader` / PanelControls — toggle `Ctrl+Shift+\` já existe.
- `StatusBar` — **não** tem botão `[sumário]` para reabrir.
- `DocumentOutline.tsx` — falta × claro no cabeçalho do painel.

## Trabalho
1. Cabeçalho do painel: título SUMÁRIO + botão × (`aria-label="Fechar painel"`, tooltip, chama API do `ui` store para fechar).
2. `StatusBar`: se `!rightPanelVisible`, mostrar botão `[sumário]` à direita que reabre.
3. CSS (~180ms): painel colapsado width 0; editor expande; sem layout jump feio.
4. Provar persistência: fechar painel → reiniciar app → continua fechado.
5. Confirmar atalho `Ctrl+Shift+\` ainda alterna.

## Artefatos
- MOD: `src/components/DocumentOutline.tsx`
- MOD: `src/components/statusbar/StatusBar.tsx`
- MOD: `src/styles/layout.css` e/ou `outline.css` / `statusbar.css`
- USAR (não reescrever): `src/state/ui.ts`
- Alinhar props: `App.tsx` / header se precisar passar `rightOpen` + callbacks à StatusBar

## Fora
Splash; empty; redesign do conteúdo do outline.

## Acceptance criteria
- [ ] × fecha o painel com transição
- [ ] Editor ocupa o espaço liberado
- [ ] Estado persiste no relaunch
- [ ] `[sumário]` na status bar quando fechado; reabre ao clicar
- [ ] `Ctrl+Shift+\` toggle OK
- [ ] Dark/light OK

**Verify:** `collapsible_panel_pass`
