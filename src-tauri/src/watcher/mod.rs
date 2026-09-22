//! Real filesystem watcher (notify) with debounce and path fence.
//! Emits `workspace://change` Tauri events. Never mutates documents.

use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use notify::event::{ModifyKind, RenameMode};
use parking_lot::Mutex;
use serde::Serialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc;
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager, State};

use crate::AppState;

pub const WATCH_EVENT: &str = "workspace://change";
const DEBOUNCE: Duration = Duration::from_millis(300);

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WatchEventDto {
    /// created | modified | removed | renamed
    pub r#type: String,
    pub relative_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from: Option<String>,
    pub workspace_id: String,
}

struct ActiveWatch {
    #[allow(dead_code)]
    workspace_id: String,
    #[allow(dead_code)]
    root: PathBuf,
    stop: Arc<AtomicBool>,
}

#[derive(Default)]
pub struct WatcherHub {
    active: Mutex<Option<ActiveWatch>>,
    /// Tracks internal saves by MD Studio: key is format!("{workspace_id}:{relative_path}"), value is (hash, Instant)
    internal_saves: Mutex<HashMap<String, (String, Instant)>>,
}

impl WatcherHub {
    pub fn stop(&self) {
        if let Some(a) = self.active.lock().take() {
            a.stop.store(true, Ordering::SeqCst);
        }
    }

    /// Registers that MD Studio just saved a file internally with a known SHA-256 hash.
    pub fn register_internal_save(&self, workspace_id: &str, relative_path: &str, hash: &str) {
        let key = format!("{}:{}", workspace_id, relative_path.replace('\\', "/"));
        let mut map = self.internal_saves.lock();
        // Opportunistic cleanup of entries older than 5 seconds
        map.retain(|_, (_, time)| time.elapsed() < Duration::from_secs(5));
        map.insert(key, (hash.to_string(), Instant::now()));
    }

    /// Checks if a filesystem event corresponds to an internal save with matching hash.
    /// If it matches, the entry is consumed and returns true (suppressing false conflict).
    pub fn should_suppress(&self, workspace_id: &str, relative_path: &str, full_path: &Path) -> bool {
        let key = format!("{}:{}", workspace_id, relative_path.replace('\\', "/"));
        let expected_hash = {
            let map = self.internal_saves.lock();
            match map.get(&key) {
                Some((hash, time)) if time.elapsed() < Duration::from_secs(5) => Some(hash.clone()),
                _ => None,
            }
        };

        if let Some(expected) = expected_hash {
            if let Ok((_, current_hash, _)) = crate::persistence::read_file(full_path) {
                if current_hash == expected {
                    self.internal_saves.lock().remove(&key);
                    return true;
                }
            }
        }
        false
    }
}

fn relativize(root: &Path, full: &Path) -> Option<String> {
    let root_c = dunce::canonicalize(root).ok()?;
    let full_c = if full.exists() {
        dunce::canonicalize(full).ok()?
    } else {
        // deleted path: canonicalize parent + join name
        let parent = dunce::canonicalize(full.parent()?).ok()?;
        parent.join(full.file_name()?)
    };
    let rel = full_c.strip_prefix(&root_c).ok()?;
    let s = rel.to_string_lossy().replace('\\', "/");
    if s.is_empty() || s.contains("..") {
        return None;
    }
    Some(s)
}

fn kind_label(kind: &EventKind) -> Option<&'static str> {
    match kind {
        EventKind::Create(_) => Some("created"),
        EventKind::Modify(ModifyKind::Name(RenameMode::To)) => Some("renamed"),
        EventKind::Modify(ModifyKind::Name(RenameMode::From)) => Some("renamed"),
        EventKind::Modify(ModifyKind::Name(RenameMode::Both)) => Some("renamed"),
        EventKind::Modify(_) => Some("modified"),
        EventKind::Remove(_) => Some("removed"),
        _ => None,
    }
}

