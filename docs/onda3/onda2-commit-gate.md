# Onda 2 Commit Gate

## Status do Gate: APROVADO

A Onda 2 (Wiki Links) e os hotfixes de desktop/cursor associados foram consolidados e enviados para o repositório remoto em commit exclusivo antes de qualquer implementação da Onda 3 (Backlinks).

## Informações do Commit

- **Hash**: `6602538b10ee277e35b9c7ae4b66152e0529f724`
- **Short Hash**: `6602538`
- **Branch**: `main`
- **Remote**: `origin/main` (pushed)
- **Mensagem**: `feat(onda2): implement wiki links, completion menu and desktop controls hotfix`

## Conteúdo Consolidado

1. **Onda 2 (Wiki Links)**:
   - Resolução e parser de Wiki Links (`[[alvo|label]]`) no core Rust e TypeScript.
   - Menu de autocompleção com trigger `[[` no CodeMirror 6.
   - Painel de Outgoing Links com status de resolução (Resolved, Ambiguous, Unresolved).
   - Ação de criação de nota a partir de Wiki Link não resolvido com sanitização de caminho.
   - Suíte de testes: 31 arquivos de teste, 178 testes aprovados.

2. **Hotfix Desktop/Linux (`MD-HOTFIX-DESKTOP-002`)**:
   - Forçar backend X11/XWayland no launcher desktop (`GDK_BACKEND=x11`) devido a incompatibilidade upstream do Mutter/Tauri com controles de janela CSD em Wayland nativo.
   - Correção de posicionamento do cursor no CodeMirror.

3. **Documentação e Governança**:
   - `docs/onda2/`: WBS, Handoff e briefs completos da Onda 2.
   - `docs/qa/`: Evidências de QA de Onda 2 e hotfixes.
   - `.roadmap/`: Event store ESAA com trilha auditável de eventos.

## Inspeção Pós-Consolidação (git status)

```
On branch main
Your branch is up to date with 'origin/main'.

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	docs/onda3/
```

Nenhum código de backlinks da Onda 3 está presente no commit consolidado. O gate da Onda 2 está satisfeito e pronto para a liberação da Onda 3.
