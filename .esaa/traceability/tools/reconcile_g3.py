#!/usr/bin/env python3
import glob
import re
import subprocess
import yaml

SC = "b13ad6b84c2f8eb6e8e16a75365b999142027e76"

def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True).stdout

cache = {}
def get_lines(p):
    if p not in cache:
        out = git("show", f"{SC}:{p}")
        cache[p] = out.split("\n")
    return cache[p]

def reconcile_nodes():
    path = ".esaa/traceability/nodes.yaml"
    with open(path, "r", encoding="utf-8") as f:
        docs = yaml.safe_load(f)

    nodes = docs["nodes"]
    reanchored = 0
    failed = []

    for n in nodes:
        a = n["anchor"]
        L = get_lines(a["path"])
        s0, e0 = a["lines"]
        sym = a["symbol"]

        if n["id"] == "HDL-APP-BACKLINK-OPEN-OCCURRENCE":
            sym = '"onOpenBacklinkOccurrence={async (path, line) => {"'
            tok = "onOpenBacklinkOccurrence"
            n["anchor"]["symbol"] = sym
            n["alias"] = a["path"] + "#" + tok
        else:
            tok = sym[1:-1] if sym.startswith('"') else re.split(r"::|\.", sym)[-1]

        if s0 - 1 < len(L) and tok in L[s0 - 1]:
            continue

        matches = [i + 1 for i, line in enumerate(L) if tok in line]
        if matches:
            best = min(matches, key=lambda m: abs(m - s0))
            span = e0 - s0
            new_s = best
            new_e = min(new_s + span, len(L))
            a["lines"] = [new_s, new_e]
            reanchored += 1
        else:
            failed.append((n["id"], a["path"], sym))

    print(f"Re-anchored {reanchored} nodes in nodes.yaml. Failed: {len(failed)}")
    if failed:
        for fid, fp, fs in failed:
            print(f"  FAILED: {fid} in {fp}: {fs}")

    with open(path, "w", encoding="utf-8") as f:
        yaml.dump(docs, f, sort_keys=False, allow_unicode=True)

def fix_evidence_in_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Pattern: path:line (e.g. src/App.tsx:532 or src-tauri/src/commands/mod.rs:28)
    EV_PATTERN = re.compile(r"([\w./-]+\.[\w]+):(\d+)(-\d+)?")
    modified = False

    def replace_ev(match):
        nonlocal modified
        p = match.group(1)
        ln_str = match.group(2)
        end_str = match.group(3) or ""
        ln = int(ln_str)
        L = get_lines(p)
        if not L or ln > len(L):
            return match.group(0)

        # Check if line is empty/blank
        if not L[ln - 1].strip():
            # Search adjacent lines for non-empty line
            for delta in [1, -1, 2, -2, 3, -3]:
                idx = ln - 1 + delta
                if 0 <= idx < len(L) and L[idx].strip():
                    new_ln = idx + 1
                    modified = True
                    return f"{p}:{new_ln}{end_str}"
        return match.group(0)

    new_content = EV_PATTERN.sub(replace_ev, content)
    if new_content != content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Fixed evidence lines in {filepath}")

def main():
    reconcile_nodes()
    for fp in glob.glob(".esaa/traceability/*.yaml") + glob.glob(".esaa/traceability/flows/*.yaml"):
        fix_evidence_in_file(fp)

if __name__ == "__main__":
    main()
