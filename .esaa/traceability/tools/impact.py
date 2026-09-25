#!/usr/bin/env python3
"""Fechamento de impacto sobre graph.json segundo impact-model.yaml (TRACE-014).

Ferramenta descartável de validação (não é produto/CLI). Uso:
  python .esaa/traceability/tools/impact.py closure ID [ID ...] [--out arquivo.yaml]
Saída: YAML com closure, rollups (módulos, fluxos, features, invariantes, entrypoints) e testes.
"""
import argparse, json, os, sys
from collections import defaultdict, deque

import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
TRACE = os.path.dirname(HERE)
class NoAliasDumper(yaml.SafeDumper):
    def ignore_aliases(self, data):
        return True


def dump(obj):
    return yaml.dump(obj, Dumper=NoAliasDumper, allow_unicode=True, sort_keys=False, width=140)


ROLLUP_KINDS = {"module", "flow", "feature", "invariant", "entrypoint", "test"}
DATA_TYPES = {"local_storage_key", "file_persisted", "store", "repository", "class"}


def load(graph_path=None, model_path=None):
    g = json.load(open(graph_path or os.path.join(TRACE, "graph.json"), encoding="utf-8"))
    m = yaml.safe_load(open(model_path or os.path.join(TRACE, "impact-model.yaml"), encoding="utf-8"))
    return g, m


class Graph:
    def __init__(self, g):
        self.nodes = {n["id"]: n for n in g["nodes"]}
        self.out = defaultdict(list)   # from -> [(rel, to)]
        self.inc = defaultdict(list)   # to -> [(rel, from)]
        for e in g["edges"]:
            self.out[e["from"]].append((e["relation"], e["to"]))
            self.inc[e["to"]].append((e["relation"], e["from"]))
        self.source_commit = g.get("source_commit")

    def kind(self, i):
        return self.nodes[i]["kind"]

    def typ(self, i):
        return self.nodes[i].get("type")


def closure(G, model, changed):
    P = model["parameters"]
    rules = model["propagation_rules"]
    maxd = P["max_distance"]
    hub_t = P["hub_threshold"]
    unknown = [c for c in changed if c not in G.nodes]
    if unknown:
        raise SystemExit(f"ids desconhecidos no grafo: {unknown}")
    dist = {c: 0 for c in changed}
    via = {c: None for c in changed}
    terminal = set()
    hubs = []
    q = deque(changed)
    while q:
        x = q.popleft()
        d = dist[x]
        if x in terminal or G.kind(x) in ROLLUP_KINDS:
            continue
        cand = defaultdict(list)  # rel/dir -> [neighbor]
        for rel, frm in G.inc[x]:           # reverse: from aponta para x
            r = rules.get(rel, {})
            if "reverse" in r.get("propagate", []) or (r.get("reverse_only_from_changed") and d == 0):
                if d + 1 > r.get("max_distance", maxd):
                    continue
                if rel == "contains" and G.kind(frm) != "code":
                    continue
                if rel == "implemented_by" and G.kind(frm) != "contract":
                    continue
                if rel == "triggers" and G.kind(frm) == "entrypoint":
                    continue
                cand[(rel, "reverse")].append(frm)
        for rel, to in G.out[x]:            # forward: x aponta para to
            r = rules.get(rel, {})
            if "forward" in r.get("propagate", []):
                if d + 1 > r.get("max_distance", maxd):
                    continue
                cand[(rel, "forward")].append(to)
        for (rel, direction), ns in cand.items():
            new = [n for n in dict.fromkeys(ns) if n not in dist]
            is_hub = len(new) > hub_t
            if is_hub:
                hubs.append({"id": x, "relation": rel, "direction": direction, "fanout": len(new)})
            for n in new:
                if G.kind(n) in ROLLUP_KINDS:
                    continue
                dist[n] = d + 1
                via[n] = {"node": x, "relation": rel, "direction": direction}
                if is_hub or d + 1 >= maxd:
                    terminal.add(n)
                q.append(n)
    return dist, via, terminal, hubs


