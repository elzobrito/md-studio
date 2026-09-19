# Onda 0C — UI Polish | MD-UI-EMPTY-001
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
Corrigir a **hierarquia visual** do empty/welcome. Não redesenhar do zero.

## Estado atual (já no código)
- `src/components/empty/WelcomeScreen.tsx` — ícone 📝 (não `?`), 3 botões, hint Ctrl+P, recentes.
- Bug: se `onNewDocument` existe, "Novo Documento" fica `primary` e "Abrir Pasta" vira `secondary`.
- `src/components/empty/EmptyState.tsx` — workspace sem arquivo já simples.
- CSS: `src/styles/empty-state.css` (NÃO criar `welcome-screen.css`).

## Trabalho
1. Hierarquia obrigatória dos CTAs no WelcomeScreen:
   - **primary** = Abrir pasta
   - **secondary** = Abrir arquivo
   - **ghost/terciário** = Criar novo .md (se callback existir)
2. Manter hint Ctrl+P; manter recentes no welcome.
3. EmptyState: copy curta ("Selecione um arquivo na árvore" / Ctrl+P); sem título "MD Studio"; sem `?`.
4. Conferir orquestração em `src/App.tsx`: sem workspace → Welcome; workspace sem arquivo → EmptyState; com arquivo → editor.
5. Dark/light via tokens já usados em `empty-state.css`.

## Artefatos
- MOD: `src/components/empty/WelcomeScreen.tsx`
- MOD: `src/components/empty/EmptyState.tsx`
- MOD: `src/styles/empty-state.css` (só se preciso)
- MOD: `src/App.tsx` (só se a troca de estados estiver errada)
- QA note: `docs/qa/onda0c-empty.md` (opcional nesta task; obrigatório no QA-001)

## Fora de escopo
Splash, painel direito, Button global, header.

## Acceptance criteria
- [ ] Abrir pasta é o botão visualmente dominante
- [ ] Abrir arquivo = secondary; Criar novo = menos destaque
- [ ] Sem ícone `?`
- [ ] Hint Ctrl+P visível no welcome
- [ ] Três estados (sem WS / WS sem arq / com arq) corretos
- [ ] Dark e light OK

**Verify:** `empty_state_polish_pass`
