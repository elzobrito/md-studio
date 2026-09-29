# Relatório e ADR do Spike 053-C — Untitled Recovery Store

**Artefato:** `docs/spec/053-C-spike-untitled-recovery.md`  
**Data:** 2026-09-28  
**Autor:** Antigravity (runner ESAA `antigravity`, actor `agent-impl`)  
**Tarefa ESAA:** `MD-GUI-053-C` (referência normativa: 053-C)  
**Status:** **CONCLUÍDO (SPIKE PASS)**  

---

## 1. Contexto e Problema Normativo

No protótipo preliminar e em implementações simplificadas de editores, novos documentos abertos sem caminho em disco (`untitled`) frequentemente apresentavam anomalias estruturais:
1. **Caminhos Fictícios:** O protótipo gerava caminhos falsos no filesystem para documentos sem título (finding `FND-PROTO-044`);
2. **Poluição do Workspace:** Criação acidental de arquivos temporários ocultos ou arquivos lixo dentro da árvore visível do workspace do usuário;
3. **Perda de Rascunhos em Crashes:** Fechamento inesperado ou reinicialização do app sem salvar causava perda irreversível de anotações novas;
4. **Acoplamento Prematuro:** Suposição errônea de que recuperação de rascunhos exigiria a existência de um banco SQLite já ativo no produto.

O Spike **053-C** teve como objetivo desenhar, implementar e provar em testes um **`UntitledStore`** que reside no domínio privado da aplicação (app-private storage), sem criar arquivos no workspace, sem depender de SQLite e garantindo promoção limpa via Save As.

---

## 2. Decisões Arquiteturais Implementadas (ADR)

### 2.1. Identidade Estável e Títulos Sequenciais
- O documento untitled nasce com um identificador estável (`untitled-1`, `untitled-2`, ...) e título humano automático (`Sem título 1`, `Sem título 2`).
- Não possui `relativePath` ou `absolutePath` no filesystem. O `DocumentRuntime` sabe que ele é uma entidade em memória/rascunho privado.

### 2.2. Armazenamento Privado e Isolamento
- Os snapshots de recuperação são gravados com prefixo `mdstudio:untitled:recovery:<id>` e um índice em `mdstudio:untitled:index`.
- A interface `AppStorageAdapter` desacopla a implementação do runtime, permitindo o uso de `localStorage`, `IndexedDB` ou storage em memória.

### 2.3. Promoção via Save As e Limpeza Atômica
- Quando o usuário executa o salvamento formal (`Save As`), o `UntitledStore` executa o método `promoteToSaved(id, newPath)`.
- O documento é registrado no workspace como arquivo físico e seu snapshot privado é imediatamente excluído (`cleanup`), impedindo prompts fantasmas de restauração pós-save.

### 2.4. Tolerância a Falhas de Storage
- Se o navegador ou WebView acusar `QuotaExceededError`, a operação em memória do editor prossegue sem travar a UI, emitindo aviso em console de diagnóstico local.

---

## 3. Evidências dos Testes Automatizados

A suíte `tests/runtime/untitled-recovery-store.test.ts` obteve **100% de aprovação (6/6 testes)**:
1. **Criação com Identidades Estáveis:** Atribuição correta de IDs e títulos sequenciais;
2. **Atualização e Hashing:** Recálculo determinístico de `contentIdentity` e sincronismo de snapshot;
3. **Crash Recovery Real:** Simulação de encerramento e nova inicialização de store compartilhando o storage, com restauração íntegra de conteúdo e metadados;
4. **Promoção Save As:** Remoção limpa do rascunho privado ao promover para arquivo real;
5. **Retenção de Rascunhos:** Expiração de rascunhos anteriores a 90 dias (`purgeExpiredSnapshots()`), em estrita conformidade com a invariante `INV-DRAFT-RETENTION`;
6. **Tolerância a Falhas:** Comprovação de que falha de quota de escrita não interrompe nem corrompe o buffer em memória.

---

## 4. Conclusão e Diretrizes para o 053-F

O Spike 053-C foi concluído com sucesso e estabelece as fundações para que o `OpenDocumentsRuntime` (Task **053-F**) e a `DocumentBar` (Task **053-L**) possam gerenciar múltiplos documentos untitled e salvos com perfeita distinção e segurança de dados.
