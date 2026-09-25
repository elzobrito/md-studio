#!/usr/bin/env python3
"""Impact drift (TRACE-019): observado (footprint) - autorizado (impact), classificado pelo blast-radius-model.

Ferramenta descartável de validação. Uso:
  python .esaa/traceability/tools/drift.py --impact .esaa/analysis/<id>-impact.yaml \
      --footprint .esaa/analysis/<id>-footprint.yaml --out .esaa/analysis/<id>-drift.yaml
"""
import argparse, json, os, sys

import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
TRACE = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from impact import Graph, dump, protected_set, classify  # noqa: E402


def ratio(a, b):
    return round(a / b, 3) if b else None


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--impact", required=True)
    ap.add_argument("--footprint", required=True)
    ap.add_argument("--graph")
    ap.add_argument("--note", action="append", default=[])
    ap.add_argument("--out")
    a = ap.parse_args(argv)
    imp = yaml.safe_load(open(a.impact, encoding="utf-8"))
    fp = yaml.safe_load(open(a.footprint, encoding="utf-8"))
    G = Graph(json.load(open(a.graph or os.path.join(TRACE, "graph.json"), encoding="utf-8")))
    br = imp["blast_radius"]
    policy = br.get("change_policy") or {}
    authorized = set(br["authorized"])
    potentially = set(br["potentially_affected"])
    closure_ids = {c["id"] for c in imp["closure"]}
    protected = {x: sorted(r) for x, r in protected_set(G).items() if x not in authorized}
    observed = [c["id"] for c in fp["changed_nodes"]]
    obs = set(observed)
    cls = classify(G, authorized, potentially, protected, closure_ids, observed)
    drift = [c for c in cls if c["category"] != "authorized"]
    extra = []
    for u in fp.get("uncatalogued", []):
        if u["substantive_lines"]:
            extra.append({"path": u["path"], "category": "uncatalogued_change",
                          "severity": "info" if u["is_test"] else "warning",
                          "lines": u["substantive_lines"]})
    for f in fp.get("new_files", []):
        extra.append({"path": f, "category": "new_production_file",
                      "severity": "info" if policy.get("allow_new_production_nodes") else "warning"})
    for f in fp.get("new_test_files", []):
        extra.append({"path": f, "category": "new_test_file",
                      "severity": "info" if policy.get("allow_new_tests", True) else "warning"})
    for c in fp["changed_nodes"]:
        if c.get("created_by_change") and c["kind"] == "code" and not policy.get("allow_new_production_nodes"):
            extra.append({"id": c["id"], "category": "created_production_node",
                          "severity": "info" if c["id"] in authorized else "warning",
                          "note": "nó existe no grafo (posterior) mas não existia no base; numa projeção real pré-mudança seria nó novo"})
    tp = obs & authorized
    obs_code = {c["id"] for c in fp["changed_nodes"] if c["kind"] == "code"}
    auth_code = {x for x in authorized if G.kind(x) == "code"}
    sev = [d["severity"] for d in drift] + [e["severity"] for e in extra]
    verdict = "violation" if "violation" in sev else "warning" if "warning" in sev else "ok"
    proj_feats = set(imp["projected"]["features"]["direct"]) | set(imp["projected"]["features"]["indirect"])
    proj_feats_direct = set(imp["projected"]["features"]["direct"])
    obs_feats = set(fp["rollup"]["features"])
    proj_inv = {i["id"] for i in imp["projected"]["invariants"]}
    obs_inv = set(fp["rollup"]["invariants"])
    tests_proj = imp["projected"]["tests"]
    obs_tests = {c["id"] for c in fp["changed_nodes"] if c["kind"] == "test"}
    res = {
        "artifact": "task-drift",
        "schema_version": 1,
        "trace_task": "TRACE-019",
        "task_id": imp.get("task_id") or fp.get("task_id"),
        "inputs": {"impact": a.impact, "footprint": a.footprint, "graph_source_commit": G.source_commit},
        "notes": a.note,
        "rule": "authorized = change_target ∪ expected_affected; ok ∈ authorized; violation ∈ protected; warning ∈ potentially_affected | out_of_closure | uncatalogued substantive",
        "authorized": sorted(authorized),
        "observed": sorted(obs),
        "classification": cls,
        "drift": drift,
        "other_findings": extra,
        "not_touched": sorted(authorized - obs),
        "verdict": verdict,
        "metrics": {
            "nodes": {"tp": len(tp), "authorized": len(authorized), "observed": len(obs),
                      "precision": ratio(len(tp), len(authorized)), "recall": ratio(len(tp), len(obs)),
                      "closure_recall": ratio(len(obs & (closure_ids | authorized)), len(obs))},
            "code_nodes_only": {"tp": len(obs_code & auth_code), "authorized": len(auth_code), "observed": len(obs_code),
                                "precision": ratio(len(obs_code & auth_code), len(auth_code)),
                                "recall": ratio(len(obs_code & auth_code), len(obs_code))},
            "features": {"projected_direct": sorted(proj_feats_direct), "projected_all": len(proj_feats),
                         "observed": sorted(obs_feats),
                         "observed_in_projected_direct": sorted(obs_feats & proj_feats_direct),
                         "observed_missing_from_projection": sorted(obs_feats - proj_feats),
                         "precision_direct": ratio(len(obs_feats & proj_feats_direct), len(proj_feats_direct)),
                         "recall_all": ratio(len(obs_feats & proj_feats), len(obs_feats))},
            "invariants": {"projected": sorted(proj_inv), "observed": sorted(obs_inv),
                           "missing_from_projection": sorted(obs_inv - proj_inv)},
            "tests": {"projected_must_run": tests_proj["must_run"], "changed_test_nodes": sorted(obs_tests),
                      "new_test_files": fp.get("new_test_files", [])},
            "contracts_touched": fp.get("contracts_touched", []),
            "data_touched": fp.get("data_touched", []),
            "events_touched": fp.get("events_touched", []),
        },
    }
    txt = dump(res)
    if a.out:
        open(a.out, "w", encoding="utf-8").write(txt)
    else:
        sys.stdout.write(txt)


if __name__ == "__main__":
    main()
