#!/usr/bin/env python3
"""TRACE-013 — Valida os artefatos de .esaa/traceability/ contra o repositório e grava validation.yaml.

Uso (na raiz do repositório git):
    python .esaa/traceability/tools/validate.py [--dir .esaa/traceability]

Dependências: Python 3 stdlib + PyYAML + git no PATH. Âncoras e evidências são checadas no
source_commit via `git show <source_commit>:<path>` (independe do working tree); o drift do
working tree/HEAD é reportado à parte. Exit code 1 se houver problema crítico.
"""
import argparse, collections, glob, hashlib, json, os, re, subprocess, sys
from datetime import datetime, timezone, timedelta
import yaml

EV_RE = re.compile(r"^[\w./-]+\.[\w]+:\d+(-\d+)?$")
ID_RE = re.compile(r"^[A-Z]+-[A-Z0-9]+(-[A-Z0-9]+)*$")
UNSTABLE_RE = re.compile(r"(-L\d+(-|$))|([0-9A-F]{10,})")

def git(*args):
    r = subprocess.run(["git", *args], capture_output=True, text=True)
    return r.returncode, r.stdout

def load(p):
    with open(p, encoding="utf-8") as f:
        return yaml.safe_load(f)

def walk_ev(o):
    if isinstance(o, dict):
        for v in o.values(): yield from walk_ev(v)
    elif isinstance(o, list):
        for v in o: yield from walk_ev(v)
    elif isinstance(o, str) and EV_RE.match(o):
        yield o

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--dir", default=".esaa/traceability")
    a = ap.parse_args(); D = a.dir.rstrip("/") + "/"
    checks = {}
    def chk(cid, severity, description, items):
        checks[cid] = {"severity": severity, "description": description, "count": len(items), "items": items}

    names = ["repository.yaml", "schema.yaml", "modules.yaml", "entrypoints.yaml", "nodes.yaml", "edges.yaml",
             "contracts.yaml", "features.yaml", "tests.yaml", "invariants.yaml"]
    docs = {n: load(D + n) for n in names if os.path.exists(D + n)}
    missing_art = [n for n in names if n not in docs]
    flow_paths = sorted(p for p in glob.glob(D + "flows/*.yaml") if not p.endswith("index.yaml"))
    flows = {os.path.relpath(p, D): load(p) for p in flow_paths}
    chk("missing_artifacts", "critical", "Artefatos obrigatórios ausentes", missing_art)
    if missing_art:
        return finish(D, checks, None, None)

    # ---------------- source_commit
    commits = {n: d.get("source_commit") for n, d in docs.items()}
    commits.update({p: f.get("source_commit") for p, f in flows.items()})
    distinct = sorted({c for c in commits.values() if c})
    chk("source_commit_mismatch", "critical", "source_commit divergente entre artefatos",
        [] if len(distinct) == 1 else [f"{k}: {v}" for k, v in commits.items()])
    SC = distinct[0] if distinct else None
    _, head = git("rev-parse", "HEAD"); head = head.strip()
    cache = {}
    def lines_at(p):
        if p not in cache:
            rc, out = git("show", f"{SC}:{p}")
            cache[p] = out.split("\n") if rc == 0 else None
        return cache[p]

    schema = docs["schema.yaml"]; types = schema["node_types"]; relations = set(schema["relation_types"])
    nodes = docs["nodes.yaml"]["nodes"]; N = {n["id"]: n for n in nodes}
    edges = docs["edges.yaml"]["edges"]
    mods = {m["id"] for m in docs["modules.yaml"]["modules"]}
    ents = docs["entrypoints.yaml"]["entrypoints"]
    ctrs = docs["contracts.yaml"]["contracts"]
    feats = docs["features.yaml"]["features"]
    tests = docs["tests.yaml"]["tests"]
    invs = docs["invariants.yaml"]["invariants"]

    # ---------------- duplicados
    all_ids = [n["id"] for n in nodes] + list(mods) + [e["id"] for e in ents] + [c["id"] for c in ctrs] + \
              [f["id"] for f in feats] + [f["id"] for f in flows.values()] + [i["id"] for i in invs]
    dup = [k for k, v in collections.Counter(all_ids).items() if v > 1]
    dup += [f"edge {k}" for k, v in collections.Counter(e["id"] for e in edges).items() if v > 1]
    chk("duplicate_ids", "critical", "Ids duplicados (nós, módulos, entrypoints, contratos, features, fluxos, invariantes, arestas)", dup)
    anchors = collections.defaultdict(list)
    for n in nodes:
        a = n["anchor"]; anchors[(a["path"], a["symbol"], tuple(a["lines"]))].append(n["id"])
    chk("duplicate_anchors", "warning", "Nós distintos com âncora idêntica (path+symbol+lines)",
        [f"{k[0]}#{k[1]}: {v}" for k, v in anchors.items() if len(v) > 1])

    # ---------------- ids instáveis / formato
    bad_ids = []
    for n in nodes:
        t = types.get(n["type"])
        if t is None or t.get("applicable") is False:
            bad_ids.append(f"{n['id']}: tipo inválido/não aplicável {n['type']}"); continue
        if not re.match(r"^" + t["prefix"] + r"-[A-Z0-9]+(-[A-Z0-9]+)*$", n["id"]):
            bad_ids.append(f"{n['id']}: prefixo/format não corresponde a {n['type']} ({t['prefix']})")
    for i in all_ids:
        if not ID_RE.match(i): bad_ids.append(f"{i}: formato inválido")
        elif UNSTABLE_RE.search(i): bad_ids.append(f"{i}: parece derivado de linha/hash")
    for n in nodes:
        if n.get("alias") and n["alias"] != f'{n["anchor"]["path"]}#{n["anchor"]["symbol"].strip(chr(34))}':
            bad_ids.append(f"{n['id']}: alias inconsistente com anchor")
    chk("unstable_ids", "critical", "Ids fora do padrão, com prefixo errado ou derivados de linha/hash", bad_ids)

    # ---------------- refs quebradas
    br = []
    for n in nodes:
        if n["module"] not in mods: br.append(f"{n['id']}.module -> {n['module']}")
    for e in edges:
        for k in ("from", "to"):
            if e[k] not in N: br.append(f"edge {e['id']}.{k} -> {e[k]}")
    for e in ents:
        if e["node"] not in N: br.append(f"{e['id']}.node -> {e['node']}")
        for k in ("ts_clients", "ts_callers"):
            for x in e.get(k, []) or []:
                if x not in N: br.append(f"{e['id']}.{k} -> {x}")
    for c in ctrs:
        for k in ("producer", "consumers", "carriers"):
            for x in c.get(k, []) or []:
                if x not in N: br.append(f"{c['id']}.{k} -> {x}")
    F = {f["id"] for f in feats}
    for f in feats:
        for k in ("implemented_by", "entry_nodes"):
            for x in f.get(k, []) or []:
                if x not in N: br.append(f"{f['id']}.{k} -> {x}")
    for nid, fl in (docs["features.yaml"].get("node_index") or {}).items():
        if nid not in N: br.append(f"features.node_index -> {nid}")
    E_ids = {e["id"] for e in edges}
    for p, fl in flows.items():
        for x in fl.get("features", []):
            if x not in F: br.append(f"{fl['id']}.features -> {x}")
        nsteps = len(fl["steps"])
        for s in fl["steps"]:
            if s["node"] not in N: br.append(f"{fl['id']}#{s['step']}.node -> {s['node']}")
            if "trigger" not in s and not s.get("via"): br.append(f"{fl['id']}#{s['step']}: passo sem via nem trigger")
            for v in s.get("via", []):
                if v["edge"] not in E_ids: br.append(f"{fl['id']}#{s['step']}.via -> {v['edge']}")
                if not (1 <= v["from_step"] < s["step"]): br.append(f"{fl['id']}#{s['step']}: from_step fora de ordem")
    T = {t["id"] for t in tests}
    for t in tests:
        if t["id"] not in N or N[t["id"]]["type"] != "test": br.append(f"tests.yaml {t['id']}: sem nó test em nodes.yaml")
        for k in ("covers", "validates"):
            for x in t.get(k, []):
                if x not in N: br.append(f"{t['id']}.{k} -> {x}")
    for i in invs:
        for x in i["nodes"]:
            if x not in N: br.append(f"{i['id']}.nodes -> {x}")
        for x in i["verified_by"]:
            if x not in T: br.append(f"{i['id']}.verified_by -> {x}")
        for x in i["features"]:
            if x not in F: br.append(f"{i['id']}.features -> {x}")
    chk("broken_refs", "critical", "Referências a ids inexistentes em qualquer artefato", br)

    # ---------------- âncoras: path/symbol/range
    miss, rng = [], []
    for n in nodes:
        a = n["anchor"]; L = lines_at(a["path"])
        if L is None: miss.append(f"{n['id']}: path inexistente em {SC[:7]}: {a['path']}"); continue
        s0, e0 = a["lines"]
        if not (1 <= s0 <= e0 <= len(L)): rng.append(f"{n['id']}: {a['path']} {a['lines']} (arquivo tem {len(L)} linhas)"); continue
        sym = a["symbol"]; tok = sym[1:-1] if sym.startswith('"') else re.split(r"::|\.", sym)[-1]
        if tok not in L[s0 - 1]: miss.append(f"{n['id']}: símbolo '{tok}' ausente na linha {s0} de {a['path']}")
    chk("missing_paths_symbols", "critical", "Âncoras com path inexistente ou símbolo ausente na linha inicial (no source_commit)", miss)
    chk("anchor_out_of_range", "critical", "Âncoras com intervalo de linhas fora do arquivo", rng)

    # ---------------- arestas: evidence/method
    ev_bad = []
    for e in edges:
        if e["relation"] not in relations: ev_bad.append(f"{e['id']}: relação fora do schema")
        if e.get("method") not in ("observed", "inferred"): ev_bad.append(f"{e['id']}: method ausente/inválido")
        if e.get("method") == "inferred" and "confidence" not in e: ev_bad.append(f"{e['id']}: inferred sem confidence")
        if not e.get("evidence"): ev_bad.append(f"{e['id']}: sem evidence")
        if e.get("boundary") == "ipc":
            ps = [x.rsplit(":", 1)[0] for x in e.get("evidence", [])]
            if not (any(p.endswith((".ts", ".tsx")) for p in ps) and any(p.endswith(".rs") and not p.endswith("src-tauri/src/lib.rs") for p in ps) and "src-tauri/src/lib.rs" in ps):
                ev_bad.append(f"{e['id']}: aresta IPC sem as 3 evidências (invoke TS, fn Rust, registro)")
    chk("edges_without_evidence_or_method", "critical", "Arestas sem evidence/method, inferred sem confidence, relação inválida ou IPC sem evidência dos 3 lados", ev_bad)
    inv_ev = []; n_ev = 0
    for name, d in list(docs.items()) + list(flows.items()):
        for ev in walk_ev(d):
            n_ev += 1
            p, l = ev.rsplit(":", 1); l = int(l.split("-")[0]); L = lines_at(p)
            if L is None or not (1 <= l <= len(L)) or not L[l - 1].strip(): inv_ev.append(f"{name}: {ev}")
    chk("invalid_evidence_lines", "critical", f"Evidências path:line inexistentes ou em linha vazia no source_commit ({n_ev} verificadas)", inv_ev)

    # ---------------- invariantes sem teste e sem gap
    chk("invariant_without_test_or_gap", "critical", "Invariantes sem verified_by e sem gap: true",
        [i["id"] for i in invs if not i["verified_by"] and not i.get("gap")])

    # ---------------- entrypoints sem fluxo
    in_flow = {s["node"] for fl in flows.values() for s in fl["steps"]}
    chk("entrypoints_without_flow", "warning", "Entrypoints cujo nó não aparece em nenhum fluxo",
        [f"{e['id']} ({e['node']})" for e in ents if e["node"] not in in_flow])

    # ---------------- serviços órfãos
    incoming = collections.defaultdict(set)
    for e in edges:
        if e["relation"] in ("calls", "triggers", "contains", "consumes", "configured_by", "depends_on", "reads", "writes", "publishes", "implements"):
            incoming[e["to"]].add(e["relation"])
            if e["relation"] == "consumes": incoming[e["from"]].add("consumes")
    ent_nodes = {e["node"] for e in ents}
    code_types = {"service", "handler", "function", "component", "repository", "class", "screen", "ipc_client"}
    orphan, known = [], []
    for n in nodes:
        if n["type"] not in code_types or n["id"] in ent_nodes: continue
        if incoming.get(n["id"]): continue
        if n.get("status") in ("dead_code", "test_only"): known.append(f"{n['id']} ({n['status']})")
        else: orphan.append(f"{n['id']} ({n['type']}, {n['anchor']['path']})")
    chk("orphan_services", "warning", "Unidades de código sem nenhuma aresta de entrada (nem entrypoint) e sem status dead_code/test_only", orphan)
    chk("known_dead_or_test_only", "info", "Unidades marcadas dead_code/test_only sem aresta de entrada (achados já documentados)", known)

    # ---------------- contratos sem consumidor
    real = set((docs["contracts.yaml"].get("summary") or {}).get("without_real_consumer", []))
    chk("contracts_without_consumer", "warning", "Contratos sem consumidor (lista vazia ou sem consumidor real no produto)",
        sorted({c["id"] for c in ctrs if not c.get("consumers")} | real))

    # ---------------- cobertura (informativo/aviso)
    chk("tests_without_mapped_node", "warning", "Testes que não cobrem nenhum nó modelado (exercitam unidades não modeladas)",
        [t["id"] for t in tests if not t.get("covers") and not t.get("validates")])
    chk("invariants_with_gap", "warning", "Invariantes com cobertura parcial ou sem teste (gap: true)",
        [f"{i['id']} ({i['coverage']})" for i in invs if i.get("gap")])
    chk("features_with_divergences", "info", "Features com divergência doc x código registrada",
        [f"{f['id']} ({len(f.get('divergences', []))})" for f in feats if f.get("divergences")])

    # ---------------- drift
    drift = []
    if SC and head and SC != head:
        _, changed = git("diff", "--name-only", SC, head)
        ch = set(changed.split())
        stale = sorted({n["id"] for n in nodes if n["anchor"]["path"] in ch})
        drift.append(f"HEAD {head[:12]} != source_commit {SC[:12]}; {len(ch)} arquivo(s) alterado(s); nós possivelmente stale: {stale}")
    _, st = git("status", "--porcelain", "--untracked-files=no")
    dirty = sorted({l[3:].strip() for l in st.splitlines() if l.strip()})
    anchored = collections.defaultdict(list)
    for n in nodes: anchored[n["anchor"]["path"]].append(n)
    ev_paths = collections.Counter()
    for name, d in list(docs.items()) + list(flows.items()):
        for ev in walk_ev(d): ev_paths[ev.rsplit(":", 1)[0]] += 1
    for p in dirty:
        if p in anchored or p in ev_paths:
            wt = open(p, encoding="utf-8", errors="replace").read().split("\n") if os.path.exists(p) else None
            moved = []
            for n in anchored.get(p, []):
                a = n["anchor"]; sym = a["symbol"]; tok = sym[1:-1] if sym.startswith('"') else re.split(r"::|\.", sym)[-1]
                s0 = a["lines"][0]
                if wt is None or s0 > len(wt) or tok not in wt[s0 - 1]: moved.append(n["id"])
            ok = [n["id"] for n in anchored.get(p, []) if n["id"] not in moved]
            drift.append(f"working tree modificado: {p} — nós stale (âncora não bate no working tree): {moved}; nós com âncora ainda válida: {ok}; evidências no arquivo: {ev_paths.get(p, 0)}")
    chk("source_commit_drift", "warning", f"Drift entre source_commit ({(SC or '')[:12]}) e HEAD/working tree (âncoras continuam válidas no source_commit)", drift)

    # ---------------- graph.json atualizado
    gs = []
    if os.path.exists(D + "graph.json"):
        g = json.load(open(D + "graph.json", encoding="utf-8"))
        if g.get("source_commit") != SC: gs.append(f"graph.json source_commit {g.get('source_commit')} != {SC}")
        for rel, h in (g.get("inputs") or {}).items():
            p = D + rel
            if not os.path.exists(p): gs.append(f"input ausente: {rel}")
            elif hashlib.sha256(open(p, "rb").read()).hexdigest() != h: gs.append(f"input alterado após gerar graph.json: {rel}")
    else:
        gs.append("graph.json ausente")
    chk("graph_json_stale", "warning", "graph.json desatualizado em relação aos artefatos", gs)

    stats = {"nodes": len(nodes), "edges": len(edges), "modules": len(mods), "entrypoints": len(ents), "contracts": len(ctrs),
             "features": len(feats), "flows": len(flows), "tests": len(tests), "invariants": len(invs), "evidence_refs_checked": n_ev}
    return finish(D, checks, SC, head, stats)

