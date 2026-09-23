# Documentação Técnica do MD Studio

**Versão Atual:** v0.2.1  
**Arquitetura:** Tauri 2 (Rust) + React 19 (TypeScript) + CodeMirror 6 + Unified AST  
**Classificação:** Desktop Local-First / 100% Offline / Linux-First & Windows

Bem-vindo ao **Portal Central da Documentação Técnica do MD Studio**. Este diretório consolida a arquitetura, os contratos de interface, as especificações normativas, o modelo de segurança e as instruções operacionais para engenheiros, mantenedores e auditores.

---

## 1. Visão Geral da Arquitetura do Sistema

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SHELL TAURI 2 (RUST)                            │
│  - Janela nativa GTK3 / WebKitGTK 4.1                                  │
│  - Barramento IPC assíncrono tipado (20 comandos + 2 canais de eventos)│
│  - Single Instance Lock e Diálogos nativos do sistema operacional      │
│  - Sandbox e Path Fencing rigoroso contra Path Traversal (../)        │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ IPC Assíncrono Tipado
┌──────────────────────────────────▼─────────────────────────────────────┐
│                    NÚCLEO RUST (md-studio-core)                        │
│  - Gravação Atômica (atomic_save com .tmp + fsync + renomeação atômica)│
│  - Auto-Save com debounce e supressão de eco no WatcherHub (SHA-256)   │
│  - Observador de disco com debounce estável via notify (inotify)       │
│  - Motor de Indexação e Resolução de Wiki Links e Backlinks sob demanda│
│  - Hub de Execução de Formatadores CLI Nativos (ruff, rustfmt, etc.)   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│                   FRONTEND REACT 19 + TYPESCRIPT                       │
│  ┌───────────────────────┐ ┌─────────────────────────────────────────┐ │
│  │   CodeMirror 6        │ │         Pipeline AST Unified             │ │
│  │  - Edição de fonte    │ │  - Remark (GFM, Frontmatter, Alerts)     │ │
│  │  - Cursor & linhas    │ │  - Rehype (rehype-sanitize Zero-XSS)     │ │
│  │  - Soft wrap / Zoom   │ │  - Shiki (TextMate dual-themes claros/esc)│
│  │  - Autocomplete [[    │ │  - KaTeX (Math inline $ e bloco $$)      │ │
│  │  - Slash Commands (/) │ │  - Mermaid.js interativo (Pan & Zoom)    │ │
│  └───────────────────────┘ └─────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                     Subsistemas de UX e UI                        │ │
│  │  - Quick Switcher (Ctrl+P)    - Go to Line (Ctrl+G)               │ │
│  │  - Breadcrumb e File Tree     - Painel Outgoing Links & Backlinks │ │
│  │  - Modos Split/Source/Preview - Painel de Configurações (Ctrl+,)  │ │
│  │  - Sincronização de Scroll    - Barra de Status e Métricas        │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Mapa de Navegação da Documentação

### 2.1. Contratos de Arquitetura, IPC e Rotas
* **[Mapa de Funcionalidades, Funções e Rotas](FUNCIONALIDADES_FUNCOES_E_ROTAS.md):** Catálogo formal de todos os 20 comandos IPC Tauri, 2 canais de eventos, plugins nativos, hooks do React e cadeias completas de execução (*Execution Call Chains*).
* **[Fronteiras e Zonas de Confiança](architecture/desktop-boundaries.md):** Modelo de confinamento e validação de segurança entre SO, Vault, Webview e Adaptadores.
* **[Contrato de Backlinks e Índice Reverso](architecture/backlinks-contract.md):** Especificação contratual da Onda 3 (resolução, tipos Rust/TS, navegação por linha base 1, exclusão de self-links e ausência de grafo na v1).
* **[Análise de Estado Atual e Fundações UX V2](ANALISE_ESTADO_ATUAL_V2.md):** Relatório de implementação da interface, layouts redimensionáveis e fluxos de escrita.

### 2.2. Requisitos de Produto (PRDs Canônicos)
* **[Visão de Alto Nível e Políticas da v1](../PROJETO.md):** Escopo delimitado, stack aprovada e governança via ESAA.
* **[PRD — Core (Autoria, Persistência e Workspace)](../app/PRD-MD-STUDIO-CORE.md):** Requisitos funcionais RF-01 a RF-06, persistência atômica, Auto-Save e ciclo de vida de rascunhos.
* **[PRD — Extensões (Markdown, Math, Mermaid e Shiki)](../app/PRD-MD-STUDIO-EXTENSIONS.md):** Pipeline de renderização, AST, realce TextMate e diagramas.
* **[PRD — Qualidade e Distribuição](../app/PRD-MD-STUDIO-QUALITY.md):** Metas não-funcionais, segurança, exportação e empacotamento.
* **[Índice de Rastreabilidade PRD](../app/_indice-prd.md):** Matriz de rastreabilidade de requisitos.

### 2.3. Segurança, Integridade e Auditoria Formal
* **[Modelo de Ameaças (Threat Model)](security/threat-model.md):** Mapeamento de ativos, mitigação contra Path Traversal, mitigação de XSS e políticas de rede.
* **[Relatório de Auditoria Formal ESAA-Security](../audits/esaa-security-2026-09-23/reports/final/security-audit-report.md):** Auditoria com 108 verificações de conformidade e score formal **71.44/100 (Bom)**.
* **[Acompanhamento de Avisos Residuais Rust](security/rust-advisory-residuals-2026-09-23.md):** Gestão formal de advisories transitivos de Tauri/GTK e cronograma de reavaliação.

### 2.4. Qualidade e Acessibilidade (NFRs)
* **[Matriz de Acessibilidade WCAG](quality/accessibility-matrix.md):** Navegação por teclado, anéis de foco, contraste e redução de movimento.
* **[Orçamentos de Desempenho (Non-Functional Budgets)](quality/non-functional-budgets.md):** Tempos máximos de renderização de preview (≤ 250ms para 250 KiB), cancelamento cooperativo de busca e inicialização a frio.

### 2.5. Operações, Empacotamento e Diagnósticos
* **[Guia de Empacotamento e Distribuição](release/PACKAGING.md):** Publicação oficial no Canonical Snap Store (`core24`), geração de pacotes Debian (`.deb`) e AppImage portáteis.
* **[Diagnósticos Operacionais e Troubleshooting](operations/diagnostics.md):** Tratamento de erros IPC, troubleshooting de tela em branco via `WEBKIT_DISABLE_DMABUF_RENDERER=1`, aumento de limites do `inotify` e concorrência.
* **[Toolchain de Compilação](operations/tauri-toolchain.md):** Requisitos de toolchain Rust 1.88+, Node 22+, pnpm 9+ e pacotes de desenvolvimento WebKitGTK.

### 2.6. Guias do Usuário Técnico e Autoria
* **[Guia Técnico de Autoria e Sintaxe](user-guide/MARKDOWN_GUIDE.md):** Manual completo de recursos de escrita: sintaxe GFM, expressões matemáticas KaTeX, diagramas interativos Mermaid, Wiki Links, Backlinks e integração com formatadores de código CLI nativos (`ruff`, `rustfmt`, `gofmt`, `clang-format`).

---

## 3. Diretrizes de Governança ESAA

Toda alteração de código, build de release, auditoria ou migração neste repositório é estritamente governada pelo protocolo **ESAA-Core**:
- Raiz do projeto: `--root /home/elzobrito/desenvolvimento/md-studio`
- Event store imutável e append-only: `.roadmap/activity.jsonl`
- Ciclo de vida obrigatório: `task create` -> `claim` -> execução -> `complete` -> `review approve` -> `verify`.
