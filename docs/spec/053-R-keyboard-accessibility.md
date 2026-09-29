# 053-R — Keyboard & Accessibility (WAI-ARIA)

## Status
- **Status:** Implemented & Verified
- **Date:** 2026-09-28
- **Task ID:** MD-GUI-053-R

## Contexto e Objetivos
A tarefa 053-R consolida a governança de acessibilidade e navegação por teclado da Nova GUI R3 do MD Studio, em total conformidade com as diretrizes WAI-ARIA 1.2 e WCAG 2.1 Nível AA:
1. **Foco Visível e Contraste (`INV-FOCUS-VISIBLE`):**
   - Anéis de foco de 2px de espessura com offset de 2px e box-shadow de dispersão para todos os controles interativos (`button`, `input`, `select`, `textarea`, `[role="tab"]`, `[role="treeitem"]`, `[role="menuitem"]`).
   - Visibilidade garantida tanto no tema claro quanto no escuro (`--color-focus: #3b82f6`).
2. **Suporte a Movimento Reduzido (`INV-REDUCED-MOTION`):**
   - Ativação imediata de animações e transições (`duration: 0.01ms !important`) quando o usuário tiver ativado preferência de sistema por redução de movimento (`@media (prefers-reduced-motion: reduce)`), prevenindo desconforto vestibular.
3. **Semântica WAI-ARIA Estrutural:**
   - App Shell: `role="application"` com `aria-label="MD Studio"`.
   - Document Bar e Tabs: `role="tablist"` e `role="tab"` com estados `aria-selected` explícitos.
   - Status Bar: `role="region"` com `aria-label="Barra de status"` e badges de persistência em `role="status"` e `aria-live="polite"`.
   - Modais: `role="dialog"`, `aria-modal="true"` com focus trap e focus restore.
   - Toasts: Container com `role="status"` e `aria-live="polite"`, flutuante e sem interceptar eventos de clique no canvas.

## Invariantes Garantidas
- `INV-FOCUS-VISIBLE`: Nenhum elemento interativo pode ter foco invisível quando navegado via teclado.
- `INV-REDUCED-MOTION`: Respeito incondicional às configurações de acessibilidade de movimento do sistema operacional.

## Verificação
- Suíte `tests/runtime/accessibility-keyboard.test.ts` passando 100%.
- Suíte completa de testes de runtime passando 100%.
- Verificação de tipos estrita (`pnpm typecheck`) sem erros.
