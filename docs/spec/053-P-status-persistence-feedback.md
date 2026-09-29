# 053-P — Status & Persistence Feedback

**Task ID ESAA:** `MD-GUI-053-P`  
**Referência Normativa:** `053-nova-gui-R3.md` (Task 053-P, Seção 344, PARTE XVI, PARTE XVII, PARTE LI)  
**Status:** Implementado  

---

## 1. Contexto e Motivação

A especificação `053-nova-gui-R3.md` exige que o estado de persistência do documento e os contadores editoriais sejam comunicados com precisão, acessibilidade e clareza:
1. **Exposição dos estados normativos de persistência:**
   - `saved`: documento gravado e idêntico ao disco.
   - `modified`: alterações pendentes em relação ao disco (`dirty`).
   - `saving`: operação assíncrona de gravação em andamento.
   - `unsaved`: documento novo (`untitled`) ainda não vinculado a path no filesystem.
   - `conflicted`: concorrência ou conflito de hash detectado em disco.
   - `missing`: arquivo não encontrado no sistema de arquivos.
   - `error`: falha reportada durante persistência atômica.
2. **Acessibilidade estrita:**
   - Em conformidade com o item 168 da especificação, é proibido usar apenas uma bolinha colorida sem texto acessível. Os badges possuem ícone/dot e texto descritivo claro, com atributos `role="status"`, `aria-live="polite"` e tooltip explicativo quando há mensagem de erro.
3. **Contadores editoriais na StatusBar:**
   - Exibição de: modo de visualização atual (`Markdown`, `Formatado`, `Dividida`), posição do cursor (`Ln X, Col Y`), total de linhas (`X linhas`), contagem de palavras, codificação (`UTF-8`), terminador de linha (`LF`) e indicador de sincronização de rolagem (`⇄ Sync ON/OFF`, exibido exclusivamente em modo `split`).

---

## 2. Componentes Atualizados

- `src/state/editor.ts`: Expansão do tipo `SaveStatus` com todos os 7 estados normativos.
- `src/components/statusbar/SaveStatus.tsx`: Renderização acessível dos badges de persistência.
- `src/components/statusbar/StatusBar.tsx`: Exibição de contadores editoriais, encoding, line ending e indicador de sync.
- `src/styles/statusbar.css`: Estilização dos novos badges de status.
- `src/App.tsx`: Mapeamento automático dos estados de persistência do documento para a StatusBar.
- `tests/runtime/status-persistence-feedback.test.ts`: Suíte de testes automatizados com Vitest.

---

## 3. Critérios de Aceitação e Verificação

1. **Estados de sincronização exibidos com precisão na StatusBar e DocumentBar:** testados todos os 7 estados.
2. **Feedback visual não intrusivo para operações de save assíncrono:** indicadores de texto e ícones sem bloqueio modal desnecessário.
3. **Testes de renderização de status passando 100%:** 100% de sucesso na suíte Vitest.
