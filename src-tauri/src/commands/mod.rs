use crate::contracts::{DocumentSnapshot, FileEntry, SearchResult, WorkspaceDescriptor};
use crate::persistence::{atomic_save, atomic_write_bytes, content_hash, read_file};
use crate::workspace::WorkspaceError;
use crate::AppState;
use serde::Deserialize;
use std::fs;
use std::path::PathBuf;
use tauri::State;
use walkdir::WalkDir;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveDocumentRequest {
    pub workspace_id: String,
    pub relative_path: String,
    pub expected_hash: String,
    pub content: String,
}

pub mod metadata;
pub mod formatter;

fn map_ws_err(e: WorkspaceError) -> String {
    e.to_string()
}

#[tauri::command]
pub fn open_workspace(path: String, state: State<'_, AppState>) -> Result<WorkspaceDescriptor, String> {
    let mut reg = state.workspaces.lock();
    let ws = reg
        .open(PathBuf::from(path).as_path())
        .map_err(map_ws_err)?;
    // Drop previous workspaces so only the active root is retained.
    reg.retain(&ws.id);

    // Inicializar ou carregar índice de metadados do workspace
    let engine = md_studio_core::index::ReindexEngine::new(ws.root.clone());
    if let Ok(Some(persisted)) = md_studio_core::index::load_index(&ws.root) {
        if let Ok(mut idx) = engine.index.lock() {
            *idx = persisted;
        }
        engine.rebuild_backlinks();
    } else {
        let _ = engine.full_reindex();
        if let Ok(idx) = engine.index.lock() {
            let _ = md_studio_core::index::save_index(&idx, &ws.root);
        }
    }
    *state.metadata_engine.lock() = Some(engine);

    Ok(WorkspaceDescriptor {
        id: ws.id,
        root_label: ws.root.display().to_string(),
        kind: ws.kind,
    })
}

#[tauri::command]
pub fn list_entries(
    workspace_id: String,
    relative_path: String,
    state: State<'_, AppState>,
) -> Result<Vec<FileEntry>, String> {
    let reg = state.workspaces.lock();
    let dir = reg
        .resolve(&workspace_id, &relative_path)
        .map_err(map_ws_err)?;
    if !dir.is_dir() {
        return Ok(vec![]);
    }
    let mut out = vec![];
    for ent in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let ent = ent.map_err(|e| e.to_string())?;
        let meta = ent.metadata().map_err(|e| e.to_string())?;
        let name = ent.file_name().to_string_lossy().to_string();
        let rel = if relative_path.is_empty() {
            name.clone()
        } else {
            format!("{relative_path}/{name}")
        };
        out.push(FileEntry {
            name,
            relative_path: rel,
            kind: if meta.is_dir() {
                "dir".into()
            } else {
                "file".into()
            },
            size: if meta.is_file() { Some(meta.len()) } else { None },
        });
    }
    out.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(out)
}

#[tauri::command]
pub fn read_document(
    workspace_id: String,
    path: String,
    state: State<'_, AppState>,
) -> Result<DocumentSnapshot, String> {
    let reg = state.workspaces.lock();
    let full = reg.resolve(&workspace_id, &path).map_err(map_ws_err)?;
    let (content, hash, mtime) = read_file(&full).map_err(|e| e.to_string())?;
    Ok(DocumentSnapshot {
        workspace_id,
        relative_path: path,
        content,
        encoding: "utf-8".into(),
        mtime_ms: mtime,
        content_hash: hash,
        version: 1,
    })
}

#[tauri::command]
pub fn save_document(
    req: SaveDocumentRequest,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let reg = state.workspaces.lock();
    let full = reg
        .resolve(&req.workspace_id, &req.relative_path)
        .map_err(map_ws_err)?;
    match atomic_save(&full, &req.expected_hash, &req.content) {
        Ok(hash) => {
            // Reindexar arquivo salvo de forma resiliente (falha de índice não bloqueia save)
            if let Some(engine) = state.metadata_engine.lock().as_ref().cloned() {
                let _ = engine.reindex_file(&full);
                if let Ok(idx) = engine.index.lock() {
                    let _ = md_studio_core::index::save_index(&idx, &engine.root);
                }
            }

            let snap = DocumentSnapshot {
                workspace_id: req.workspace_id,
                relative_path: req.relative_path,
                content: req.content,
                encoding: "utf-8".into(),
                mtime_ms: 0,
                content_hash: hash,
                version: 2,
            };
            Ok(serde_json::json!({ "ok": true, "snapshot": snap }))
        }
        Err(crate::persistence::SaveError::HashMismatch) => Ok(serde_json::json!({
            "ok": false,
            "code": "HashMismatch",
            "message": "Arquivo alterado no disco"
        })),
        Err(e) => Ok(serde_json::json!({
            "ok": false,
            "code": "IoError",
            "message": e.to_string()
        })),
    }
}

