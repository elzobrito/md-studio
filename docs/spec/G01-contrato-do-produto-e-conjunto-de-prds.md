# G01 — Contrato do produto e conjunto de PRDs

## Objetivo
Congelar o contrato executável da v1 do MD Studio sem decisões pendentes de produto.

## Escopo v1
- Editor Markdown em código-fonte (CodeMirror 6), sem WYSIWYG.
- Preview seguro CommonMark/GFM + extensões documentadas (alertas, diretivas, Mermaid, KaTeX).
- Workspace local: árvore, busca, watcher, sessão recente.
- Persistência explícita (Ctrl+S) e Auto-Save silencioso com debounce configurável e supressão interna via WatcherHub, hash de versão, controle de conflitos e rascunhos de recuperação locais (90 dias).
- Export HTML autossuficiente + impressão/PDF via sistema.
- Linux-first, offline, single-user, sem telemetria.
- Wiki Links internos (Onda 2) e Backlinks internos sob demanda (Onda 3).

## Fora de escopo v1
WYSIWYG, colaboração, cloud sync, plugins JS, Obsidian completo, Pandoc, BibTeX, grafo de conhecimento / Knowledge Graph (Onda 4), abas multi-documento.

## PRDs canônicos
| PRD | Responsabilidade |
|-----|------------------|
| `app/PRD-MD-STUDIO-CORE.md` | Workspace, persistência, autoria |
| `app/PRD-MD-STUDIO-EXTENSIONS.md` | Markdown, código, math, diagramas |
| `app/PRD-MD-STUDIO-QUALITY.md` | Segurança, qualidade, export, distribuição |
| `app/_indice-prd.md` | Índice e rastreio |

## Critérios de aceite G01
1. PRDs e PROJETO.md cobrem fluxos principais e exclusões.
2. Stack aprovada: Tauri 2, Rust, React, TS, CodeMirror 6, Unified.
3. Nenhuma ambiguidade sobre persistência atômica, salvamento automático com debounce/supressão de eco no WatcherHub e rascunhos de recuperação.
4. Extensões não-GFM rotuladas como próprias do produto.
5. Documento de spec (este arquivo) é a referência de SPEC para o grupo.

## Decisões fechadas
- Um documento ativo por vez na v1.
- Recursos remotos bloqueados por padrão.
- Backend Rust é a única porta do filesystem.
- PDF tipográfico determinístico não é compromisso da v1.
