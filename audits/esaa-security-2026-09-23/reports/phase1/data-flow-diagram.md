# SEC-002 — Fluxo de dados

```text
Markdown local (não confiável)
    │ read_document / watcher / índice
    ▼
Rust Tauri ──IPC──► WebView: CodeMirror, parser, preview, Mermaid
    ▲                                  │
    │ save_document + expected_hash    ├── sanitização → HTML exportado
    │ format_code (idioma + código)    └── impressão → PDF
    │                                  │
    └───────── filesystem local ◄─────┘

GitHub Actions + registros npm/crates.io → artefatos de build → binário distribuído
```

Fronteiras analisadas: arquivo Markdown → parser/DOM; WebView → IPC; IPC → filesystem; IPC → subprocessos; registries/CI → binário. O workspace de auditoria em `audits/esaa-security-2026-09-22` é saída da análise, não superfície do produto.