def finish(D, checks, SC, head, stats=None):
    sev = collections.Counter()
    for c in checks.values():
        if c["count"]: sev[c["severity"]] += 1
    crit_items = sum(c["count"] for c in checks.values() if c["severity"] == "critical")
    warn_items = sum(c["count"] for c in checks.values() if c["severity"] == "warning")
    status = "fail" if crit_items else "pass"
    brt = timezone(timedelta(hours=-3))
    body = {"artifact": "validation", "schema_version": 1, "source_commit": SC, "head": head,
            "generated_at": datetime.now(brt).replace(microsecond=0).isoformat(), "generator": "tools/validate.py",
            "summary": {"status": status, "critical_issues": crit_items, "warning_issues": warn_items,
                        "checks_with_findings": dict(sev), "stats": stats or {}},
            "checks": checks}
    hdr = "# TRACE-013 — Validação dos artefatos de rastreabilidade (gerado por tools/validate.py; não editar à mão).\n"
    with open(D + "validation.yaml", "w", encoding="utf-8") as f:
        f.write(hdr + yaml.safe_dump(body, allow_unicode=True, sort_keys=False, width=200))
    print(json.dumps({"status": status, "critical": crit_items, "warning": warn_items,
                      "by_check": {k: (v["severity"], v["count"]) for k, v in checks.items()}}, ensure_ascii=False))
    sys.exit(1 if crit_items else 0)

if __name__ == "__main__":
    main()
