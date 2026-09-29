#!/usr/bin/env python3
"""Delta anotado ISSUE-MD-SEC-GIT2-ADVISORY-001 sobre a baseline G3 (sem alterar source_commit).

Padrão de reconcile_g3.py, mas APPEND-ONLY e idempotente: acrescenta ao final de nodes.yaml,
edges.yaml e invariants.yaml os itens do delta (ver sec-git2-graph-delta.md), após checar
cada âncora/evidência contra `git show <SC>:<path>` (mesma regra do validate.py). Não
re-serializa os artefatos (sem churn) e aborta se o source_commit dos artefatos != SC.

Uso (raiz do repo): python3 .esaa/traceability/tools/apply_sec_git2_delta.py [--dry-run]
"""
import re, subprocess, sys
import yaml

SC = "2e5cce855888b404654002fef1d97ebc0db29cf7"   # baseline G3 — NÃO muda
D = ".esaa/traceability/"
TASK = "ISSUE-MD-SEC-GIT2-ADVISORY-001"
GIT_RS = "src-tauri/crates/md-studio-core/src/git.rs"
CORE_TOML = "src-tauri/crates/md-studio-core/Cargo.toml"

NODES = [
    {"id": "CFG-RS-DEP-GIT2", "type": "configuration",
     "name": "Dependência externa git2 (crate Rust) de md-studio-core",
     "module": "MOD-SECURITY-POLICY",
     "anchor": {"path": CORE_TOML, "symbol": "git2", "lines": [20, 20]},
     "alias": f"{CORE_TOML}#git2",
     "tags": ["external_dependency", "rust_crate", "security", "rustsec_advisory", "denied_by_cargo_audit"],
     "inclusion": ["invariant"],
     "notes": ("Modelada como configuration (schema.yaml não tem tipo de dependência externa; ver "
               "sec-git2-graph-delta.md). Declaração: git2 = { version = \"0.20\", default-features = false }. "
               "Resolvida para git2 0.20.4 em src-tauri/Cargo.lock:1415 e src-tauri/crates/md-studio-core/Cargo.lock:327 "
               "(libgit2-sys 0.18.8+1.9.7). Advisories (unsound, negados por --deny unsound): RUSTSEC-2026-0183 "
               "(Remote::list() com ponteiro nulo) e RUSTSEC-2026-0184 (Signature de BlameHunk via blame_buffer). "
               "patched >= 0.21.0 (git2 0.21.0 no crates.io desde 2026-05-18). Introduzida em b13ad6b (MD-V04-039)."),
     "trace_task": TASK},
    {"id": "CLS-GIT-PROVIDER", "type": "class",
     "name": "GitProvider (Git enxuto: status, diff gutter, histórico, arquivo em commit)",
     "module": "MOD-WORKSPACE-FS",
     "anchor": {"path": GIT_RS, "symbol": "GitProvider", "lines": [46, 287]},
     "alias": f"{GIT_RS}#GitProvider",
     "tags": ["security", "v0.4"],
     "inclusion": ["invariant"],
     "notes": ("Único consumidor de git2 no repo (git.rs:1). Usa Repository, Status/StatusOptions, DiffOptions, "
               "revwalk/Sort::TIME e Oid::from_str; NÃO usa Remote::list() nem Blame::blame_buffer. "
               "Módulo provisório MOD-WORKSPACE-FS (não há MOD-GIT); chamadores IPC git_* em "
               "src-tauri/src/commands/mod.rs:261-318 ainda não catalogados (lacuna G3)."),
     "trace_task": TASK},
]
EDGES = [
    {"id": "CLS-GIT-PROVIDER|depends_on|CFG-RS-DEP-GIT2", "from": "CLS-GIT-PROVIDER", "to": "CFG-RS-DEP-GIT2",
     "relation": "depends_on",
     "evidence": [f"{GIT_RS}:1", f"{GIT_RS}:13", f"{GIT_RS}:192", f"{GIT_RS}:272", f"{CORE_TOML}:20"],
     "method": "observed",
     "notes": "use git2::{...} + GitError::Git2(git2::Error) + git2::Sort::TIME + git2::Oid::from_str.",
     "trace_task": TASK},
]
INVARIANTS = [
    {"id": "INV-NO-DENIED-DEPENDENCY-ADVISORY",
     "name": "Nenhuma dependência com advisory negado pelo cargo audit entra na main",
     "statement": ("Nenhum crate resolvido em src-tauri/Cargo.lock ou src-tauri/crates/md-studio-core/Cargo.lock pode ter "
                   "advisory RustSec negado pela política do gate (cargo audit --deny unsound; vulnerabilidades sempre negadas). "
                   "Verificação = scripts/security-gates.sh (local antes de todo push e no CI via security-gates.yml). "
                   "Exceções só com análise de uso e prazo de revisão no documento de segurança; nunca rebaixar deny para warn."),
     "features": [],
     "nodes": ["CFG-RS-DEP-GIT2"],
     "enforced_by": ["scripts/security-gates.sh:9", "scripts/security-gates.sh:10",
                     ".github/workflows/security-gates.yml:29", ".github/workflows/ci.yml:7",
                     ".github/workflows/build-linux.yml:18", ".github/workflows/build-windows.yml:18"],
     "verified_by": [],
     "coverage": "none",
     "gap": True,
     "gaps": [
         {"description": ("VIOLADA no source_commit G3 (2e5cce8): git2 0.20.4 (RUSTSEC-2026-0183/0184, unsound) está nos dois "
                          "Cargo.lock; CI vermelho nos 3 workflows (runs 36335999915/36335999933/36335999969). Correção proposta: "
                          "subir git2 para >= 0.21.0 (tarefa separada, ver ISSUE-MD-SEC-GIT2-ADVISORY-001)."),
          "evidence": ["src-tauri/Cargo.lock:1415", "src-tauri/crates/md-studio-core/Cargo.lock:327", f"{CORE_TOML}:20"],
          "method": "observed"},
         {"description": ("Verificação é um script de CI (scripts/security-gates.sh), não um teste catalogado em tests.yaml; "
                          "por isso verified_by vazio e coverage none. O gate depende da advisory-db do momento da execução "
                          "(advisories novos quebram o gate sem commit)."),
          "evidence": ["scripts/security-gates.sh:9"], "method": "observed"},
     ],
     "trace_task": TASK},
]

