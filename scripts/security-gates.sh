#!/usr/bin/env bash
set -euo pipefail

for tool in pnpm cargo gitleaks semgrep; do
  command -v "$tool" >/dev/null || { echo "Missing security tool: $tool" >&2; exit 1; }
done

pnpm audit --audit-level high
cargo audit --file src-tauri/Cargo.lock --deny unsound --ignore RUSTSEC-2024-0429
cargo audit --file src-tauri/crates/md-studio-core/Cargo.lock --deny unsound
for target in src src-tauri/src src-tauri/crates/md-studio-core/src tests public .github snap scripts docs package.json pnpm-workspace.yaml vite.config.ts; do
  gitleaks dir --redact "$target"
done
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  gitleaks git --redact .
fi
semgrep scan --config p/security-audit --error --no-git-ignore \
  --exclude node_modules --exclude .pnpm-store --exclude dist --exclude audits \
  --exclude src-tauri/target --exclude .git --exclude .roadmap \
  --exclude .conversation-esaa --exclude .mdstudio .
pnpm typecheck
pnpm test
