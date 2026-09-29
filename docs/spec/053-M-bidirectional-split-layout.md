# 053-M — Bidirectional Split Layout

**Task ID ESAA:** `MD-GUI-053-M`  
**Referência Normativa:** `053-nova-gui-R3.md` (Task 053-M, Seção 341, PARTE IX, PARTE LI)  
**Status:** Implementado  

---

## 1. Contexto e Motivação

No modelo anterior, a visão dividida (`viewMode: "split"`) suportava exclusivamente a orientação vertical (lado a lado), com acoplamento a regras globais de CSS grid da janela.

Com a arquitetura da Nova GUI R3:
1. O split visual é desacoplado e bidirecional: suporta orientação **vertical** (lado a lado) e **horizontal** (topo/base).
2. O usuário pode alternar a orientação em tempo real via controles no `DocumentBar` ou pelo atalho `Alt+O`.
3. As proporções de divisão de cada orientação são preservadas independentemente em `localStorage` (`md-studio.split-ratio-vertical`, `md-studio.split-ratio-horizontal`).
4. O componente `SplitDivider` opera suavemente em ambos os eixos com `PointerCapture`, hitbox ergonômica, menu de presets (40/60, 50/50, 60/40), duplo clique para redefinir e acessibilidade por teclado (`role="separator"`, setas de navegação, `Home`, `End`).
5. A sincronização de rolagem (`useScrollSync`) é preservada nos dois eixos, calculando a porcentagem de scroll vertical dos scrollers do CodeMirror e do MarkdownViewer.
6. Suporte a maximização reversível de painel (`SplitMaximizedPane`).

---

## 2. Componentes e Estrutura

- **`src/components/layout/SplitDivider.tsx`:**  
  Divisor redimensionável universal com suporte a `orientation: "vertical" | "horizontal"`. Suporta pointer drag, acessibilidade ARIA (`aria-orientation`, `aria-valuenow`), atalhos de teclado e persistência no `localStorage`.
- **`src/components/layout/BidirectionalSplitLayout.tsx`:**  
  Componente de layout flexível que gerencia os painéis de editor e preview, divididos pelo `SplitDivider`, com limites mínimos e colapso/maximização reversível.
- **`src/components/tabs/DocumentBar.tsx`:**  
  Apresenta os botões de seleção de orientação de split (`SplitIcon` e `SplitHorizontalIcon`) quando o modo ativo for `viewMode === "split"`.
- **`src/styles/split-view.css`:**  
  Tokens e classes CSS semânticas (`.split-layout.is-vertical`, `.split-layout.is-horizontal`, `.split-divider.is-vertical`, `.split-divider.is-horizontal`, `.split-orientation-controls`).

---

## 3. Critérios de Aceitação e Verificação

1. **Alternância fluida entre split vertical e horizontal:** validado via testes unitários e controles na interface.
2. **Redimensionamento com persistência de proporção sem clipping:** proporções salvas em `localStorage` e clamping entre 15% e 85%.
3. **Scroll sync preservado entre editor e preview:** `useScrollSync` opera sobre `scrollTop` de forma compatível e bidirecional.
4. **Testes de split layout passando 100%:** `tests/runtime/split-layout.test.ts` cobrindo persistência, componentes, ARIA e redimensionamento.
