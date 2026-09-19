pub mod assets;
pub mod commands;
pub mod contracts;
pub mod diagnostics;
pub mod persistence;
pub mod search;
pub mod watcher;
pub mod workspace;

use parking_lot::Mutex;
use std::sync::Arc;
use workspace::WorkspaceRegistry;

pub struct AppState {
    pub workspaces: Arc<Mutex<WorkspaceRegistry>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = AppState {
        workspaces: Arc::new(Mutex::new(WorkspaceRegistry::default())),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            commands::open_workspace,
            commands::list_entries,
            commands::read_document,
            commands::save_document,
            commands::search_workspace,
            commands::export_html,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MD Studio");
}
