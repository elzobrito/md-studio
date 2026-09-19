# Follow-up: single-instance open path

## Status

Deferred from `MDS-PROD-OPEN-FILE-001`.

## Cold start (done)

On a fresh process, argv Markdown paths are collected in Rust (`launch::first_existing_markdown_path`)
and exposed once via `get_launch_path`. The frontend opens the file with the existing
`openFile` / `open_workspace` fence.

## Already running

If MD Studio is already open, a second launch from the file manager typically starts another
process (or is ignored by the desktop), and the path is **not** forwarded to the first window.

## Suggested fix

Add `tauri-plugin-single-instance` and, in its callback, parse argv the same way and emit
`app://open-path` (or re-set launch state + event) so the existing frontend open flow runs.

## Why deferred

Cold start unblocks the primary OS “Open with MD Studio” case. Wiring single-instance touches
lifecycle, focus, and possibly DBus/XDG activation — better as a dedicated small task.
