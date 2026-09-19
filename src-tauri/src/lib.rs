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
use watcher::WatcherHub;
use workspace::WorkspaceRegistry;

pub struct AppState {
    pub workspaces: Arc<Mutex<WorkspaceRegistry>>,
    pub watcher: Arc<WatcherHub>,
    pub metadata_engine: Arc<Mutex<Option<md_studio_core::index::ReindexEngine>>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = AppState {
        workspaces: Arc::new(Mutex::new(WorkspaceRegistry::default())),
        watcher: Arc::new(WatcherHub::default()),
        metadata_engine: Arc::new(Mutex::new(None)),
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
            commands::metadata::get_workspace_stats,
            commands::metadata::get_document_metadata,
            commands::metadata::get_all_documents,
            commands::metadata::trigger_reindex,
            commands::metadata::get_wiki_links_for,
            commands::metadata::get_tags,
            watcher::start_watching,
            watcher::stop_watching,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MD Studio");
}
