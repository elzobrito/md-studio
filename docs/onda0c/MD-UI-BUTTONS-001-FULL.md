# Onda 0C — UI Polish | MD-UI-BUTTONS-001
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
Uma família visual de botões nos hotspots da UI chrome (não na toolbar CM6 da 0B, salvo se trivial e sem regressão).

## Dependência
`MD-UI-SIDEBAR-001` (`Button` já criado).

## Trabalho
1. Criar `docs/onda0c/design-system-audit.md` — tabela: componente | botão | variant atual | variant alvo.
2. Migrar hotspots para `Button`:
   - WelcomeScreen / EmptyState CTAs
   - FileExplorer open buttons (se ainda não)
   - AppHeader icon/save (onde couber)
   - ViewModeToggle
   - NewDocumentModal ações principais
3. Tokens: `--radius-btn: 6px` (ou equivalente) em `button.css` / theme tokens.
4. Conferir dark/light.

## Artefatos
- NEW: `docs/onda0c/design-system-audit.md`
- MOD: componentes da auditoria
- MOD: `src/components/ui/Button.tsx` / `button.css` se precisar estender (icon-only, active)

## Fora
- Não regressar FormattingToolbar / SlashMenu da Onda 0B
- Micro-animação da status bar (backlog 0C.1)

## Acceptance criteria
- [ ] Auditoria commitada
- [ ] Hotspots migrados
- [ ] Radius/padding consistentes
- [ ] Dark/light OK; sem regressão 0B óbvia

**Verify:** `design_system_pass`
