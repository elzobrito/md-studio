# Threat model — MD Studio v1

## Assets
- Local Markdown content and assets
- Integrity of files on disk
- Webview process isolation

## Threats
| Threat | Mitigation |
|--------|------------|
| Path traversal / symlink escape | Canonicalize + containment in Rust |
| XSS via Markdown/HTML/SVG | Unified sanitize + no raw DOM |
| Remote content exfil | Block remote images/scripts by default |
| Silent overwrite | Hash-gated atomic save |
| Supply chain CDN | No remote scripts; packaged assets only |
| Plugin JS | Not supported in v1 |

## Trust assumptions
Single-user local machine; OS account boundary is the primary trust root.
