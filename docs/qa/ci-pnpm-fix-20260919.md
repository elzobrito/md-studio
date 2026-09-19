# QA Report: Fix pnpm/action-setup@v4 Version Mismatch

- **Task**: `MD-CI-PNPM-001`
- **Date**: 2026-09-19
- **Author**: agent-impl

## Context
The CI workflow `.github/workflows/ci.yml` failed at step `pnpm/action-setup@v4` with:
```
Error: Multiple versions of pnpm specified:
  - version 9 in the GitHub Action config with the key "version"
  - version pnpm@9.15.4 in the package.json with the key "packageManager"
Remove one of these versions to avoid version mismatch errors like ERR_PNPM_BAD_PM_VERSION
```

## Solution
Removed `with: version: 9` from `.github/workflows/ci.yml`.
`pnpm/action-setup@v4` now natively infers the pinned pnpm version from `package.json` (`pnpm@9.15.4`).

## Verification
- Local checks: `pnpm typecheck`, `pnpm test`, `cargo test` passing 100%.
- Workflow file syntax validated against GitHub Actions schema.
