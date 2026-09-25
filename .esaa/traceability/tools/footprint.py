#!/usr/bin/env python3
"""Footprint de mudança (TRACE-018): diff real -> changed_files, changed_nodes por interseção de linhas.

Ferramenta descartável de validação. Uso (na raiz do repo):
  # commit(s) já existentes
  python .esaa/traceability/tools/footprint.py --task ID --base <rev> --head <rev> --out f.yaml
  # working tree restrito aos arquivos da tarefa (ignora qualquer outra mudança local)
  python .esaa/traceability/tools/footprint.py --task ID --base HEAD --head WORKTREE --paths a.ts b.ts --out f.yaml

Âncoras do grafo são de graph.source_commit; para cada lado do diff elas são re-localizadas no
conteúdo daquela revisão via alinhamento difflib (anchor_resolution: exact | relocated | partial | missing).
Atribuição: cada linha alterada vai para o(s) nó(s) mais interno(s) que a contém; contêineres ficam em enclosing_nodes.
"""
import argparse, difflib, fnmatch, json, os, re, subprocess, sys
from collections import defaultdict

import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
TRACE = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from impact import Graph, dump, DATA_TYPES  # noqa: E402

TEST_GLOBS = ["tests/**", "*.test.ts", "*.test.tsx", "*/tests/*.rs", "**/tests/**"]


def git(*args, check=True):
    r = subprocess.run(["git", *args], capture_output=True, text=True)
    if check and r.returncode != 0:
        raise SystemExit(f"git {' '.join(args)} falhou: {r.stderr.strip()}")
    return r.stdout


def content(rev, path):
    if rev == "WORKTREE":
        return open(path, encoding="utf-8").read().splitlines() if os.path.exists(path) else None
    r = subprocess.run(["git", "show", f"{rev}:{path}"], capture_output=True, text=True)
    return r.stdout.splitlines() if r.returncode == 0 else None


def is_test(path):
    return any(fnmatch.fnmatch(path, g) for g in TEST_GLOBS) or "/tests/" in path or path.startswith("tests/")


TRIVIAL = re.compile(r"^\s*($|//|/\*|\*|\*/|#(?!\[)|import\s|use\s|\}\s*from\s|[\w\s,{}]*\}\s*from\s|\w+,\s*$)")


def trivial(line):
    """linha em branco, comentário, doc-comment ou import/use (fora de âncoras por construção)."""
    return bool(TRIVIAL.match(line or ""))


