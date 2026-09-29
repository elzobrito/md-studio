# Relatório e ADR do Spike 053-E — Workspace Filesystem Reconciliation

**Artefato:** `docs/spec/053-E-spike-fs-reconciliation.md`  
**Data:** 2026-09-28  
**Autor:** Antigravity (runner ESAA `antigravity`, actor `agent-impl`)  
**Tarefa ESAA:** `MD-GUI-053-E` (referência normativa: 053-E)  
**Status:** **CONCLUÍDO (SPIKE PASS)**  

---

## 1. Contexto e Problema Normativo

O MD Studio adota o princípio de que o **filesystem é a autoridade máxima e fonte da verdade** dos documentos Markdown. No entanto, em um ambiente desktop moderno (Linux/Windows/macOS), modificações podem ocorrer fora da aplicação:
1. **Renomeações Externas:** Um arquivo ou diretório inteiro pode ser renomeado via terminal ou gerenciador de arquivos do sistema operacional enquanto abas estão abertas no MD Studio;
2. **Deleções Externas:** Um documento aberto pode ser excluído no disco. Se o documento contiver alterações não salvas (`dirty`), suas edições **jamais podem ser descartadas silenciosamente**;
3. **Modificações Externas:** Edição por ferramentas externas simultâneas deve sinalizar conflito caso haja digitação local pendente;
4. **Tempestades de Eventos (Event Bursts):** Operações como `git checkout`, `git pull` ou `npm install` disparam centenas de eventos em milissegundos. Sem coalescência e debounce, o aplicativo travaria por reflows sucessivos.

O backend Rust já dispõe de um watcher robusto (`src-tauri/src/watcher/mod.rs` com `notify`, debounce de 300ms e supressão de eco `internal_saves`). O Spike **053-E** implementou e validou o **`WorkspaceFsReconciler`** no frontend para conectar esses eventos ao runtime multi-documento de forma estável.

---

## 2. Decisões Arquiteturais Implementadas (ADR)

### 2.1. Conexão ao Watcher Rust Existente
O `WorkspaceFsReconciler` consome o evento canônico `workspace://change` (`WatchEventDto`), garantindo reutilização integral da infraestrutura Rust com supressão de eco (`INV-WATCHER-ECHO-SUPPRESSION`).

### 2.2. Regra de Proteção de Conteúdo Dirty em Deleção
- Se um documento limpo (`clean`) for removido do disco, seu status transiciona para `missing`;
- Se o documento contiver alterações (`dirty`), o buffer em memória **permanece 100% preservado**, seu status torna-se `missing`, e o usuário pode salvar normalmente via Save As ou restaurar o arquivo em disco.

### 2.3. Propagação de Renomeação em Árvore de Diretórios
- Se um arquivo individual for renomeado (`renamed: from -> relativePath`), o caminho do documento aberto é atualizado de imediato;
- Se um diretório for renomeado (ex.: `docs/arch` para `architecture/specs`), todos os documentos abertos com aquele prefixo relativo (`docs/arch/overview.md`, `docs/arch/diagrams.md`) têm seus caminhos atualizados em cascata sem perder seleções ou estado.

### 2.4. Detecção de Conflitos Externos
- Se o arquivo for modificado externamente enquanto o documento está `clean`, o reconciliador aciona o recarregamento seguro (`reloadCleanDocument`);
- Se houver alterações locais (`dirty`), o documento transiciona para `status: "conflicted"` sem sobrescrever as edições do usuário.

### 2.5. Absorção de Rajadas (Burst Coalescing)
- Eventos recebidos em rápida sucessão são agrupados em um lote e processados de forma atômica, evitando repetições e travamento da thread principal de interface.

---

## 3. Evidências dos Testes Automatizados

A suíte `tests/runtime/workspace-fs-reconciler.test.ts` foi executada obtendo **100% de aprovação (10/10 testes)**:
1. **Normalização de Caminhos:** Tratamento consistente de barras de diretório Linux e Windows e remoção de prefixos `./`;
2. **Isolamento de Workspaces:** Rejeição de eventos originados de workspaces com identificador divergente;
3. **Renomeação de Arquivo:** Atualização precisa do `relativePath` da aba ativa;
4. **Renomeação de Pasta:** Atualização em cascata de múltiplos documentos abertos sob a mesma subpasta;
5. **Deleção com Dirty Protection:** Garantia de que documento modificado mantém suas edições sob evento `removed`;
6. **Deleção em Cascata:** Pasta pai removida sinaliza todos os filhos abertos como `missing`;
7. **Modificação e Conflito:** Documento limpo dispara reload; documento modificado transiciona para `conflicted`;
8. **Coalescência de Bursts:** Rajada de 20 eventos rápidos agrupada e processada em lote único de forma estável.

---

## 4. Conclusão dos Spikes Fundamentais (053-B, 053-C, 053-D, 053-E)

Com a aprovação do Spike 053-E, todos os 4 spikes normativos de fundação arquitetural da onda 053 estão integralmente concluídos:
- **053-B:** Identidade de conteúdo desacoplada de geração de operações e SaveQueue com late-write guard;
- **053-C:** Untitled Recovery Store no domínio privado sem SQLite e com promoção atômica via Save As;
- **053-D:** Seleção da estratégia `Single View + setState` para o CodeMirror 6 com máxima performance e fidelidade de undo/redo;
- **053-E:** Reconciliação estável do filesystem com proteção de dirty e propagação de renomeação.

O caminho está formalmente desimpedido para a implementação do **`DocumentRuntime` + `OpenDocumentsRuntime`** na Task **053-F**.