#[tauri::command]
pub fn search_workspace(
    workspace_id: String,
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<SearchResult>, String> {
    if query.trim().is_empty() {
        return Ok(vec![]);
    }
    let reg = state.workspaces.lock();
    let ws = reg.get(&workspace_id).ok_or_else(|| "not found".to_string())?;
    let mut out = vec![];
    for entry in WalkDir::new(&ws.root).into_iter().filter_map(|e| e.ok()) {
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) != Some("md") {
            continue;
        }
        let Ok(text) = fs::read_to_string(path) else { continue };
        for (i, line) in text.lines().enumerate() {
            if line.contains(&query) {
                let rel = path
                    .strip_prefix(&ws.root)
                    .unwrap_or(path)
                    .to_string_lossy()
                    .to_string();
                out.push(SearchResult {
                    relative_path: rel,
                    line: (i + 1) as u32,
                    preview: line.chars().take(200).collect(),
                });
                if out.len() >= 200 {
                    return Ok(out);
                }
            }
        }
    }
    let _ = content_hash(query.as_bytes());
    Ok(out)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportHtmlRequest {
    /// Pre-rendered, sanitized HTML document from the frontend preview pipeline.
    pub html: String,
    pub destination: String,
    /// When false, refuse to clobber an existing file (FE must confirm overwrite).
    pub overwrite: bool,
}

#[tauri::command]
pub fn export_html(req: ExportHtmlRequest) -> Result<(), String> {
    let dest = PathBuf::from(&req.destination);
    if !dest.is_absolute() {
        return Err("destination must be an absolute path".into());
    }
    if dest.exists() && !req.overwrite {
        return Err("ExportTargetExists".into());
    }
    atomic_write_bytes(&dest, req.html.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod export_tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn export_writes_rendered_html_not_pre_stub() {
        let dir = tempdir().unwrap();
        let dest = dir.path().join("out.html");
        let html = "<!DOCTYPE html><html><body><h1>Title</h1><p>Hi</p></body></html>".to_string();
        export_html(ExportHtmlRequest {
            html: html.clone(),
            destination: dest.to_string_lossy().to_string(),
            overwrite: false,
        })
        .unwrap();
        let got = fs::read_to_string(&dest).unwrap();
        assert!(got.contains("<h1>Title</h1>"));
        assert!(!got.contains("<pre>"));
    }

    #[test]
    fn export_refuses_overwrite_without_flag() {
        let dir = tempdir().unwrap();
        let dest = dir.path().join("out.html");
        fs::write(&dest, "old").unwrap();
        let err = export_html(ExportHtmlRequest {
            html: "<html></html>".into(),
            destination: dest.to_string_lossy().to_string(),
            overwrite: false,
        })
        .unwrap_err();
        assert_eq!(err, "ExportTargetExists");
    }

    #[test]
    fn export_overwrite_when_allowed() {
        let dir = tempdir().unwrap();
        let dest = dir.path().join("out.html");
        fs::write(&dest, "old").unwrap();
        export_html(ExportHtmlRequest {
            html: "<html><body>new</body></html>".into(),
            destination: dest.to_string_lossy().to_string(),
            overwrite: true,
        })
        .unwrap();
        assert!(fs::read_to_string(&dest).unwrap().contains("new"));
    }
}

/// Return (and clear) the Markdown path passed on process argv at cold start, if any.
#[tauri::command]
pub fn get_launch_path(state: State<'_, AppState>) -> Option<String> {
    state.launch_path.lock().take()
}

#[tauri::command]
pub async fn close_splash(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;
    if let Some(splash) = app.get_webview_window("splashscreen") {
        let _ = splash.close();
    }
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.show();
        let _ = main.set_focus();
    }
    Ok(())
}