def rollups(G, dist):
    mods, flows, feats_d, feats_i, invs, ents = set(), defaultdict(set), set(), set(), {}, set()
    for x, d in dist.items():
        for rel, frm in G.inc[x]:
            k = G.kind(frm)
            if rel == "contains" and k == "module":
                mods.add(frm)
            elif rel == "contains" and k == "flow":
                flows[frm].add(x)
            elif rel == "implemented_by" and k == "feature":
                (feats_d if d == 0 else feats_i).add(frm)
            elif rel == "implemented_by" and k == "invariant":
                invs.setdefault(frm, {"hit_by": set(), "min_distance": d})
                invs[frm]["hit_by"].add(x)
                invs[frm]["min_distance"] = min(invs[frm]["min_distance"], d)
            elif rel == "triggers" and k == "entrypoint":
                ents.add(frm)
    for f, hit in flows.items():
        direct = any(dist[h] == 0 for h in hit)
        for rel, frm in G.inc[f]:
            if rel == "contains" and G.kind(frm) == "feature":
                (feats_d if direct else feats_i).add(frm)
    feats_i -= feats_d
    inv_out = []
    for i, v in sorted(invs.items()):
        members = sorted(to for rel, to in G.out[i] if rel == "implemented_by")
        tests = sorted(frm for rel, frm in G.inc[i] if rel == "verifies")
        inv_out.append({"id": i, "name": G.nodes[i].get("name"), "hit_by": sorted(v["hit_by"]),
                        "min_distance": v["min_distance"], "members": members, "tests": tests})
    flows_out = []
    for f, hit in sorted(flows.items()):
        flows_out.append({"id": f, "steps_hit": sorted(hit)})
    return sorted(mods), flows_out, sorted(feats_d), sorted(feats_i), inv_out, sorted(ents)


def collect_tests(G, dist, invs):
    must, should, may = set(), set(), set()
    for x, d in dist.items():
        for rel, to in G.out[x]:
            if rel == "covered_by":
                (must if d == 0 else should if d == 1 else may).add(to)
        for rel, frm in G.inc[x]:
            if rel == "validates":
                should.add(frm)
    for inv in invs:
        (must if inv["min_distance"] == 0 else should).update(inv["tests"])
    should -= must
    may -= must | should
    return {"must_run": sorted(must), "should_run": sorted(should), "may_run": sorted(may)}


def compute(G, model, changed):
    dist, via, terminal, hubs = closure(G, model, changed)
    mods, flows, fd, fi, invs, ents = rollups(G, dist)
    tests = collect_tests(G, dist, invs)
    cl = []
    for x in sorted(dist, key=lambda i: (dist[i], i)):
        n = G.nodes[x]
        cl.append({"id": x, "kind": n["kind"], "type": n.get("type"), "distance": dist[x],
                   "anchor": (n.get("anchor") or {}).get("path"),
                   "via": via[x], "terminal": x in terminal})
    return {
        "changed": list(changed),
        "graph_source_commit": G.source_commit,
        "closure": cl,
        "hubs": hubs,
        "contracts": sorted(x for x in dist if G.kind(x) == "contract"),
        "data": sorted(x for x in dist if G.typ(x) in DATA_TYPES),
        "events": sorted(x for x in dist if G.typ(x) == "tauri_event"),
        "modules": mods,
        "flows": flows,
        "features": {"direct": fd, "indirect": fi},
        "invariants": invs,
        "entrypoints": ents,
        "tests": tests,
        "stats": {"closure_nodes": len(cl), "by_distance": {str(k): sum(1 for v in dist.values() if v == k)
                                                            for k in sorted(set(dist.values()))}},
    }


def protected_set(G):
    """Conjunto protected global segundo blast-radius-model.yaml."""
    reasons = defaultdict(set)
    for i, n in G.nodes.items():
        k, t = n["kind"], n.get("type")
        if k == "invariant":
            for rel, to in G.out[i]:
                if rel == "implemented_by":
                    reasons[to].add("invariant_member:" + i)
        elif k == "contract":
            consumers = [f for rel, f in G.inc[i] if rel == "depends_on"]
            if consumers:
                reasons[i].add("contract_surface")
                for rel, f in G.inc[i]:
                    if rel == "implements":
                        reasons[f].add("contract_surface:" + i)
        if t in ("file_persisted", "local_storage_key"):
            reasons[i].add("persisted_data")
        if t in ("permission", "configuration"):
            reasons[i].add("security_config")
    return reasons


def load_spec(path):
    s = yaml.safe_load(open(path, encoding="utf-8"))
    tr = s.get("traceability", s)
    tr.setdefault("task_id", s.get("task_id"))
    return tr


