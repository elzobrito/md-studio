#!/usr/bin/env python3
"""
markitdown_bridge.py - Bridge isolado para execução local do MarkItDown no MD Studio
Conforme especificações 042-import-hub.md e 043-markitdown-adapter.md

Regras:
- 100% offline, zero chamadas de rede, zero cloud
- Somente arquivos locais (convert_local)
- Plugins de terceiros desativados
- Sem OCR em nuvem, sem LLM, sem transcrição de áudio
"""

import sys
import json
import os
from pathlib import Path

# Formatos autorizados pela especificação 043
ALLOWED_EXTENSIONS = {
    "docx", "html", "htm", "epub", "pptx", "xls", "xlsx", "csv", "json", "xml", "pdf"
}

def check_capabilities():
    try:
        import markitdown
        version = getattr(markitdown, "__version__", "0.1.7")
        return {
            "ok": True,
            "available": True,
            "version": version,
            "formats": sorted(list(ALLOWED_EXTENSIONS)),
        }
    except ImportError as e:
        return {
            "ok": True,
            "available": False,
            "error": str(e),
            "formats": [],
        }

def convert_document(source_path, format_hint=None):
    if not source_path:
        return {"ok": False, "code": "source-not-found", "message": "Caminho do arquivo não fornecido"}

    p = Path(source_path)
    if not p.exists():
        return {"ok": False, "code": "source-not-found", "message": f"Arquivo não encontrado: {source_path}"}

    if not p.is_file():
        return {"ok": False, "code": "source-not-file", "message": f"Caminho não é um arquivo regular: {source_path}"}

    ext = (format_hint or p.suffix).lower().lstrip(".")
    if ext not in ALLOWED_EXTENSIONS:
        return {
            "ok": False,
            "code": "unsupported-format",
            "message": f"Formato '{ext}' não suportado pelo MarkItDown adapter",
        }

    try:
        from markitdown import MarkItDown
        # Instanciação sem plugins externos e sem cliente LLM
        md = MarkItDown()
        res = md.convert_local(str(p.resolve()))

        markdown = getattr(res, "text_content", None)
        if markdown is None:
            markdown = getattr(res, "markdown", "")

        title = getattr(res, "title", None)

        warnings = []
        if not markdown or not markdown.strip():
            warnings.append({
                "code": "EMPTY_OUTPUT",
                "message": "O documento convertido não produziu conteúdo de texto",
                "scope": "document",
            })

        return {
            "ok": True,
            "markdown": markdown,
            "title": title,
            "warnings": warnings,
            "format": ext,
        }
    except Exception as exc:
        return {
            "ok": False,
            "code": "conversion-failed",
            "message": f"Falha na conversão com MarkItDown: {str(exc)}",
        }

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--check":
        print(json.dumps(check_capabilities()))
        return

    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({"ok": False, "code": "empty-input", "message": "Entrada vazia fornecida via stdin"}))
            return
        data = json.loads(raw_input)
    except Exception as e:
        print(json.dumps({"ok": False, "code": "invalid-json", "message": f"JSON de entrada inválido: {str(e)}"}))
        return

    action = data.get("action", "convert")
    if action == "check":
        print(json.dumps(check_capabilities()))
    elif action == "convert":
        source_path = data.get("source_path")
        format_hint = data.get("format_hint")
        print(json.dumps(convert_document(source_path, format_hint)))
    else:
        print(json.dumps({"ok": False, "code": "unknown-action", "message": f"Ação desconhecida: {action}"}))

if __name__ == "__main__":
    main()
