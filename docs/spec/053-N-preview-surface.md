# 053-N — Preview Surface

**Task ID ESAA:** `MD-GUI-053-N`  
**Referência Normativa:** `053-nova-gui-R3.md` (Task 053-N, Seção 342, PARTE XIX, PARTE XXVI, PARTE LI)  
**Status:** Implementado  

---

## 1. Contexto e Motivação

Na interface anterior, o preview markdown era acoplado diretamente a um elemento de visualização sem barra contextual própria de controle de exibição, inspeção de código compilado ou visualização de alterações frente à versão em disco.

A especificação `053-nova-gui-R3.md` define a **Preview Surface** como uma área contextual autônoma equipada com sub-toolbar e recursos avançados:
1. **Submodos feature-gated com cardinalidade dinâmica:**
   - `Visualização` (`'view'`): renderização normal sanitizada e interativa do documento Markdown.
   - `HTML gerado` (`'html'`): visualização do HTML intermediário gerado e sanitizado, com botão de cópia rápida.
   - `Diff vs salvo` (`'diff'`): comparação de hunks e alterações entre o buffer em edição e o arquivo salvo em disco. Se o arquivo não possuir versão gravada (novo documento sem persistência), o submode Diff é omitido sem deixar slots vazios na interface.
2. **Diff real de sequência (LCS) sem algoritmo ingênuo:**
   - Em conformidade com o item 145 da especificação, é expressamente proibido o uso de algoritmos posicionais ingênuos que geram cascatas falsas. Utiliza-se a implementação determinística baseada em Longest Common Subsequence (`computeLineDiff`) de `src/services/historyDiff.ts`, com hunks de contexto e contadores precisos de adições e remoções.
3. **Controle de zoom seguro:**
   - Zoom tipográfico baseado em proporção relativa (`--preview-zoom`), impedindo deformações de layout externo ou quebra de geometria de viewport. Popover acessível com presets (80%, 90%, 100%, 110%, 125%, 150%), navegação por teclado e fechamento com Escape/click-outside.
4. **Maximização reversível:**
   - Alternância reversível entre tamanho dividido e tamanho total do preview com restauração exata da proporção e orientação anterior do split.

---

## 2. Componentes Criados

- `src/components/preview/PreviewSurface.tsx`: Container principal da superfície de preview.
- `src/components/preview/PreviewSubToolbar.tsx`: Toolbar contextual do preview com submodos, zoom e botão de maximização.
- `src/components/preview/PreviewDiffView.tsx`: Exibição visual de diff baseada em LCS.
- `src/components/preview/PreviewHtmlView.tsx`: Exibição segura de código HTML gerado.
- `src/styles/preview-surface.css`: Estilos e tokens específicos do preview.
- `tests/runtime/preview-surface.test.ts`: Suíte de testes automatizados Vitest.

---

## 3. Critérios de Aceitação e Verificação

1. **Toolbar de preview com submodos (Visualização, HTML, Diff) sem slots vazios:** testado com cardinalidade 2 e 3.
2. **Diff real entre buffer atual e conteúdo gravado em disco (sem algoritmo ingênuo):** testado com adições, deleções e preservações via LCS.
3. **Zoom de preview operando sem vazamento de dimensões no layout externo:** validado com variáveis CSS locais.
4. **Suíte de testes de preview passando:** 100% de aprovação.
