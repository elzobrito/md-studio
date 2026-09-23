#!/usr/bin/env bash
set -euo pipefail

tools_dir=$(mktemp -d)
trap 'rm -rf -- "$tools_dir"' EXIT
python3 -m venv "$tools_dir/venv"
"$tools_dir/venv/bin/python" -m pip install --disable-pip-version-check 'semgrep==1.140.0'
GOBIN="$tools_dir/bin" go install github.com/zricethezav/gitleaks/v8@v8.28.0
if ! cargo audit --version 2>/dev/null | grep -q '0.22.2'; then
  cargo install cargo-audit --version 0.22.2 --locked --root "$tools_dir"
fi
PATH="$tools_dir/venv/bin:$tools_dir/bin:$PATH" bash scripts/security-gates.sh
