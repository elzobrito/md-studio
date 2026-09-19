#!/usr/bin/env python3
"""Enriquece deterministicamente manifesto e draft sem alterar IDs/dependências."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / "roadmap" / "decomposition.plan.json"
MANIFEST = ROOT / ".roadmap" / "task-manifest.json"
DRAFT = ROOT / ".roadmap" / "roadmap.draft.json"

REQUIREMENTS = {
    "RF-01": "abrir arquivo ou pasta, receber drag-and-drop e apresentar uma árvore limitada ao workspace autorizado",
    "RF-02": "editar com salvamento explícito, detectar conflito externo e recuperar rascunho sem sobrescrita silenciosa",
    "RF-03": "processar CommonMark e GFM com front matter, notas, alertas e diretivas controladas",
    "RF-04": "renderizar blocos de código, matemática KaTeX e diagramas Mermaid com falha isolada",
    "RF-05": "resolver assets, links relativos, âncoras e navegação Markdown sem escapar da raiz autorizada",
    "RF-06": "oferecer busca, watcher, sumário, sessão, preferências e temas com operações canceláveis",
    "RF-07": "exportar HTML, imprimir/PDF e exportar diagramas sem divergência de segurança nem sobrescrita implícita",
    "RNF-SEC-01": "aplicar CSP, sanitização, protocolos permitidos, capabilities mínimas e fronteira canônica do filesystem",
    "RNF-DATA-01": "preservar integridade com escrita atômica, compare-and-swap, recuperação e falha sem arquivo parcial",
    "RNF-PERF-01": "manter UI responsiva com limites, cancelamento, debounce, backpressure e benchmarks reproduzíveis",
    "RNF-A11Y-01": "garantir teclado, foco, semântica, contraste, mensagens não dependentes de cor e movimento reduzido",
    "RNF-PORT-01": "priorizar Ubuntu/Linux sem acoplar contratos a separadores, shell ou URI exclusivos da plataforma",
}

IMPL_OUTPUTS = {
    "G01": ["PROJETO.md", "app/_indice-prd.md", "app/PRD-MD-STUDIO-CORE.md", "app/PRD-MD-STUDIO-EXTENSIONS.md", "app/PRD-MD-STUDIO-QUALITY.md"],
    "G02": ["docs/architecture/desktop-boundaries.md", "src/contracts/", "src-tauri/src/contracts/"],
    "G03": ["docs/security/threat-model.md", "docs/quality/non-functional-budgets.md", "docs/quality/accessibility-matrix.md"],
    "G04": ["package.json", "src/", "src-tauri/Cargo.toml", "src-tauri/src/lib.rs", "src-tauri/tauri.conf.json"],
    "G05": ["src/lib/ipc/", "src-tauri/src/commands/", "src-tauri/capabilities/"],
    "G06": ["src-tauri/src/workspace/", "src-tauri/tests/workspace_paths.rs"],
    "G07": ["src-tauri/src/persistence/", "src/lib/drafts/", "src-tauri/tests/atomic_save.rs"],
    "G08": ["src/components/FileExplorer.tsx", "src/services/assets.ts", "src-tauri/src/assets/"],
    "G09": ["src-tauri/src/search/", "src-tauri/src/watcher/", "src/services/workspaceEvents.ts"],
    "G10": ["src/markdown/processor.ts", "src/markdown/profile.ts", "tests/markdown/core/"],
    "G11": ["src/markdown/frontmatter.ts", "src/markdown/plugins/", "tests/markdown/extensions/"],
    "G12": ["src/markdown/sanitize.ts", "src/security/urlPolicy.ts", "tests/security/content/"],
    "G13": ["src/components/CodeBlock.tsx", "src/markdown/code.ts", "tests/markdown/code/"],
    "G14": ["src/components/MathBlock.tsx", "src/markdown/math.ts", "tests/markdown/math/"],
    "G15": ["src/components/MermaidBlock.tsx", "src/markdown/mermaid.ts", "src/services/diagramExport.ts", "tests/markdown/mermaid/"],
    "G16": ["src/components/MarkdownEditor.tsx", "src/state/documentState.ts", "src/services/save.ts"],
    "G17": ["src/components/MarkdownViewer.tsx", "src/components/DocumentOutline.tsx", "src/services/navigation.ts"],
    "G18": ["src/components/Settings.tsx", "src/state/session.ts", "src/styles/themes.css", "tests/accessibility/"],
    "G19": ["src/services/export.ts", "src/styles/print.css", "tests/export/"],
    "G20": ["src/lib/diagnostics/", "src-tauri/src/diagnostics/", "docs/operations/diagnostics.md"],
    "G21": ["tests/conformance/commonmark/", "tests/conformance/gfm/", "tests/conformance/renderers/"],
    "G22": ["tests/security/adversarial/", "tests/security/filesystem/", "tests/security/integrity/"],
    "G23": ["e2e/", ".github/workflows/ci.yml", "src-tauri/tauri.conf.json", "docs/release/"],
}

OUT_OF_SCOPE = (
    "WYSIWYG, colaboração, autenticação, backend remoto, sincronização em nuvem, "
    "plugins JavaScript, backlinks, grafo, Obsidian completo, Pandoc e BibTeX."
)


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def leaves(node: dict) -> list[dict]:
    children = node.get("children") or []
    if not children:
        return [node]
    result: list[dict] = []
    for child in children:
        result.extend(leaves(child))
    return result


def bullet(values: list[str]) -> str:
    return "\n".join(f"- {value}" for value in values)


def procedure(kind: str, group: str, output_files: list[str]) -> list[str]:
    if kind == "spec":
        return [
            "Ler PROJETO.md, os PRDs, a folha WBS e as saídas aceitas de todas as dependências antes de decidir o contrato.",
            "Documentar fluxos, interfaces, estados, invariantes, erros, limites, segurança, acessibilidade e cenários negativos aplicáveis.",
            "Eliminar decisões implícitas: qualquer lacuna que altere escopo, contrato público ou risco deve virar issue, não suposição.",
            "Produzir a especificação no caminho declarado e vinculá-la aos IDs de requisito desta tarefa.",
        ]
    if kind == "impl":
        return [
            "Confirmar que a tarefa SPEC precedente está done e usar sua saída como contrato imutável desta implementação.",
            "Implementar somente a responsabilidade desta folha nos caminhos declarados, preservando as fronteiras Tauri/Rust e React/TypeScript.",
            "Adicionar testes automatizados próximos ao componente e tratamento explícito para entradas inválidas, cancelamento e falhas previstas.",
            "Executar checks focados; se o contrato não puder ser cumprido sem ampliar escopo, interromper e registrar issue com evidência.",
        ]
    return [
        "Confirmar que a implementação precedente está em review e identificar exatamente o contrato e os arquivos alterados.",
        "Validar caminho feliz, bordas, entradas inválidas, falhas injetadas e regressões das dependências relevantes em ambiente limpo.",
        "Registrar comandos, versões, fixtures, resultados e evidências reproduzíveis no relatório QA declarado.",
        "Não corrigir silenciosamente a implementação e não autoaprovar: falha produz request_changes ou issue com reprodução objetiva.",
    ]


def description(task: dict, leaf: dict) -> str:
    kind = task["task_kind"]
    group = leaf["group"]
    targets = task.get("targets", [])
    outputs = task.get("outputs", {}).get("files", [])
    dependencies = task.get("depends_on", [])
    reqs = [f"{ref}: {REQUIREMENTS[ref]}." for ref in targets]
    risks = [f"Tratar explicitamente o risco `{risk}` definido pela WBS." for risk in leaf["risk_tags"]]
    acceptance = list(task.get("required_verification", []))
    dependency_text = dependencies or ["Nenhuma tarefa anterior; esta é uma entrada do roadmap."]
    kind_goal = {
        "spec": "estabelecer um contrato executável e sem decisões pendentes",
        "impl": "materializar o contrato aprovado em código, configuração, documentação e testes",
        "qa": "produzir uma validação independente, reproduzível e adversarial da entrega",
    }[kind]
    return (
        f"Objetivo\n{kind_goal.capitalize()} para a entrega WBS {leaf['code']} — {leaf['deliverable']}.\n\n"
        f"Contexto\nO MD Studio é um editor e visualizador Markdown desktop, local e Linux-first. "
        f"Esta tarefa pertence ao grupo {group}, usa o prefixo {leaf['prefix']} e deve permanecer limitada à responsabilidade da folha.\n\n"
        f"Escopo incluído\n{bullet(acceptance)}\n\n"
        f"Fora de escopo\n- {OUT_OF_SCOPE}\n- Capacidades pertencentes a outras folhas WBS ou mudanças em tarefas ESAA já done.\n\n"
        f"Requisitos de entrada\n{bullet(reqs)}\n\n"
        f"Dependências obrigatórias\n{bullet(dependency_text)}\n\n"
        f"Saídas obrigatórias\n{bullet(outputs)}\n\n"
        f"Restrições e riscos\n{bullet(risks)}\n- Não usar CDN, não expor segredos, não ampliar capabilities e não acessar paths fora da raiz autorizada.\n\n"
        f"Procedimento esperado\n{bullet(procedure(kind, group, outputs))}\n\n"
        f"Critérios de aceite e evidências\n{bullet(acceptance)}\n- Informar comandos executados, códigos de saída e arquivos de evidência. "
        f"Todos os checks devem passar; warning não justificado ou comportamento não determinístico impede conclusão.\n\n"
        f"Tratamento de falhas\nFalha real deve ser distinguida de cancelamento, pré-condição ausente e limitação ambiental. "
        f"Não contornar contrato, segurança ou integridade para obter teste verde; registrar issue reproduzível e falhar fechado."
    )


def main() -> None:
    plan = load(PLAN)
    manifest = load(MANIFEST)
    draft = load(DRAFT)
    by_code = {leaf["code"]: leaf for leaf in leaves(plan["wbs"])}
    manifest_by_id = {task["task_id"]: task for task in manifest["tasks"]}
    draft_by_id = {task["task_id"]: task for task in draft["tasks"]}
    if set(manifest_by_id) != set(draft_by_id):
        raise SystemExit("Manifesto e draft possuem conjuntos de IDs diferentes")

    for task_id, draft_task in draft_by_id.items():
        manifest_task = manifest_by_id[task_id]
        leaf = by_code[manifest_task["wbs_key"]]
        if draft_task["task_kind"] == "impl":
            files = IMPL_OUTPUTS[leaf["group"]]
            draft_task["outputs"] = {"files": files}
            manifest_task["outputs"] = {"files": files}
        full_description = description(draft_task, leaf)
        draft_task["description"] = full_description
        manifest_task["description"] = full_description

    required_sections = (
        "Objetivo", "Contexto", "Escopo incluído", "Fora de escopo",
        "Requisitos de entrada", "Dependências obrigatórias", "Saídas obrigatórias",
        "Restrições e riscos", "Procedimento esperado", "Critérios de aceite e evidências",
        "Tratamento de falhas",
    )
    for task in draft["tasks"]:
        if len(task["description"]) < 1200:
            raise SystemExit(f"Descrição curta: {task['task_id']}")
        for section in required_sections:
            if section not in task["description"]:
                raise SystemExit(f"Seção ausente em {task['task_id']}: {section}")

    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    DRAFT.write_text(json.dumps(draft, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "ok", "tasks": len(draft["tasks"]), "minimum_description_length": min(len(t["description"]) for t in draft["tasks"])}, ensure_ascii=False))


if __name__ == "__main__":
    main()