fn spawn_watcher(
    app: AppHandle,
    workspace_id: String,
    root: PathBuf,
    stop: Arc<AtomicBool>,
    hub: Arc<WatcherHub>,
) -> Result<(), String> {
    let (tx, rx) = mpsc::channel::<Event>();
    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(ev) = res {
                let _ = tx.send(ev);
            }
        },
        notify::Config::default(),
    )
    .map_err(|e| e.to_string())?;

    watcher
        .watch(&root, RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    thread::Builder::new()
        .name("md-studio-watcher".into())
        .spawn(move || {
            // Keep watcher alive in this thread.
            let _watcher = watcher;
            let mut pending: HashMap<String, WatchEventDto> = HashMap::new();
            let mut last_push = Instant::now();

            loop {
                if stop.load(Ordering::SeqCst) {
                    break;
                }
                match rx.recv_timeout(Duration::from_millis(50)) {
                    Ok(event) => {
                        let Some(label) = kind_label(&event.kind) else { continue };
                        let paths = event.paths;
                        if paths.is_empty() {
                            continue;
                        }
                        if label == "renamed" && paths.len() >= 2 {
                            let from = relativize(&root, &paths[0]);
                            let to = relativize(&root, &paths[1]);
                            if let (Some(from), Some(to)) = (from, to) {
                                pending.insert(
                                    to.clone(),
                                    WatchEventDto {
                                        r#type: "renamed".into(),
                                        relative_path: to,
                                        from: Some(from),
                                        workspace_id: workspace_id.clone(),
                                    },
                                );
                            }
                        } else {
                            for p in paths {
                                if let Some(rel) = relativize(&root, &p) {
                                    pending.insert(
                                        rel.clone(),
                                        WatchEventDto {
                                            r#type: label.into(),
                                            relative_path: rel,
                                            from: None,
                                            workspace_id: workspace_id.clone(),
                                        },
                                    );
                                }
                            }
                        }
                    }
                    Err(mpsc::RecvTimeoutError::Timeout) => {}
                    Err(mpsc::RecvTimeoutError::Disconnected) => break,
                }

                if !pending.is_empty() && last_push.elapsed() >= DEBOUNCE {
                    let batch: Vec<_> = pending.drain().map(|(_, v)| v).collect();
                    last_push = Instant::now();
                    for dto in batch {
                        let full_path = root.join(&dto.relative_path);
                        if hub.should_suppress(&dto.workspace_id, &dto.relative_path, &full_path) {
                            continue;
                        }
                        apply_watch_to_engine(&app, &dto);
                        let _ = app.emit(WATCH_EVENT, dto);
                    }
                }
            }

            // flush remaining
            for (_, dto) in pending.drain() {
                let full_path = root.join(&dto.relative_path);
                if hub.should_suppress(&dto.workspace_id, &dto.relative_path, &full_path) {
                    continue;
                }
                apply_watch_to_engine(&app, &dto);
                let _ = app.emit(WATCH_EVENT, dto);
            }
        })
        .map_err(|e| e.to_string())?;

    Ok(())
}

fn apply_watch_to_engine(app: &AppHandle, dto: &WatchEventDto) {
    let Some(state) = app.try_state::<crate::AppState>() else {
        return;
    };
    let engine = state.metadata_engine.lock().as_ref().cloned();
    let Some(engine) = engine else {
        return;
    };
    engine.apply_external_change(
        &dto.r#type,
        Path::new(&dto.relative_path),
        dto.from.as_deref().map(Path::new),
    );
}

#[tauri::command]
pub fn start_watching(
    workspace_id: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let root = {
        let reg = state.workspaces.lock();
        let ws = reg
            .get(&workspace_id)
            .ok_or_else(|| "workspace not found".to_string())?;
        ws.root.clone()
    };

    // Replace any previous watch.
    state.watcher.stop();
    let stop = Arc::new(AtomicBool::new(false));
    spawn_watcher(
        app,
        workspace_id.clone(),
        root.clone(),
        stop.clone(),
        state.watcher.clone(),
    )?;
    *state.watcher.active.lock() = Some(ActiveWatch {
        workspace_id,
        root,
        stop,
    });
    Ok(())
}

#[tauri::command]
pub fn stop_watching(state: State<'_, AppState>) -> Result<(), String> {
    state.watcher.stop();
    Ok(())
}

/// Pure helpers for unit tests (path fence + debounce coalescing key).
pub fn fence_relative(root: &Path, candidate: &Path) -> Option<String> {
    relativize(root, candidate)
}

pub fn coalesce_key(ev: &WatchEventDto) -> String {
    format!("{}:{}", ev.r#type, ev.relative_path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn fence_rejects_outside() {
        let dir = tempdir().unwrap();
        let inside = dir.path().join("a.md");
        fs::write(&inside, "x").unwrap();
        let outside = dir.path().parent().unwrap().join("escape.md");
        assert!(fence_relative(dir.path(), &inside).is_some());
        // outside path should not strip_prefix successfully
        assert!(fence_relative(dir.path(), &outside).is_none());
    }

    #[test]
    fn fence_normalizes_relative() {
        let dir = tempdir().unwrap();
        let nested = dir.path().join("docs");
        fs::create_dir_all(&nested).unwrap();
        let f = nested.join("readme.md");
        fs::write(&f, "hi").unwrap();
        let rel = fence_relative(dir.path(), &f).unwrap();
        assert_eq!(rel, "docs/readme.md");
    }

    #[test]
    fn coalesce_key_stable() {
        let ev = WatchEventDto {
            r#type: "modified".into(),
            relative_path: "a.md".into(),
            from: None,
            workspace_id: "w".into(),
        };
        assert_eq!(coalesce_key(&ev), "modified:a.md");
    }

    #[test]
    fn internal_save_suppression_flow() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("doc.md");
        let content = "Hello world";
        fs::write(&file_path, content).unwrap();

        let hub = WatcherHub::default();
        let (buf, hash, _) = crate::persistence::read_file(&file_path).unwrap();
        assert_eq!(buf, content);

        // Register internal save
        hub.register_internal_save("ws-1", "doc.md", &hash);

        // First check should suppress and consume the expected hash
        assert!(hub.should_suppress("ws-1", "doc.md", &file_path));

        // Subsequent check should NOT suppress because the entry was consumed
        assert!(!hub.should_suppress("ws-1", "doc.md", &file_path));

        // Register again with a mismatching hash (simulating external modification)
        hub.register_internal_save("ws-1", "doc.md", "different-hash");
        assert!(!hub.should_suppress("ws-1", "doc.md", &file_path));
    }
}
