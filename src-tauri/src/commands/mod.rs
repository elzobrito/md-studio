use crate::contracts::{DocumentSnapshot, FileEntry, SearchResult, WorkspaceDescriptor};
use crate::persistence::{atomic_save, content_hash, read_file};
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

#[tauri::command]
pub fn export_html(
    workspace_id: String,
    path: String,
    destination: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let reg = state.workspaces.lock();
    let full = reg.resolve(&workspace_id, &path).map_err(map_ws_err)?;
    let (content, _, _) = read_file(&full).map_err(|e| e.to_string())?;
    // Backend writes raw markdown wrapped; full HTML rendering is frontend responsibility.
    let html = format!(
        "<!DOCTYPE html><html><head><meta charset=utf-8><title>export</title></head><body><pre>{}</pre></body></html>",
        html_escape(&content)
    );
    let dest = PathBuf::from(destination);
    // destination must be absolute path chosen by dialog (trusted sink)
    fs::write(dest, html).map_err(|e| e.to_string())
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}
