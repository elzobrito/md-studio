# Desktop boundaries — MD Studio

## Trust zones
1. **OS filesystem** — only accessible via Rust backend.
2. **Workspace vault** — authorized root + relative paths; opaque `WorkspaceId`.
3. **Webview frontend** — UI only; no generic FS access.
4. **Render adapters** — KaTeX/Mermaid isolated; sanitized HTML only.

## IPC contract
Frontend sends relative paths + workspace_id. Backend canonicalizes, checks containment, rejects `..`, absolute injection, and outbound symlinks.

## DocumentSnapshot
`{ path, content, encoding, mtime_ms, content_hash, version }`

## Save
`save_document(workspace_id, path, expected_hash, content)` → success snapshot or `HashMismatch` conflict.
