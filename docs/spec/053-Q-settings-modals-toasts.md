# 053-Q — Settings, Modals & Toasts

## Status
- **Status:** Implemented & Verified
- **Date:** 2026-09-28
- **Task ID:** MD-GUI-053-Q

## Contexto e Objetivos
A migração da Nova GUI R3 requer que todos os diálogos modais e o sistema de notificações toast cumpram estritamente o WAI-ARIA Modal Dialog Pattern e boas práticas ergonômicas de acessibilidade:
1. `SettingsPanel` unificado com todas as 7 abas funcionais (`appearance`, `editor`, `preview`, `workspace`, `shortcuts`, `tooling`, `about`).
2. Gerenciamento estrito de foco para modais:
   - Captura do elemento ativo anterior (`previousActiveElementRef`).
   - Focus trap acessível em `Tab` e `Shift+Tab`.
   - Restauração de foco ao fechar via `Escape` ou botão de fechar.
   - Semântica ARIA: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="settings-dialog-title"`.
3. Notificações Toast desacopladas e não-bloqueantes:
   - Provedor React `ToastProvider` e hook `useToast()`.
   - Live region acessível com `role="status"`, `aria-live="polite"`, `aria-atomic="true"`.
   - Estilização flutuante (`pointer-events: none` no container, `pointer-events: auto` nos cards individuais) para evitar interceptação espúria de cliques no canvas do editor.
   - Auto-dismiss com timer seguro.

## Invariantes Garantidas
- `INV-FOCUS-TRAP-MODAL`: O foco nunca se perde fora do modal ativo ao navegar por teclado; o foco inicial é movido para o modal e restaurado para o disparador ao fechar.
- `INV-TOAST-NON-BLOCKING`: Notificações flutuantes não bloqueiam a interação do usuário com a escrita ou leitura no documento.

## Verificação
- Suíte `tests/runtime/settings-modals-toasts.test.ts` passando 100%.
- Typecheck estrito sem erros.
