use crate::AppState;
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportCapabilityResponse {
    pub ok: bool,
    pub available: bool,
    pub version: Option<String>,
    pub formats: Vec<String>,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ConvertRequest {
    pub source_path: String,
    pub format_hint: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CommitImportRequest {
    pub workspace_id: String,
    pub relative_path: String,
    pub content: String,
    pub overwrite: bool,
}

fn get_bridge_path() -> PathBuf {
    // Procura o script do bridge relativo ao binário ou cwd
    let cwd_candidate = PathBuf::from("src-tauri/scripts/markitdown_bridge.py");
    if cwd_candidate.exists() {
        return cwd_candidate;
    }
    PathBuf::from("scripts/markitdown_bridge.py")
}

#[tauri::command]
pub fn import_check_capabilities() -> Result<serde_json::Value, String> {
    let bridge = get_bridge_path();
    let output = Command::new("python3")
        .arg(&bridge)
        .arg("--check")
        .output();

    match output {
        Ok(out) => {
            if out.status.success() {
                let res: serde_json::Value = serde_json::from_slice(&out.stdout)
                    .unwrap_or_else(|_| serde_json::json!({ "ok": true, "available": false }));
                Ok(res)
            } else {
                Ok(serde_json::json!({
                    "ok": true,
                    "available": false,
                    "error": String::from_utf8_lossy(&out.stderr).to_string()
                }))
            }
        }
        Err(e) => Ok(serde_json::json!({
            "ok": true,
            "available": false,
            "error": format!("Python não encontrado no ambiente: {}", e)
        })),
    }
}

#[tauri::command]
pub fn import_convert_source(source_path: String, format_hint: Option<String>) -> Result<serde_json::Value, String> {
    let bridge = get_bridge_path();
    let mut child = Command::new("python3")
        .arg(&bridge)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Falha ao iniciar conversor local: {}", e))?;

    let payload = serde_json::json!({
        "action": "convert",
        "source_path": source_path,
        "format_hint": format_hint
    });

    if let Some(mut stdin) = child.stdin.take() {
        let json_bytes = serde_json::to_vec(&payload).map_err(|e| e.to_string())?;
        stdin.write_all(&json_bytes).map_err(|e| e.to_string())?;
    }

    let output = child.wait_with_output().map_err(|e| format!("Erro aguardando conversor: {}", e))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Falha no processo do conversor: {}", stderr));
    }

    let parsed: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Resposta inválida do conversor: {}", e))?;

    Ok(parsed)
}

#[tauri::command]
pub fn import_commit_document(
    req: CommitImportRequest,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let reg = state.workspaces.lock();
    let ws = reg.get(&req.workspace_id).ok_or("Workspace não encontrado")?;

    let saved_path = md_studio_core::importer::commit_import(
        &ws.root,
        &req.relative_path,
        &req.content,
        req.overwrite,
    )
    .map_err(|e| e.to_string())?;

    // Registra no WatcherHub para não disparar falso positivo
    let hash = md_studio_core::persistence::content_hash(req.content.as_bytes());
    state.watcher.register_internal_save(&req.workspace_id, &req.relative_path, &hash);

    // Reindexar arquivo de forma resiliente
    if let Some(engine) = state.metadata_engine.lock().as_ref().cloned() {
        let _ = engine.reindex_file(&saved_path);
        if let Ok(idx) = engine.index.lock() {
            let _ = md_studio_core::index::save_index(&idx, &engine.root);
        }
    }

    Ok(serde_json::json!({
        "ok": true,
        "relativePath": req.relative_path,
        "fullPath": saved_path.display().to_string()
    }))
}
