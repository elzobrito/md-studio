use crate::contracts::{DocumentSnapshot, FileEntry, SearchResult, WorkspaceDescriptor};
use crate::persistence::{atomic_write_bytes, content_hash, read_file};
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
    #[serde(default)]
    pub reason: Option<String>,
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
    let ws_root = reg.get(&req.workspace_id).map(|w| w.root.clone());
    let full = reg
        .resolve(&req.workspace_id, &req.relative_path)
        .map_err(map_ws_err)?;

    match md_studio_core::persistence::atomic_save_with_previous(&full, &req.expected_hash, &req.content) {
        Ok(outcome) => {
            let hash = outcome.new_hash;

            // Histórico local (Time Machine): salvar snapshot da versão anterior substituída
            if let (Some(root), Some(prev)) = (ws_root, outcome.previous) {
                let reason = req.reason.unwrap_or_else(|| "before-manual-save".to_string());
                let now_ms = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_millis() as u64)
                    .unwrap_or(0);
                // Falha do histórico nunca impede o save principal (spec 026 regra #39)
                let _ = md_studio_core::history::HistoryStore::record_snapshot(
                    &root,
                    &req.relative_path,
                    &prev.content,
                    &reason,
                    now_ms,
                );
            }

            // Registra a escrita interna para suprimir falso positivo no WatcherHub
            state.watcher.register_internal_save(&req.workspace_id, &req.relative_path, &hash);

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
pub fn list_history_entries(
    workspace_id: String,
    relative_path: String,
    state: State<'_, AppState>,
) -> Result<Vec<md_studio_core::history::HistoryEntry>, String> {
    let reg = state.workspaces.lock();
    let ws = reg.get(&workspace_id).ok_or_else(|| "workspace not found".to_string())?;
    md_studio_core::history::HistoryStore::list_entries(&ws.root, &relative_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_history_snapshot(
    workspace_id: String,
    relative_path: String,
    hash: String,
    state: State<'_, AppState>,
) -> Result<md_studio_core::history::HistorySnapshot, String> {
    let reg = state.workspaces.lock();
    let ws = reg.get(&workspace_id).ok_or_else(|| "workspace not found".to_string())?;
    md_studio_core::history::HistoryStore::get_snapshot(&ws.root, &relative_path, &hash)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn restore_history_entry(
    workspace_id: String,
    relative_path: String,
    hash: String,
    expected_current_hash: String,
    state: State<'_, AppState>,
) -> Result<DocumentSnapshot, String> {
    let reg = state.workspaces.lock();
    let ws = reg.get(&workspace_id).ok_or_else(|| "workspace not found".to_string())?;
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    let restored = md_studio_core::history::HistoryStore::restore_entry(
        &ws.root,
        &relative_path,
        &hash,
        &expected_current_hash,
        now_ms,
    )
    .map_err(|e| e.to_string())?;

    // Registra a escrita interna para suprimir falso positivo no WatcherHub
    state.watcher.register_internal_save(&workspace_id, &relative_path, &restored.content_hash);

    // Reindexar arquivo restaurado
    if let Some(engine) = state.metadata_engine.lock().as_ref().cloned() {
        let full = ws.root.join(&relative_path);
        let _ = engine.reindex_file(&full);
        if let Ok(idx) = engine.index.lock() {
            let _ = md_studio_core::index::save_index(&idx, &engine.root);
        }
    }

    Ok(DocumentSnapshot {
        workspace_id,
        relative_path,
        content: restored.content,
        encoding: "utf-8".into(),
        mtime_ms: restored.timestamp_ms,
        content_hash: restored.content_hash,
        version: 3,
    })
}

#[tauri::command]
pub fn git_is_repository(workspace_id: String, state: State<'_, AppState>) -> Result<bool, String> {
    let reg = state.workspaces.lock();
    let Some(ws) = reg.get(&workspace_id) else { return Ok(false); };
    Ok(md_studio_core::git::GitProvider::is_repository(&ws.root))
}

#[tauri::command]
pub fn git_get_status(
    workspace_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<md_studio_core::git::GitFileStatus>, String> {
    let reg = state.workspaces.lock();
    let Some(ws) = reg.get(&workspace_id) else { return Ok(vec![]); };
    if !md_studio_core::git::GitProvider::is_repository(&ws.root) {
        return Ok(vec![]);
    }
    md_studio_core::git::GitProvider::get_status(&ws.root).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_get_file_diff(
    workspace_id: String,
    relative_path: String,
    state: State<'_, AppState>,
) -> Result<md_studio_core::git::FileDiffGutter, String> {
    let reg = state.workspaces.lock();
    let Some(ws) = reg.get(&workspace_id) else {
        return Ok(md_studio_core::git::FileDiffGutter::default());
    };
    if !md_studio_core::git::GitProvider::is_repository(&ws.root) {
        return Ok(md_studio_core::git::FileDiffGutter::default());
    }
    md_studio_core::git::GitProvider::get_file_diff(&ws.root, &relative_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_get_file_history(
    workspace_id: String,
    relative_path: String,
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> Result<Vec<md_studio_core::git::GitCommitSummary>, String> {
    let reg = state.workspaces.lock();
    let Some(ws) = reg.get(&workspace_id) else { return Ok(vec![]); };
    if !md_studio_core::git::GitProvider::is_repository(&ws.root) {
        return Ok(vec![]);
    }
    md_studio_core::git::GitProvider::get_file_history(&ws.root, &relative_path, limit.unwrap_or(20))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_get_file_at_commit(
    workspace_id: String,
    relative_path: String,
    commit_hash: Option<String>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let reg = state.workspaces.lock();
    let ws = reg.get(&workspace_id).ok_or_else(|| "workspace not found".to_string())?;
    md_studio_core::git::GitProvider::get_file_at_commit(&ws.root, &relative_path, commit_hash.as_deref())
        .map_err(|e| e.to_string())
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
                    .replace('\\', "/");
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportEpubRequest {
    pub workspace_id: Option<String>,
    pub destination: String,
    pub overwrite: bool,
    pub payload: md_studio_core::export::EpubExportPayload,
}

fn resolve_workspace_root(state: &AppState, workspace_id: Option<&str>) -> Result<PathBuf, String> {
    let Some(id) = workspace_id.map(str::trim).filter(|id| !id.is_empty()) else {
        return Err("workspace required".into());
    };
    let reg = state.workspaces.lock();
    reg.get(id)
        .map(|ws| ws.root.clone())
        .ok_or_else(|| "workspace not found".into())
}

fn export_epub_in(
    req: ExportEpubRequest,
    state: &AppState,
) -> Result<md_studio_core::export::EpubExportResult, String> {
    let dest = PathBuf::from(&req.destination);
    if !dest.is_absolute() {
        return Err("destination must be an absolute path".into());
    }
    if dest.exists() && !req.overwrite {
        return Err("ExportTargetExists".into());
    }
    let root = resolve_workspace_root(state, req.workspace_id.as_deref())?;
    md_studio_core::export::build_epub(&req.payload, &root, &dest).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn export_epub(
    req: ExportEpubRequest,
    state: State<'_, AppState>,
) -> Result<md_studio_core::export::EpubExportResult, String> {
    export_epub_in(req, &state)
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

    fn test_state() -> crate::AppState {
        crate::AppState {
            workspaces: std::sync::Arc::new(parking_lot::Mutex::new(
                crate::workspace::WorkspaceRegistry::default(),
            )),
            watcher: std::sync::Arc::new(crate::watcher::WatcherHub::default()),
            metadata_engine: std::sync::Arc::new(parking_lot::Mutex::new(None)),
            launch_path: std::sync::Arc::new(parking_lot::Mutex::new(None)),
        }
    }

    fn sample_payload(image: Option<String>) -> md_studio_core::export::EpubExportPayload {
        use md_studio_core::export::{EpubExportPayload, EpubMetadata};
        EpubExportPayload {
            metadata: EpubMetadata {
                title: "Arquitetura".into(),
                ..EpubMetadata::default()
            },
            body_html: "<h1>Intro</h1>".into(),
            mermaid_slots: vec![],
            image_refs: image.into_iter().collect(),
        }
    }

    #[test]
    fn export_epub_request_deserializes_camel_case() {
        let raw = r#"{
            "workspaceId": "ws-1",
            "destination": "/tmp/livro.epub",
            "overwrite": false,
            "payload": {
                "metadata": {"title": "Arquitetura"},
                "bodyHtml": "<p>Oi</p>",
                "imageRefs": ["/tmp/figura.png"]
            }
        }"#;
        let req: ExportEpubRequest = serde_json::from_str(raw).unwrap();
        assert_eq!(req.workspace_id.as_deref(), Some("ws-1"));
        assert_eq!(req.destination, "/tmp/livro.epub");
        assert!(!req.overwrite);
        assert_eq!(req.payload.body_html, "<p>Oi</p>");
        assert_eq!(req.payload.image_refs, vec!["/tmp/figura.png".to_string()]);
    }

    #[test]
    fn export_epub_refuses_non_absolute_destination() {
        let state = test_state();
        let err = export_epub_in(
            ExportEpubRequest {
                workspace_id: Some("ws".into()),
                destination: "relative/path.epub".into(),
                overwrite: false,
                payload: sample_payload(None),
            },
            &state,
        )
        .unwrap_err();
        assert_eq!(err, "destination must be an absolute path");
    }

    #[test]
    fn export_epub_requires_known_workspace_and_rejects_escape() {
        let root = tempdir().unwrap();
        let outside = tempdir().unwrap();
        let state = test_state();
        let ws = state.workspaces.lock().open(root.path()).unwrap();
        let dest = outside.path().join("livro.epub");
        let missing = export_epub_in(
            ExportEpubRequest {
                workspace_id: None,
                destination: dest.to_string_lossy().into_owned(),
                overwrite: false,
                payload: sample_payload(None),
            },
            &state,
        )
        .unwrap_err();
        assert_eq!(missing, "workspace required");
        assert!(!dest.exists());

        let unknown = export_epub_in(
            ExportEpubRequest {
                workspace_id: Some("ausente".into()),
                destination: dest.to_string_lossy().into_owned(),
                overwrite: false,
                payload: sample_payload(None),
            },
            &state,
        )
        .unwrap_err();
        assert_eq!(unknown, "workspace not found");

        let secret = outside.path().join("secret.png");
        fs::write(&secret, b"secret").unwrap();
        let fenced = export_epub_in(
            ExportEpubRequest {
                workspace_id: Some(ws.id.clone()),
                destination: dest.to_string_lossy().into_owned(),
                overwrite: false,
                payload: sample_payload(Some(secret.to_string_lossy().into_owned())),
            },
            &state,
        )
        .unwrap_err();
        assert!(fenced.contains("outside the workspace"));
        assert!(!dest.exists());
    }

    #[test]
    fn export_epub_writes_package_and_refuses_clobber() {
        let root = tempdir().unwrap();
        let figure = root.path().join("figura.png");
        fs::write(&figure, b"\x89PNG-local").unwrap();
        let state = test_state();
        let ws = state.workspaces.lock().open(root.path()).unwrap();
        let dest = root.path().join("livro.epub");
        let result = export_epub_in(
            ExportEpubRequest {
                workspace_id: Some(ws.id.clone()),
                destination: dest.to_string_lossy().into_owned(),
                overwrite: false,
                payload: sample_payload(Some(figure.to_string_lossy().into_owned())),
            },
            &state,
        )
        .unwrap();
        assert_eq!(result.image_count, 1);
        assert_eq!(result.mermaid_count, 0);
        assert!(dest.is_file());
        assert!(result.output_path.ends_with("livro.epub"));

        let err = export_epub_in(
            ExportEpubRequest {
                workspace_id: Some(ws.id),
                destination: dest.to_string_lossy().into_owned(),
                overwrite: false,
                payload: sample_payload(None),
            },
            &state,
        )
        .unwrap_err();
        assert_eq!(err, "ExportTargetExists");
        assert!(fs::read(&dest).unwrap().windows(4).any(|chunk| chunk == b"PK\x03\x04"));
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

