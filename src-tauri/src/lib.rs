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
    /// Absolute path to a Markdown file requested via argv on cold start (consumed once).
    pub launch_path: Mutex<Option<String>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let launch_path = md_studio_core::first_existing_markdown_path(std::env::args().skip(1))
        .map(|p| p.to_string_lossy().into_owned());

    if let Some(ref p) = launch_path {
        eprintln!("md-studio: launch path from argv: {p}");
    }

    let state = AppState {
        workspaces: Arc::new(Mutex::new(WorkspaceRegistry::default())),
        watcher: Arc::new(WatcherHub::default()),
        launch_path: Mutex::new(launch_path),
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
            commands::get_launch_path,
            watcher::start_watching,
            watcher::stop_watching,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MD Studio");
}
