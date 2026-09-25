#!/usr/bin/env python3
"""TRACE-012 — Consolida os artefatos de .esaa/traceability/ em graph.json.

Uso (na raiz do repositório):
    python .esaa/traceability/tools/build_graph.py [--dir .esaa/traceability] [--out graph.json]

Dependências: Python 3 stdlib + PyYAML. Não lê código-fonte nem acessa rede.
Arestas de edges.yaml entram como estão; arestas derivadas (módulo, entrypoint, contrato,
feature, fluxo, invariante) recebem method: derived e evidence apontando para path:line
já validados nos artefatos de origem. Falha (exit 1) em id duplicado, referência quebrada,
aresta sem evidence/method ou source_commit divergente entre artefatos.
"""
import argparse, glob, hashlib, json, os, sys
from datetime import datetime, timezone, timedelta
import yaml

def load(path):
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)

def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        h.update(f.read())
    return h.hexdigest()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=".esaa/traceability")
    ap.add_argument("--out", default=None)
    a = ap.parse_args()
    D = a.dir.rstrip("/") + "/"
    out_path = a.out or D + "graph.json"
    files = ["repository.yaml", "schema.yaml", "modules.yaml", "entrypoints.yaml", "nodes.yaml", "edges.yaml",
             "contracts.yaml", "features.yaml", "tests.yaml", "invariants.yaml"]
    flow_files = sorted(p for p in glob.glob(D + "flows/*.yaml") if not p.endswith("index.yaml"))
    errors = []
    docs = {}
    for f in files:
        if not os.path.exists(D + f):
            errors.append(f"artefato ausente: {f}")
            continue
        docs[f] = load(D + f)
    flows = [load(p) for p in flow_files]
    if errors:
        print("\n".join(errors), file=sys.stderr); sys.exit(1)

    commits = {f: d.get("source_commit") for f, d in docs.items()}
    commits.update({os.path.relpath(p, D): fl.get("source_commit") for p, fl in zip(flow_files, flows)})
    distinct = {c for c in commits.values() if c}
    if len(distinct) != 1:
        errors.append(f"source_commit divergente entre artefatos: {commits}")
    source_commit = next(iter(distinct)) if distinct else None
    schema = docs["schema.yaml"]
    relations = set(schema["relation_types"])

    G_nodes, G_edges = {}, {}
    def add_node(o):
        if o["id"] in G_nodes:
            errors.append(f"id duplicado: {o['id']}")
        G_nodes[o["id"]] = o
    def add_edge(frm, rel, to, evidence, method, source, **extra):
        eid = f"{frm}|{rel}|{to}"
        if eid in G_edges:
            G_edges[eid].setdefault("also_from", []).append(source)
            return
        e = {"id": eid, "from": frm, "to": to, "relation": rel, "evidence": list(evidence), "method": method, "source": source}
        e.update({k: v for k, v in extra.items() if v is not None})
        G_edges[eid] = e

    # --- nós de código e testes
    anchor_line = {}
    for n in docs["nodes.yaml"]["nodes"]:
        o = dict(n); o["kind"] = "test" if n["type"] == "test" else "code"
        add_node(o)
        anchor_line[n["id"]] = f'{n["anchor"]["path"]}:{n["anchor"]["lines"][0]}'
    # --- módulos
    for m in docs["modules.yaml"]["modules"]:
        add_node({"id": m["id"], "kind": "module", "type": "module", "name": m["name"], "paths": m.get("paths", [])})
    for n in docs["nodes.yaml"]["nodes"]:
        add_edge(n["module"], "contains", n["id"], [anchor_line[n["id"]]], "derived", "nodes.yaml:module")
    # --- entrypoints
    for e in docs["entrypoints.yaml"]["entrypoints"]:
        add_node({"id": e["id"], "kind": "entrypoint", "type": "entrypoint", "entry_kind": e["kind"], "name": e.get("name"), "node": e["node"]})
        add_edge(e["id"], "triggers", e["node"], e.get("evidence") or [anchor_line.get(e["node"])], "derived", "entrypoints.yaml")
    # --- contratos
    for c in docs["contracts.yaml"]["contracts"]:
        add_node({"id": c["id"], "kind": "contract", "type": "contract", "contract_kind": c.get("kind"), "name": c.get("name")})
        ev = c.get("evidence") or []
        for p in c.get("producer", []):
            add_edge(c["id"], "implemented_by", p, ev, "derived", "contracts.yaml:producer")
        for p in c.get("consumers", []):
            add_edge(p, "depends_on", c["id"], ev, "derived", "contracts.yaml:consumers")
        for p in c.get("carriers", []):
            add_edge(p, "implements", c["id"], [anchor_line.get(p)] if p in anchor_line else ev, "derived", "contracts.yaml:carriers")
    # --- features
    for f in docs["features.yaml"]["features"]:
        add_node({"id": f["id"], "kind": "feature", "type": "feature", "name": f["name"], "status": f.get("status"),
                  "since": f.get("since"), "docs": f.get("docs", []), "divergences": len(f.get("divergences", []))})
        for n in f.get("implemented_by", []):
            add_edge(f["id"], "implemented_by", n, [anchor_line.get(n)], "derived", "features.yaml:implemented_by")
        for n in f.get("entry_nodes", []):
            add_edge(f["id"], "implemented_by", n, [anchor_line.get(n)], "derived", "features.yaml:entry_nodes", role="entry")
    # --- fluxos
    for fl in flows:
        add_node({"id": fl["id"], "kind": "flow", "type": "flow", "name": fl["name"], "required": fl.get("required"),
                  "features": fl.get("features", []), "steps": len(fl["steps"])})
        seen = {}
        for s in fl["steps"]:
            ev = [x for v in s.get("via", []) for x in v["evidence"]] or [anchor_line.get(s["node"])]
            seen.setdefault(s["node"], {"steps": [], "ev": ev})["steps"].append(s["step"])
            for v in s.get("via", []):
                if v["edge"] not in {e["id"] for e in docs["edges.yaml"]["edges"]}:
                    errors.append(f'{fl["id"]} passo {s["step"]}: aresta inexistente {v["edge"]}')
        for n, info in seen.items():
            add_edge(fl["id"], "contains", n, info["ev"], "derived", "flows", steps=info["steps"])
        for fid in fl.get("features", []):
            add_edge(fid, "contains", fl["id"], [anchor_line.get(fl["steps"][0]["node"])], "derived", "flows:features")
    # --- invariantes
    for i in docs["invariants.yaml"]["invariants"]:
        add_node({"id": i["id"], "kind": "invariant", "type": "invariant", "name": i["name"], "coverage": i["coverage"], "gap": i["gap"]})
        for n in i["nodes"]:
            add_edge(i["id"], "implemented_by", n, i.get("enforced_by") or [anchor_line.get(n)], "derived", "invariants.yaml:nodes")
        for t in i["verified_by"]:
            add_edge(t, "verifies", i["id"], [anchor_line.get(t)], "derived", "invariants.yaml:verified_by")
    # --- arestas observadas/inferidas (edges.yaml)
    for e in docs["edges.yaml"]["edges"]:
        extra = {k: v for k, v in e.items() if k not in ("id", "from", "to", "relation", "evidence", "method")}
        add_edge(e["from"], e["relation"], e["to"], e["evidence"], e["method"], "edges.yaml", **extra)

    # --- validações
    for e in G_edges.values():
        if e["from"] not in G_nodes: errors.append(f"aresta {e['id']}: from inexistente")
        if e["to"] not in G_nodes: errors.append(f"aresta {e['id']}: to inexistente")
        if e["relation"] not in relations: errors.append(f"aresta {e['id']}: relação fora do schema")
        if not e.get("method"): errors.append(f"aresta {e['id']}: sem method")
        if not e.get("evidence") or any(not x for x in e["evidence"]): errors.append(f"aresta {e['id']}: sem evidence")
    if errors:
        print("\n".join(errors[:50]), file=sys.stderr)
        print(f"{len(errors)} erro(s); graph.json não gerado", file=sys.stderr)
        sys.exit(1)

    kinds = {}
    for n in G_nodes.values(): kinds[n["kind"]] = kinds.get(n["kind"], 0) + 1
    rels, meths = {}, {}
    for e in G_edges.values():
        rels[e["relation"]] = rels.get(e["relation"], 0) + 1
        meths[e["method"]] = meths.get(e["method"], 0) + 1
    brt = timezone(timedelta(hours=-3))
    graph = {
        "artifact": "graph", "schema_version": 1, "source_commit": source_commit,
        "generated_at": datetime.now(brt).replace(microsecond=0).isoformat(),
        "generator": "tools/build_graph.py",
        "inputs": {os.path.relpath(p, D): sha256(p) for p in [D + f for f in files] + flow_files},
        "stats": {"nodes": len(G_nodes), "edges": len(G_edges), "nodes_by_kind": dict(sorted(kinds.items())),
                  "edges_by_relation": dict(sorted(rels.items())), "edges_by_method": dict(sorted(meths.items()))},
        "nodes": sorted(G_nodes.values(), key=lambda n: n["id"]),
        "edges": sorted(G_edges.values(), key=lambda e: e["id"]),
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(graph, f, ensure_ascii=False, indent=1, sort_keys=False)
        f.write("\n")
    print(json.dumps({"out": out_path, "source_commit": source_commit, **graph["stats"]}, ensure_ascii=False))

if __name__ == "__main__":
    main()