HUNK = re.compile(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@")


def parse_diff(text):
    files = {}
    cur = None
    in_header = False
    pending_old = None
    for line in text.splitlines():
        if line.startswith("diff --git "):
            cur, in_header = None, True
        elif in_header and line.startswith("--- "):
            old = line[4:].strip()
            pending_old = None if old == "/dev/null" else old[2:]
        elif in_header and line.startswith("+++ "):
            new = line[4:].strip()
            newp = None if new == "/dev/null" else new[2:]
            path = newp or pending_old
            status = "A" if pending_old is None else "D" if newp is None else ("R" if pending_old != newp else "M")
            cur = files.setdefault(path, {"path": path, "old_path": pending_old, "status": status,
                                          "hunks": [], "added": 0, "removed": 0})
        elif cur is not None:
            m = HUNK.match(line)
            if m:
                in_header = False
                os_, oc, ns, nc = int(m[1]), int(m[2] or 1), int(m[3]), int(m[4] or 1)
                cur["hunks"].append({"old": [os_, os_ + oc - 1] if oc else [os_, os_ - 1],
                                     "new": [ns, ns + nc - 1] if nc else [ns, ns - 1]})
                cur["removed"] += oc
                cur["added"] += nc
    return files


def line_map(src, dst):
    """mapa 1-based de linhas de src -> dst para blocos iguais."""
    m = {}
    sm = difflib.SequenceMatcher(None, src, dst, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                m[i1 + k + 1] = j1 + k + 1
    return m


def relocate(nodes_in_file, graph_lines, rev_lines):
    out = {}
    if rev_lines is None:
        return {n["id"]: (None, "missing") for n in nodes_in_file}
    same = graph_lines == rev_lines
    lm = None if same else line_map(graph_lines or [], rev_lines)
    for n in nodes_in_file:
        s, e = n["anchor"]["lines"]
        if same:
            out[n["id"]] = ([s, e], "exact")
            continue
        mapped = [lm[l] for l in range(s, e + 1) if l in lm]
        span = e - s + 1
        if not mapped:
            out[n["id"]] = (None, "missing")
        else:
            rng = [min(mapped), max(mapped)]
            if len(mapped) == span:
                res = "exact" if rng == [s, e] else "relocated"
            else:
                res = "relocated" if len(mapped) / span >= 0.5 else "partial"
            out[n["id"]] = (rng, res)
    return out


def attribute(lines, ranges):
    """lines: conjunto de linhas; ranges: {id: [s,e]}. Retorna innermost hits e enclosing."""
    hits, enclosing, uncovered = defaultdict(int), defaultdict(set), []
    for l in sorted(lines):
        cont = [(i, r) for i, r in ranges.items() if r and r[0] <= l <= r[1]]
        if not cont:
            uncovered.append(l)
            continue
        minspan = min(r[1] - r[0] for _, r in cont)
        inner = [i for i, r in cont if r[1] - r[0] == minspan]
        for i in inner:
            hits[i] += 1
        for i, r in cont:
            if i not in inner:
                enclosing[i].update(inner)
    return hits, enclosing, uncovered


def compress(ls):
    out = []
    for l in sorted(ls):
        if out and l == out[-1][1] + 1:
            out[-1][1] = l
        else:
            out.append([l, l])
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--task", required=True)
    ap.add_argument("--base", required=True)
    ap.add_argument("--head", required=True, help="rev ou WORKTREE")
    ap.add_argument("--paths", nargs="*", help="restringe o diff a estes arquivos (obrigatório com WORKTREE)")
    ap.add_argument("--exclude", nargs="*", default=[], help="arquivos que NÃO podem aparecer (ex.: conjunto de outra frente)")
    ap.add_argument("--graph")
    ap.add_argument("--note", action="append", default=[])
    ap.add_argument("--out")
    a = ap.parse_args(argv)
    if a.head == "WORKTREE" and not a.paths:
        raise SystemExit("--paths é obrigatório com --head WORKTREE")
    overlap = sorted(set(a.paths or []) & set(a.exclude))
    if overlap:
        raise SystemExit(f"paths sobrepõem o conjunto excluído: {overlap}")
    g = json.load(open(a.graph or os.path.join(TRACE, "graph.json"), encoding="utf-8"))
    G = Graph(g)
    gsha = G.source_commit
    base = git("rev-parse", a.base).strip()
    head = "WORKTREE" if a.head == "WORKTREE" else git("rev-parse", a.head).strip()
    diff_args = ["diff", "-U0", "--no-color", "--no-ext-diff", base] + ([] if head == "WORKTREE" else [head])
    if a.paths:
        diff_args += ["--"] + a.paths
    files = parse_diff(git(*diff_args))
    # arquivos não rastreados passados em --paths (novos no working tree)
    if head == "WORKTREE":
        untracked = set(git("ls-files", "--others", "--exclude-standard", "--", *a.paths).split())
        for p in untracked:
            n = len(open(p, encoding="utf-8").read().splitlines())
            files[p] = {"path": p, "old_path": None, "status": "A", "hunks": [{"old": [0, -1], "new": [1, n]}],
                        "added": n, "removed": 0}
    bad = sorted(set(files) & set(a.exclude))
    if bad:
        raise SystemExit(f"diff contém arquivos excluídos: {bad}")

    by_path = defaultdict(list)
    for n in G.nodes.values():
        an = n.get("anchor") or {}
        if an.get("lines") and n["kind"] in ("code", "test"):
            by_path[an["path"]].append(n)

    changed, enclosing_all, uncatalogued, changed_files, resolutions = {}, defaultdict(set), [], [], {}
    new_files, new_test_files = [], []
    for path, f in sorted(files.items()):
        old_lines = set()
        new_lines = set()
        for h in f["hunks"]:
            old_lines.update(range(h["old"][0], h["old"][1] + 1))
            new_lines.update(range(h["new"][0], h["new"][1] + 1))
        nodes = by_path.get(f["old_path"] or path, []) + ([] if f["old_path"] in (None, path) else by_path.get(path, []))
        entry = {"path": path, "status": f["status"], "added": f["added"], "removed": f["removed"],
                 "hunks": f["hunks"], "is_test": is_test(path), "catalogued_nodes_in_file": len(nodes)}
        changed_files.append(entry)
        if f["status"] == "A" and not nodes:
            (new_test_files if is_test(path) else new_files).append(path)
            continue
        glines = content(gsha, path)
        old_c = content(base, f["old_path"] or path) if f["status"] != "A" else None
        new_c = content(head, path) if f["status"] != "D" else None
        r_old = relocate(nodes, glines, old_c)
        r_new = relocate(nodes, glines, new_c)
        file_uncov = []
        for side, lines, rel in (("old", old_lines, r_old), ("new", new_lines, r_new)):
            for i, v in rel.items():
                resolutions.setdefault(i, {})[side] = v[1]
            if not lines:
                continue
            ranges = {i: v[0] for i, v in rel.items()}
            hits, enc, unc = attribute(lines, ranges)
            for i, cnt in hits.items():
                c = changed.setdefault(i, {"id": i, "kind": G.nodes[i]["kind"], "type": G.nodes[i].get("type"),
                                           "path": path, "sides": [], "lines_hit": 0, "attribution": "line"})
                if side not in c["sides"]:
                    c["sides"].append(side)
                c["lines_hit"] += cnt
            for i, kids in enc.items():
                enclosing_all[i].update(kids)
            file_uncov += [(side, l) for l in unc]
        # arquivo de teste existente: mudança fora dos blocos TST -> atribuição por arquivo
        if is_test(path) and file_uncov:
            tst = [n["id"] for n in nodes if n["kind"] == "test"]
            if tst and not any(t in changed for t in tst):
                for i in tst:
                    c = changed.setdefault(i, {"id": i, "kind": "test", "type": "test", "path": path,
                                               "sides": [], "lines_hit": 0, "attribution": "file_level"})
                file_uncov = []
        if file_uncov:
            by_side = defaultdict(list)
            triv, subst = [], []
            for side, l in file_uncov:
                by_side[side].append(l)
                src = old_c if side == "old" else new_c
                txt = src[l - 1] if src and 0 < l <= len(src) else ""
                (triv if trivial(txt) else subst).append(f"{side}:{l}")
            uncatalogued.append({"path": path, "is_test": is_test(path),
                                 **{f"{s}_lines": compress(v) for s, v in by_side.items()},
                                 "trivial_lines": len(triv), "substantive_lines": subst})
    for i, c in changed.items():
        r = resolutions.get(i, {})
        c["anchor_resolution"] = {k: v for k, v in r.items() if k in c["sides"] or c["attribution"] == "file_level" or k == "old"}
        c["created_by_change"] = r.get("old") == "missing" and r.get("new") not in (None, "missing")
    enclosing = [{"id": i, "contains_changed": sorted(k)} for i, k in sorted(enclosing_all.items()) if i not in changed]

    ch = set(changed)
    contracts, data, events = [], [], []
    for i in sorted(ch):
        for rel, to in G.out[i]:
            if rel == "implements" and G.kind(to) == "contract":
                contracts.append({"id": to, "how": "carrier", "node": i})
            elif rel == "depends_on" and G.kind(to) == "contract":
                contracts.append({"id": to, "how": "consumer", "node": i})
            elif rel == "writes" and G.typ(to) in DATA_TYPES:
                data.append({"id": to, "how": "written_by_changed", "node": i})
            elif rel == "reads" and G.typ(to) in DATA_TYPES:
                data.append({"id": to, "how": "read_by_changed", "node": i})
            elif rel == "publishes":
                events.append({"id": to, "how": "published_by_changed", "node": i})
            elif rel == "consumes":
                events.append({"id": to, "how": "consumed_by_changed", "node": i})
        for rel, frm in G.inc[i]:
            if rel == "implemented_by" and G.kind(frm) == "contract":
                contracts.append({"id": frm, "how": "producer", "node": i})
        if G.typ(i) in DATA_TYPES:
            data.append({"id": i, "how": "definition_changed", "node": i})
        if G.typ(i) == "tauri_event":
            events.append({"id": i, "how": "definition_changed", "node": i})
    feats, invs, flows = set(), set(), set()
    for i in ch:
        for rel, frm in G.inc[i]:
            k = G.kind(frm)
            if rel == "implemented_by" and k == "feature":
                feats.add(frm)
            elif rel == "implemented_by" and k == "invariant":
                invs.add(frm)
            elif rel == "contains" and k == "flow":
                flows.add(frm)
    res = {
        "artifact": "task-footprint",
        "schema_version": 1,
        "trace_task": "TRACE-018",
        "task_id": a.task,
        "diff": {"base": base, "head": head, "paths_filter": a.paths, "excluded_set": a.exclude,
                 "command": "git " + " ".join(diff_args)},
        "graph_source_commit": gsha,
        "notes": a.note,
        "changed_files": changed_files,
        "changed_nodes": sorted(changed.values(), key=lambda c: (c["path"], c["id"])),
        "enclosing_nodes": enclosing,
        "uncatalogued": uncatalogued,
        "new_files": new_files,
        "new_test_files": new_test_files,
        "contracts_touched": contracts,
        "data_touched": data,
        "events_touched": events,
        "rollup": {"features": sorted(feats), "invariants": sorted(invs), "flows": sorted(flows)},
        "stats": {"files": len(changed_files), "changed_nodes": len(changed),
                  "code_nodes": sum(1 for c in changed.values() if c["kind"] == "code"),
                  "test_nodes": sum(1 for c in changed.values() if c["kind"] == "test"),
                  "uncatalogued_files": len(uncatalogued),
                  "uncatalogued_substantive_lines": sum(len(u["substantive_lines"]) for u in uncatalogued), "new_files": len(new_files),
                  "new_test_files": len(new_test_files)},
    }
    txt = dump(res)
    if a.out:
        open(a.out, "w", encoding="utf-8").write(txt)
    else:
        sys.stdout.write(txt)


if __name__ == "__main__":
    main()
