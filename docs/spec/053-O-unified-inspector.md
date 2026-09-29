# 053-O — Unified Inspector

**Task ID ESAA:** `MD-GUI-053-O`  
**Referência Normativa:** `053-nova-gui-R3.md` (Task 053-O, Seção 343, PARTE XV, PARTE XXVI, PARTE LI)  
**Status:** Implementado  

---

## 1. Contexto e Motivação

No modelo anterior do painel lateral direito, as capacidades de navegação e metadados estavam dispersas e com potencial acoplamento ao DOM de renderização do Preview.

Conforme a especificação `053-nova-gui-R3.md`:
1. **Superfície única contextual:**
   - O Inspector é uma única superfície para metadados e navegação do documento ativo.
   - Apresenta seções modulares em acordeão acessível:
     - `Sumário` (TOC / Headings)
     - `Links citados` (Outgoing links)
     - `Backlinks` (Incoming links)
     - `Métricas & Estrutura` (DocumentInspector)
     - `Saúde do Workspace` (WorkspaceHealthPanel)
2. **Desacoplamento estrito do DOM do Preview (Invariante Normativa):**
   - O TOC e os metadados derivam exclusivamente da AST de markdown e do modelo semântico em memória (`DocumentSemanticModel` / `extractOutline`).
   - O estado do Preview (seja ele montado, oculto, ou em submodos HTML/Diff) tem **zero** impacto na disponibilidade e frescor do Inspector.
3. **Acessibilidade e Usabilidade:**
   - Acordeões com botões nativos, `aria-expanded`, `aria-controls`, badges numéricos contextuais com contagem de itens, e indicador de recolhimento.

---

## 2. Componentes Criados e Integrados

- `src/components/inspector/UnifiedInspector.tsx`: Componente de superfície única de inspeção com acordeões contextuais acessíveis.
- `src/styles/unified-inspector.css`: Estilização e transições dos acordeões e badges.
- `src/components/layout/UnifiedRightPanel.tsx`: Integração da visualização unificada em acordeão.
- `tests/runtime/unified-inspector.test.ts`: Suíte de testes automatizados com Vitest.

---

## 3. Critérios de Aceitação e Verificação

1. **Inspector unificado contextual à direita alimentado por providers reais:** validado com componentes integrados.
2. **Sumário (TOC) funcional e reativo a edições sem depender do DOM do Preview:** comprovado por teste com reatividade de headings pura sobre AST.
3. **Seções de Links, Backlinks e Diagramas integradas com navegação bidirecional:** links e backlinks reais recebidos e mapeados.
4. **Testes automatizados do Inspector passando 100%:** suíte Vitest verde.