def git_lines(p, _c={}):
    if p not in _c:
        r = subprocess.run(["git", "show", f"{SC}:{p}"], capture_output=True, text=True)
        _c[p] = r.stdout.split("\n") if r.returncode == 0 else None
    return _c[p]

def check_ev(ev, errs):
    p, l = ev.rsplit(":", 1); l = int(l.split("-")[0]); L = git_lines(p)
    if L is None or not (1 <= l <= len(L)) or not L[l - 1].strip():
        errs.append(f"evidência inválida em {SC[:7]}: {ev}")

def block(items):
    return yaml.safe_dump(items, allow_unicode=True, sort_keys=False, width=100)

def main():
    dry = "--dry-run" in sys.argv
    errs = []
    for f in ("nodes.yaml", "edges.yaml", "invariants.yaml"):
        sc = yaml.safe_load(open(D + f, encoding="utf-8")).get("source_commit")
        if sc != SC: errs.append(f"{f}: source_commit {sc} != {SC} (delta é só para a baseline G3)")
    for n in NODES:
        a = n["anchor"]; L = git_lines(a["path"])
        if L is None: errs.append(f"{n['id']}: path ausente"); continue
        s0, e0 = a["lines"]
        if not (1 <= s0 <= e0 <= len(L)) or a["symbol"] not in L[s0 - 1]:
            errs.append(f"{n['id']}: âncora não confere em {SC[:7]}")
    for e in EDGES:
        for ev in e["evidence"]: check_ev(ev, errs)
    for i in INVARIANTS:
        for ev in i["enforced_by"] + [x for g in i["gaps"] for x in g["evidence"]]: check_ev(ev, errs)
    if errs:
        print("\n".join(errs), file=sys.stderr); sys.exit(1)

    plan = []
    for f, key, items in (("nodes.yaml", "nodes", NODES), ("edges.yaml", "edges", EDGES), ("invariants.yaml", "invariants", INVARIANTS)):
        doc = yaml.safe_load(open(D + f, encoding="utf-8"))
        have = {x["id"] for x in doc[key]}
        new = [x for x in items if x["id"] not in have]
        plan.append((f, new))
    for f, new in plan:
        print(f"{f}: +{len(new)} {[x['id'] for x in new]}")
    if dry: return
    for f, new in plan:
        if not new: continue
        txt = open(D + f, encoding="utf-8").read()
        if not txt.endswith("\n"): txt += "\n"
        txt += block(new)
        if f == "invariants.yaml":
            head, sep, body = txt.partition("\ninvariants:\n")
            for inv in new:
                head = re.sub(r"(\n  total: )(\d+)", lambda m: m.group(1) + str(int(m.group(2)) + 1), head, count=1)
                head = re.sub(r"(\n    none: )(\d+)", lambda m: m.group(1) + str(int(m.group(2)) + 1), head, count=1)
                for lst in ("without_tests", "with_gap"):
                    head = re.sub(rf"(\n  {lst}:\n(?:  - .*\n)*(?:  - [^\n]*))", lambda m: m.group(1) + f"\n  - {inv['id']}", head, count=1)
            txt = head + sep + body
        open(D + f, "w", encoding="utf-8").write(txt)
    print("delta aplicado (source_commit inalterado:", SC[:12] + ")")

if __name__ == "__main__":
    main()
