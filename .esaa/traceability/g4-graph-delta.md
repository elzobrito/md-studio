# Relatório de Reconciliação e Delta de Rastreabilidade — Baseline G4 (G3 → G4)

**Artefato:** `.esaa/traceability/g4-graph-delta.md`  
**Data:** 2026-09-27  
**Autor:** Antigravity (runner ESAA `antigravity`, actor `agent-impl`)  
**Tarefa ESAA:** `MD-TRACE-V05-001`  

---

## 1. Sumário Executivo

Este documento consolida a reconciliação e atualização da baseline do Grafo de Rastreabilidade Semântica de Software (**TCG**) do **MD Studio** da baseline **G3** (`b13ad6b84c2f8eb6e8e16a75365b999142027e76`) para a baseline **G4**, cobrindo o escopo completo da onda **v0.5 — Interoperability, Diagrams & Publishing** (`MD-V05-042` a `MD-V05-052`) e a validação do binário local desktop (`MD-BUILD-LOCAL-010`).

A integridade histórica da evidência experimental foi preservada rigorosamente:
- A baseline **G3** foi arquivada explicitamente em `.esaa/traceability/snapshots/g3-b13ad6b.json` e `.esaa/traceability/snapshots/g3-validation.yaml`.
- Todos os arquivos de sidecars e análise de impacto da onda v0.5 (`.esaa/tasks/`, `.esaa/analysis/`) foram gerados e validados.
- A validação oficial via `tools/validate.py` atesta **status: pass, critical: 0**.

---

## 2. Baselines e Providência

| Dimensão | Baseline G3 (Pós-v0.4) | Baseline G4 (Reconciliada v0.5) |
|---|---|---|
| **Preservação de G3** | Snapshot ativo anterior | Snapshot arquivado em `snapshots/g3-b13ad6b.json` |
| **Total de Nós** | 774 | **777+** |
| **Validação** | `pass` (0 critical) | `pass` (0 critical) |
| **graph_json** | Recompilado via `build_graph.py` | Recompilado via `build_graph.py` |

---

## 3. Capabilities da Onda v0.5 Reconciliadas

A baseline G4 integra formalmente o escopo completo da onda v0.5:
1. `MD-V05-042`: Import Hub e contratos centrais de importação multimodal.
2. `MD-V05-043`: MarkItDown adapter para conversão offline de documentos.
3. `MD-V05-044`: Import Preview Modal com visualização split e relatórios de fidelidade.
4. `MD-V05-045`: Import Fidelity e classificação categórica de fidelidade.
5. `MD-V05-046`: Publishing Engine com suporte a múltiplos destinos e cancelamento.
6. `MD-V05-047`: HTML Autocontido com CSS editorial, KaTeX e diagramas SVG embutidos.
7. `MD-V05-048`: EPUB 3 Packaging com slots de Mermaid e assets locais confinados.
8. `MD-V05-049`: Editorial Fallback e tolerância a nós complexos sem perda de conteúdo.
9. `MD-V05-051`: Mermaid Explorer: catálogo de diagramas, ampliação e navegação contextual.
10. `MD-V05-052-SPIKE`: Spike técnico e ADR de Diagram Engines adicionais.
11. `MD-V05-052`: Diagram Engines: registry local extensível, adapters Graphviz/DOT e WaveDrom, e pipeline Unified de preview.
12. `MD-BUILD-LOCAL-010`: Compilação e validação do binário local desktop v0.5.

---

## 4. Verificação de Integridade

- `build_graph.py`: Grafo compilado em `.esaa/traceability/graph.json` com sucesso.
- `validate.py`: Status `pass`, 0 erros críticos.
- Testes automatizados: 100% de aprovação (Vitest e Cargo Test).
