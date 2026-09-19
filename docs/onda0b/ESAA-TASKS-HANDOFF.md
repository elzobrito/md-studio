# Onda 0B — Guided Markdown — Handoff ESAA

**Repo:** https://github.com/elzobrito/md-studio
**Workspace:** `/home/elzobrito/desenvolvimento/md-studio`
**WBS:** WBS-ONDA-0B-GUIDED-MARKDOWN v2.0 (45 subtarefas agregadas em 8 tasks ESAA)

## Tasks (todo)

| ID | Sprint | Depende | Verify |
|----|--------|---------|--------|
| MD-GM-001 Formatting Toolbar | GM-A | — | formatting_toolbar_pass |
| MD-GM-002 Slash Commands | GM-B | — | slash_commands_pass |
| MD-GM-003 Smart Paste | GM-B | — | smart_paste_pass |
| MD-GM-004 Document Templates | GM-C | 001 | document_templates_pass |
| MD-GM-005 Cheatsheet | GM-A | — | markdown_cheatsheet_pass |
| MD-GM-006 Hints | GM-A | — | markdown_hints_pass |
| MD-GM-007 Table Editor | GM-C | 001,002 | table_editor_pass |
| MD-GM-008 QA | GM-D | 001–007 | qa_guided_markdown_pass |

Descrições: `docs/onda0b/MD-GM-00N-FULL.md` + campo description no ESAA.

```bash
python3 -m esaa --root /home/elzobrito/desenvolvimento/md-studio state MD-GM-001
```

Paralelo OK com MD-FOUNDATION-* (Onda 1). Não reabrir MDS-PROD-OPEN-FILE-001.
