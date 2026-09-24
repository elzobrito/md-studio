# Análise de Estado Atual — MD Studio V2

**Data:** 19 de Setembro de 2026  
**Versão do Projeto:** 2.0 (UX & GUI Foundation + Core Engine)  
**Repositório Remoto:** [github.com/elzobrito/md-studio](https://github.com/elzobrito/md-studio)  
**Ambiente de Execução:** Ubuntu Linux (Desktop Local-First)

---

> **Atualização 2026-09-24:** este documento é uma análise histórica da Onda 0 / fundação UX (set/2026). O realce de código em produção passou a **Shiki** (TextMate dual-themes) a partir da v0.2.0; `highlight.js` abaixo descreve o estado à época da análise. Versão liberada atual: **v0.2.2**. Plataformas: Linux (Snap / `.deb` / AppImage / `.rpm`) e Windows (NSIS / MSI).

## 1. Sumário Executivo

O **MD Studio V2** atingiu com sucesso o encerramento da **Onda 0 (UX & GUI Foundation)** e da integração profunda com o motor de persistência seguro em Rust (**md-studio-core**). O aplicativo foi transformado de uma interface prototípica elementar em um **editor desktop moderno, de alta fidelidade visual, com suporte a escrita imediata de Markdown, gerenciamento de workspaces locais e conformidade técnica rigorosa**.

Todos os requisitos estabelecidos no documento de wireframes ASCII e na especificação de UX foram implementados, validados por testes automatizados (14 suites / 40 testes unitários e de integração), compilados em binário de produção e instalados no ambiente do usuário com integração total ao sistema operacional (Show Apps, ícones FreeDesktop e atalhos globais).

---

## 2. Visão Geral da Arquitetura Entregue

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SHELL TAURI 2 (RUST)                            │
│  - Janela nativa com IPC seguro                                        │
│  - Diálogos nativos (@tauri-apps/plugin-dialog)                        │
│  - Permissões estritas em capabilities/default.json                    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ IPC Assíncrono Tipado
┌──────────────────────────────────▼─────────────────────────────────────┐
│                    NÚCLEO RUST (md-studio-core)                        │
│  - Gravação Atômica (atomic_save com arquivo temporário + fsync + ren) │
│  - Checagem Concorrente por Hash de Conteúdo (evita sobreposição)      │
│  - Barreira de Segurança de Workspace (prevenção contra path-traversal)│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│                   FRONTEND REACT 19 + TYPESCRIPT                       │
│  ┌───────────────────────┐ ┌─────────────────────────────────────────┐ │
│  │   CodeMirror 6        │ │         Pipeline AST Unified             │ │
│  │  - Edição de fonte    │ │  - Remark (GFM, Frontmatter, Alerts)     │ │
│  │  - Cursor & linhas    │ │  - Rehype (Sanitize, KaTeX, Mermaid)     │ │
│  │  - Soft wrap / Zoom   │ │  - Highlight.js (Code blocks estilizados)│ │
│  └───────────────────────┘ └─────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                     Subsistemas de UX V2                          │ │
│  │  - Quick Switcher (Ctrl+P)    - Go to Line (Ctrl+G)               │ │
│  │  - Breadcrumb interativo      - Árvore e Histórico de Arquivos    │ │
│  │  - Modos Split/Source/Preview - Painel de Configurações (Ctrl+,)  │ │
│  │  - Sincronização de Scroll    - Barra de Status com métricas      │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Módulos Implementados e Prontos

### 3.1. Experiência de Escrita e Autoria (Authoring Flow)
- **Escrita Imediata ao Iniciar:** O aplicativo abre com o editor pronto para receber texto. O usuário não é obrigado a selecionar pastas ou abrir arquivos antes de começar a escrever.
- **Novo Documento (`Ctrl+N` / Botão `➕`):** Cria um novo canvas limpo instantaneamente em qualquer tela (inclusive a partir de `WelcomeScreen` e `EmptyState`).
- **Salvar / Salvar Como (`Ctrl+S` / `Ctrl+Shift+S` / Botão `[● Salvar]`):**
  - Se o arquivo for novo (sem caminho em disco), o botão de salvar ou o atalho aciona o diálogo nativo do sistema operacional (`pickSaveMarkdownFile`) para escolher local e nome (`.md`).
  - O salvamento estabelece o workspace, aciona a gravação atômica em Rust, zera o status de modificado e passa a gerenciar o ciclo do arquivo.
- **Status do Salvamento em Tempo Real:** Indicador com 4 estados reativos:
  - `● Salvo` (cinza neutro)
  - `● Modificado` (âmbar de atenção)
  - `◌ Salvando...` (animação ativa)
  - `✖ Erro` (vermelho com tooltip de diagnóstico)

### 3.2. Layout Geral e Painéis Redimensionáveis
- **Barra Superior (AppHeader):**
  - Alternador da barra lateral esquerda (`Ctrl+\` ou `Ctrl+B`).
  - Logo e marcação de versão.
  - Seletor de modo de visualização com 3 estados: `[Markdown] [Formatado] [Dividida]`.
  - Botão de novo documento (`➕`), busca rápida (`🔍`), configurações (`⚙`), atalhos (`≡`) e botão dinâmico de salvamento (`SaveButton`).
- **Navegação em Breadcrumb:**
  - Exibe a hierarquia do arquivo atual: `workspace / subpasta / arquivo.md`.
  - Permite copiar o caminho absoluto para o clipboard e alternar entre arquivos da mesma pasta com um clique.
- **Painel Lateral Esquerdo (Workspace & Arquivos):**
  - Exibição da pasta raiz aberta com botão de troca de pasta.
  - Filtro em tempo real da árvore de arquivos (`Ctrl+Shift+E`).
  - Navegação hierárquica por pastas e arquivos `.md`.
  - Seção de **Arquivos Recentes** persistida no localStorage com data/hora e acesso instantâneo.
- **Painel Central (Editor & Preview):**
  - Suporte a proporção dividida (Split) ajustável via splitter interativo (`ResizablePanel`).
  - Sincronização proporcional de scroll entre o editor CodeMirror e o visualizador Markdown (com chaveamento via `Alt+S`).
- **Painel Lateral Direito (Sumário / Outline):**
  - Extração automática de cabeçalhos (`H1` a `H6`).
  - Destaque visual por indentação proporcional.
  - Clique navega o cursor do editor diretamente para a linha do cabeçalho.
- **Barra de Status (StatusBar):**
  - Exibe linha e coluna atuais do cursor (`Ln X, Col Y`).
  - Contagem contínua de palavras e caracteres.
  - Modo de visualização ativo.
  - Status do documento e encoding (`UTF-8`).
  - Botão de atalhos rápidos (`⌨`).

### 3.3. Modais e Ferramentas Interativas
- **Quick Switcher / Busca Rápida (`Ctrl+P`):**
  - Caixa de busca com correspondência fuzzy rápida.
  - Busca unificada entre arquivos do workspace e cabeçalhos do documento atual.
  - Navegação por setas (`↑` / `↓`), confirmação (`Enter`) e cancelamento (`Esc`).
- **Ir para a Linha (`Ctrl+G`):**
  - Modal leve para navegação direta por número de linha no CodeMirror.
- **Painel de Configurações (`Ctrl+,`):**
  - Abas: Aparência, Editor, Visualização, Atalhos e Sobre.
  - Controle de Zoom com presets prontos: `75%`, `90%`, `100%`, `110%`, `125%`.
  - Configuração de fontes: Família tipográfica e tamanho da fonte do preview.
  - Configuração do editor: Quebra automática de linha (*soft wrap*) e exibição de números de linha.
  - Alternância de temas claro/escuro.
- **Ajuda e Tabela de Atalhos (`F1` / `Ctrl+/`):**
  - Modal categorizado contendo todos os 20+ atalhos de teclado do aplicativo.

### 3.4. Pipeline de Processamento Markdown
- **CommonMark & GFM:** Tabelas alinhadas, listas de tarefas com checkboxes interativos, autolinks, texto riscado.
- **Alertas Estilo GitHub:** Renderização estilizada de blocos `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]` com ícones e bordas coloridas correspondentes.
- **Frontmatter YAML:** Extração de metadados no topo do arquivo sem quebrar a visualização.
- **Matemática (KaTeX):** Expressões inline `$x^2$` e blocos `$$...$$` renderizados com tipografia matemática de alta precisão.
- **Diagramas (Mermaid):** Gráficos de fluxo, sequência, classe, etc., com tratamento de erro sem congelamento da interface.
- **Blocos de Código (highlight.js):** Syntax highlighting para dezenas de linguagens com badge da linguagem e botão "Copiar código".

### 3.5. Segurança e Garantias Locais
- **Princípio Local-First:** Os dados permanecem exclusivamente no disco do usuário; não há telemetria nem conexões remotas não autorizadas.
- **Gravação Atômica:** Arquivos temporários são escritos e sincronizados antes de substituir o arquivo original, prevenindo corrupção por travamentos ou falta de energia.
- **Prevenção de Sobrescrita Acidental:** O hash SHA-256 do arquivo em disco é conferido antes de persistir alterações.
- **Prevenção de Destruição:** O aplicativo não executa deleções nem movimentações de diretórios.

### 3.6. Identidade Visual e Integração com o Sistema Operacional
- **Novo Ícone Oficial:** Ícone moderno no padrão *squircle* com gradiente índigo/ciano e monograma estilizado de Markdown + ponta de caneta tinteiro.
- **Resoluções Nativas FreeDesktop:** Ícones gerados em `16x16`, `32x32`, `48x48`, `64x64`, `128x128`, `256x256` e `512x512` em `~/.local/share/icons/hicolor/` e `pixmaps`.
- **Lançador do Ubuntu:** Arquivo desktop configurado em `~/.local/share/applications/md-studio.desktop` com comando associado a `/home/elzobrito/.local/bin/md-studio %F`.
- **Caches Atualizados:** Executados `gtk-update-icon-cache` e `update-desktop-database` com sucesso.

---

## 4. Matriz de Cobertura de Testes Automatizados

O projeto conta com uma suíte de testes unitários e de integração baseada em Vitest, com **100% de aprovação**:

| Arquivo de Teste | Área Coberta | Status |
| :--- | :--- | :---: |
| `tests/ux/wireframeFidelity.test.ts` | Estados de salvamento, controles de zoom, presets, wrap de linha, recentes e GoToLine | **Passou** |
| `tests/ux/settingsStore.test.ts` | Persistência de configurações, reset aos padrões e limites | **Passou** |
| `tests/ux/recentFiles.test.ts` | LIFO de arquivos recentes, deduplicação e limite de histórico | **Passou** |
| `tests/ux/fuzzySearch.test.ts` | Algoritmo de correspondência fuzzy do Quick Switcher | **Passou** |
| `tests/ux/editorStore.test.ts` | Ciclo de vida do editor, coordenadas do cursor e status | **Passou** |
| `tests/ux/breadcrumb.test.ts` | Decomposição de caminhos de arquivos e nomes de workspace | **Passou** |
| `tests/markdown/core/processor.test.ts` | Pipeline Unified AST, parsing CommonMark e GFM | **Passou** |
| `tests/markdown/core/navigation.test.ts` | Resolução de âncoras e navegação interna | **Passou** |
| `tests/markdown/code/code.test.ts` | Highlight.js e sanitização de blocos de código | **Passou** |
| `tests/markdown/math/math.test.ts` | Renderização do motor KaTeX | **Passou** |
| `tests/markdown/mermaid/mermaid.test.ts` | Renderizador Mermaid e isolamento de falhas | **Passou** |
| `tests/markdown/extensions/frontmatter.test.ts` | Extração de frontmatter YAML | **Passou** |
| `tests/security/content/urlPolicy.test.ts` | Política de segurança de URLs e contenção de links | **Passou** |
| `tests/export/export.test.ts` | Sanitização e exportação de HTML | **Passou** |
| **Total** | **14 arquivos de teste / 40 casos de teste** | **100% OK** |

---

## 5. Próximos Passos Sugeridos (Backlog Futuro)

1. **Busca Global em Workspace (Ripgrep Engine):**
   - Implementar busca textual por regex ou termos em todos os arquivos `.md` do workspace via comando assíncrono em Rust.
2. **File Watcher Ativo (`notify` em Rust):**
   - Atualizar a árvore de arquivos e recarregar documentos caso ocorram alterações externas no sistema de arquivos.
3. **Exportação Avançada para PDF:**
   - Integração com utilitário local ou motor headless para geração direta de PDF com estilos de impressão refinados.
4. **Modo Zen Refinado com Animações:**
   - Transições CSS suaves ao alternar o modo Zen (`F11`).

---

## 6. Conclusão

O MD Studio V2 encontra-se em estado **estável, robusto e totalmente operacional**. A interface atende a todos os requisitos ergonômicos da especificação de wireframes, a compilação do executável release está atualizada e instalada localmente no Ubuntu, e o código-fonte está versionado e sincronizado com o GitHub público em [elzobrito/md-studio](https://github.com/elzobrito/md-studio).
