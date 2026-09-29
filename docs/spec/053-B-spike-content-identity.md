# Relatório e ADR do Spike 053-B — Content Identity, Dirty State & Save Queue

**Artefato:** `docs/spec/053-B-spike-content-identity.md`  
**Data:** 2026-09-28  
**Autor:** Antigravity (runner ESAA `antigravity`, actor `agent-impl`)  
**Tarefa ESAA:** `MD-GUI-053-B` (referência normativa: 053-B)  
**Status:** **CONCLUÍDO (SPIKE PASS)**  

---

## 1. Contexto e Motivação

Na arquitetura clássica e no protótipo preliminar, o estado `dirty` (modificado) era frequentemente derivado de contadores de revisão monotônicos (`workingRevision !== persistedRevision`). Conforme identificado na revisão normativa R3 da especificação 053 (`053-nova-gui-R3.md`), este modelo é falho em dois pontos críticos:
1. **Falso Dirty após Undo:** Se um usuário digita um caractere e em seguida pressiona `Undo` (Ctrl+Z), o contador de revisão avança, mas o conteúdo do documento volta a ser 100% idêntico ao gravado em disco. No modelo ingênuo de contadores, o documento permanece marcado como `dirty`, disparando prompts indesejados ao fechar a aba.
2. **Corrida de Late Write Acknowledgment:** Se o usuário salva um documento e, durante a gravação assíncrona, digita novos caracteres, a confirmação tardia do save anterior não pode sobrescrever ou limpar o dirty do novo texto.

O Spike **053-B** teve como missão implementar e comprovar em código e testes automatizados o desacoplamento formal entre:
- **`operationGeneration`**: contador monotônico utilizado estritamente para ordenar e cancelar operações assíncronas;
- **`contentIdentity`**: hash determinístico (SHA-256) do buffer textual;
- **`dirty`**: predicado booleano derivado exclusivamente de `currentContentIdentity !== persistedContentIdentity`.

---

## 2. Decisões Arquiteturais Implementadas (ADR)

### 2.1. Desacoplamento entre Identidade e Geração
O módulo `src/services/runtime/contentIdentity.ts` implementa:
- `computeContentIdentitySync(content)` e `computeContentIdentity(content)` gerando o hash SHA-256 do texto em UTF-8;
- `isContentDirty(current, persisted)` comparando diretamente os hashes;
- `OperationGenerationManager` gerenciando o avanço monotônico de gerações.

### 2.2. Fila de Gravação Assíncrona (SaveQueue & SaveTicket)
O módulo `src/services/runtime/saveQueue.ts` implementa a máquina de estados documental:
- **`SaveTicket`**: encapsula `documentId`, `targetPath`, `generation`, `contentIdentity`, `expectedDiskHash` e `content`;
- **One-Write-In-Flight**: se já houver gravação em voo (`activeTicket`), nenhuma nova gravação paralela é disparada para o mesmo documento;
- **Coalescência de Auto-save**: requisições subsequentes durante um write acumulam-se em um único `pendingTicket` com o estado mais recente. Ao término da gravação ativa, o `pendingTicket` é automaticamente despachado com o `expectedDiskHash` atualizado;
- **Late Write Guard**: quando o ACK do write ativo retorna, o `persistedContentIdentity` é atualizado para o hash do ticket gravado. Se o buffer atual (`currentContentIdentity`) já divergiu (usuário digitou durante o salvamento), o estado permanece **`modified` (dirty = true)**.

---

## 3. Evidências Experimentais e Resultados dos Testes

A suíte `tests/runtime/content-identity-save-queue.test.ts` foi executada e obteve **100% de aprovação (7/7 testes)**:

1. **Cálculo de Hash SHA-256:** Conformidade determinística de 64 caracteres hexadecimais em ambientes síncronos e assíncronos.
2. **Invariante Undo-to-Clean:**
   - Documento inicial em `gen=1`, `clean`.
   - Edição para texto B (`gen=2`, `modified`).
   - Edição para texto C (`gen=3`, `modified`).
   - Undo para texto B (`gen=4`, `modified`).
   - Undo para texto inicial (`gen=5`): **o documento retorna imediatamente ao estado `clean` (`isDirty = false`)**, provando que dirty independe do contador monotônico de geração.
3. **Invariante Redo-to-Dirty:**
   - Redo subsequente avança para `gen=6` e reativa `dirty = true`.
4. **One-Write-In-Flight & Coalescing:**
   - Comprova que 3 requisições consecutivas de salvamento geram exatamente duas chamadas de escrita no backend: a primeira imediata e a segunda coalescendo as alterações posteriores.
5. **Late Write Acknowledgment Guard:**
   - Comprova que digitação durante a janela de resposta assíncrona do backend não tem suas modificações limpas.
6. **Detecção de Conflitos Externos:**
   - Falha de `expectedDiskHash` no backend transiciona o documento para `status: "conflicted"`.

---

## 4. Conclusão e Diretrizes para o 053-F

O Spike 053-B foi concluído com sucesso e atesta que o modelo arquitetural proposto pela R3 é robusto, seguro contra condições de corrida e pronto para ser integrado no `DocumentRuntime` e `OpenDocumentsRuntime` da Task **053-F**.
