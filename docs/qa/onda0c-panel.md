# QA: MD-UI-PANEL-001 (Collapsible Right Panel & Status Bar)

## Escopo
- Cabeçalho do painel direito (`DocumentOutline.tsx`):
  - Título `Sumário`.
  - Botão de colapso de seções (`≡`).
  - Botão de fechar painel (`×`) com `aria-label="Fechar painel"` e tooltip indicando `Ctrl+Shift+\`.
  - Fecha o painel atualizando `uiStore.setRight(false)` ou via callback `onClose`.
- Barra de status (`StatusBar.tsx`):
  - Quando `rightPanelVisible` for `false`, exibe botão `[sumário]` com `aria-label="Abrir sumário"`.
  - Ao clicar em `[sumário]`, reabre o painel via `uiStore.setRight(true)` ou callback `onToggleRight`.
- Transição CSS (~180ms ease) em `layout.css` para redimensionamento e expansão fluida do editor.
- Persistência: o estado de `rightPanelVisible` persiste em `localStorage` (`md-studio.ui-state`).

## Verificação
- Verify Check: `collapsible_panel_pass`
- Testes automatizados: `tests/panel/collapsiblePanel.test.tsx` (4 testes cobrindo fechamento, reabertura, persistência e ausência do botão quando aberto).
- Suíte completa: 25 arquivos de teste, 161 testes passando sem regressão.
