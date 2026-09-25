# QA Report — Pipeline EPUB 3 & Publishing Integration

**Data:** 2026-09-24  
**Responsável:** agent-qa  
**Escopo:** Homologação completa do pipeline de exportação EPUB 3 (MD-EPUB-001 a MD-EPUB-007).  
**Status do Portão:** **APROVADO (Gate `epub_export_complete`)**

---

## 1. Sumário Executivo

O pipeline de exportação para **EPUB 3** foi concluído com sucesso, cobrindo o ciclo completo de ponta a ponta:
1. Processamento frontend de Markdown (KaTeX → MathML, Shiki inline styles, wiki-links em texto plano, alerts com prefixos textuais e extração de metadados de frontmatter).
2. Captura e sanitização de diagramas Mermaid renderizados no DOM (remoção de tags `<script>` e handlers `on*`, injeção de classes CSS em `<defs><style>` e normalização de viewBox responsivo).
3. Empacotamento de pacote EPUB 3 em Rust no `md-studio-core` via `epub-builder` (estrutura ZIP válida com mimetype uncompressed na primeira posição, `container.xml`, `content.opf`, `nav.xhtml`, `toc.ncx` e `styles/main.css`).
4. Proteção estrita de segurança e path fencing (rejeição de recursos fora do workspace e symlink escapes, proteção contra colisão de basenames de imagens).
5. Comando IPC Tauri `export_epub` e integração com o UI Shell via `ExportMenu` e `AppHeader`.

---

## 2. Inventário de Entregáveis e Validação

| ID | Título | Módulos Principais | Testes Dedicados | Status |
|---|---|---|---|---|
| **MD-EPUB-001** | Processador Frontend EPUB | `src/export/epubProcessor.ts`, `src/export/epubTypes.ts` | `tests/export/epubProcessor.test.ts` (9/9 pass) | **APROVADO** |
| **MD-EPUB-002** | Captura & Sanitização de SVG Mermaid | `src/export/mermaidCapture.ts` | `tests/export/mermaidCapture.test.ts` (7/7 pass) | **APROVADO** |
| **MD-EPUB-003** | Core EpubBuilder Rust | `src-tauri/crates/md-studio-core/src/export/` | `src-tauri/crates/md-studio-core/tests/epub_builder.rs` (7/7 pass) | **APROVADO** |
| **MD-EPUB-004** | Estrutura & Empacotamento ZIP | `md_studio_core::export::build_epub` | `tests/epub_builder.rs` (estrutura ZIP, mimetype, container, opf) | **APROVADO** |
| **MD-EPUB-005** | Comando IPC `export_epub` Tauri | `src-tauri/src/commands/mod.rs`, `src-tauri/src/lib.rs`, `src/lib/ipc/client.ts`, `src/services/exportEpub.ts` | `src-tauri/src/commands/mod.rs` (export_tests), `tests/export/exportEpubService.test.ts` (4/4 pass) | **APROVADO** |
| **MD-EPUB-006** | Integração UI & ExportMenu | `src/components/header/ExportMenu.tsx`, `src/components/header/AppHeader.tsx`, `src/App.tsx` | `tests/header/exportMenu.test.tsx` (8/8 pass) | **APROVADO** |
| **MD-EPUB-007** | QA & Portão Final | `docs/qa/epub-export.md` | Suítes completas Vitest (354/354), Cargo test (18/18 e 58/58 core), typecheck (0 erros) | **APROVADO** |

---

## 3. Evidência de Testes Automatizados

### 3.1. Vitest (Frontend TypeScript / React)
- **Comando:** `pnpm vitest run`
- **Arquivos testados:** 65/65 suites aprovadas
- **Testes executados:** 354 aprovados / 0 falhas (100% verde)
- **Tempo de execução:** ~22s

### 3.2. TypeScript Strict Check
- **Comando:** `pnpm typecheck` (`tsc -b --pretty false`)
- **Erros de tipo:** 0 erros

### 3.3. Cargo Test (Rust Tauri Application)
- **Comando:** `cargo test --manifest-path src-tauri/Cargo.toml`
- **Resultados:** 18 unit tests aprovados / 0 falhas em `md_studio_lib` (incluindo testes de exportação HTML e EPUB)
- **Status:** 100% verde

### 3.4. Cargo Test (Rust Core Engine)
- **Comando:** `cargo test --manifest-path src-tauri/crates/md-studio-core/Cargo.toml`
- **Resultados:** 58 testes aprovados (43 unitários, 7 epub_builder, 2 atomic_save, 1 export_atomic, 2 watcher_fence, 3 workspace_paths)
- **Status:** 100% verde

---

## 4. Auditoria de Segurança e Conformidade EPUB 3

- **Path Fencing:** Validação canônica estrita no Rust rejeita qualquer imagem ou anexo fora do workspace raiz e impede escapes de symlink.
- **Sanitização de SVG:** Tags `<script>` e manipuladores de eventos (`onclick`, `onload`, etc.) são ativamente despojados antes do empacotamento.
- **Conformidade EPUB 3:**
  - O arquivo `mimetype` é o primeiro item da archive sem compressão (`CompressionMethod::Stored`).
  - `META-INF/container.xml` mapeia corretamente `OEBPS/content.opf`.
  - Navegação dupla compatível: `OEBPS/nav.xhtml` (EPUB 3 nav) e `OEBPS/toc.ncx` (compatibilidade retroativa).
  - KaTeX emite MathML semanticamente puro sem depender de JavaScript em tempo de execução no leitor.
  - Estilos de realce Shiki aplicados inline para renderização consistente em e-readers sem suporte a CSS avançado.