def blast(G, model, targets, expected=None, protected_extra=(), policy=None):
    res = compute(G, model, targets)
    dist = {c["id"]: c["distance"] for c in res["closure"]}
    via = {c["id"]: c["via"] for c in res["closure"]}
    prot_reasons = protected_set(G)
    for p in protected_extra:
        prot_reasons[p].add("declared_protected_extra")
    # expected_affected sugerido (default)
    suggested = set()
    for x, v in via.items():
        if dist[x] == 1 and v and (v["relation"] == "implements" or (v["relation"] == "contains" and v["direction"] == "reverse")):
            if x not in prot_reasons:
                suggested.add(x)
    for t in targets:
        for rel, to in G.out[t]:
            if rel == "covered_by":
                suggested.add(to)
    if expected is None:
        exp, src = set(suggested), "derived"
    else:
        exp, src = set(expected), "declared"
    unknown = [x for x in exp if x not in G.nodes]
    if unknown:
        raise SystemExit(f"expected_affected desconhecidos: {unknown}")
    authorized = set(targets) | exp
    protected_declared = sorted(x for x in authorized if x in prot_reasons)
    protected = {x: sorted(r) for x, r in prot_reasons.items() if x not in authorized}
    potentially = sorted(x for x in dist if x not in authorized and x not in protected)
    prot_in_closure = sorted(x for x in dist if x in protected)
    res_b = {
        "change_target": list(targets),
        "expected_affected": sorted(exp),
        "expected_affected_source": src,
        "suggested_expected_affected": sorted(suggested),
        "authorized": sorted(authorized),
        "potentially_affected": potentially,
        "protected_in_closure": [{"id": x, "reasons": protected[x]} for x in prot_in_closure],
        "protected_total": len(protected),
        "protected_declared": [{"id": x, "reasons": sorted(prot_reasons[x])} for x in protected_declared],
        "change_policy": policy or {"mode": "surgical", "allow_new_tests": True},
    }
    return res, res_b, protected


def classify(G, authorized, potentially, protected, closure_ids, observed):
    out = []
    for x in observed:
        if x in authorized:
            c, sev = "authorized", "ok"
        elif x in protected:
            c, sev = "protected", "violation"
        elif x in potentially:
            c, sev = "potentially_affected", "warning"
        else:
            c, sev = "out_of_closure", "warning"
        out.append({"id": x, "category": c, "severity": sev,
                    "reasons": protected.get(x, []) if c == "protected" else []})
    return out


def project(G, model, spec_path):
    import datetime
    raw = yaml.safe_load(open(spec_path, encoding="utf-8"))
    spec = load_spec(spec_path)
    targets = spec["targets"]
    closure_res, b_res, _ = blast(G, model, targets, spec.get("expected_affected"),
                                  spec.get("protected_extra", []), spec.get("change_policy"))
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    return {
        "artifact": "task-impact",
        "schema_version": 1,
        "trace_task": "TRACE-017",
        "task_id": raw.get("task_id"),
        "projected_at": now.isoformat(timespec="seconds"),
        "projected_before_change": raw.get("projected_before_change", True),
        "projection_inputs": raw.get("projection_inputs"),
        "spec": os.path.relpath(os.path.abspath(spec_path), os.path.dirname(TRACE) if False else os.getcwd()),
        "graph_source_commit": G.source_commit,
        "rationale": spec.get("rationale"),
        "justification": spec.get("justification"),
        "expected_uncatalogued": spec.get("expected_uncatalogued"),
        "blast_radius": b_res,
        "projected": {
            "nodes": b_res["authorized"],
            "features": closure_res["features"],
            "flows": [f["id"] for f in closure_res["flows"]],
            "invariants": [{"id": i["id"], "hit_by": i["hit_by"], "tests": i["tests"]} for i in closure_res["invariants"]],
            "tests": closure_res["tests"],
            "contracts": closure_res["contracts"],
            "data": closure_res["data"],
            "events": closure_res["events"],
            "entrypoints": closure_res["entrypoints"],
            "modules": closure_res["modules"],
        },
        "closure": closure_res["closure"],
        "hubs": closure_res["hubs"],
        "stats": closure_res["stats"],
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("closure")
    c.add_argument("ids", nargs="+")
    b = sub.add_parser("blast")
    b.add_argument("--spec", help="YAML com traceability {targets, expected_affected, protected_extra, change_policy}")
    b.add_argument("--targets", nargs="*")
    b.add_argument("--expected", nargs="*")
    pj = sub.add_parser("project", help="gera <task>-impact.yaml (TRACE-017) a partir de um spec de traceability")
    pj.add_argument("--spec", required=True)
    for p in (c, b, pj):
        p.add_argument("--graph")
        p.add_argument("--model")
        p.add_argument("--out")
    a = ap.parse_args(argv)
    g, m = load(a.graph, a.model)
    G = Graph(g)
    if a.cmd == "closure":
        res = compute(G, m, a.ids)
    elif a.cmd == "project":
        res = project(G, m, a.spec)
    else:
        spec = load_spec(a.spec) if a.spec else {}
        targets = a.targets or spec.get("targets")
        expected = a.expected if a.expected is not None else spec.get("expected_affected")
        closure_res, b_res, _ = blast(G, m, targets, expected, spec.get("protected_extra", []), spec.get("change_policy"))
        res = {"blast_radius": b_res, "impact": closure_res}
    txt = dump(res)
    if a.out:
        open(a.out, "w", encoding="utf-8").write(txt)
    else:
        sys.stdout.write(txt)


if __name__ == "__main__":
    main()
