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
    pub launch_path: Arc<Mutex<Option<String>>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let launch_path = md_studio_core::first_existing_markdown_path(std::env::args().skip(1))
        .map(|p| p.to_string_lossy().into_owned());

    let launch_path_state = Arc::new(Mutex::new(launch_path));

    let state = AppState {
        workspaces: Arc::new(Mutex::new(WorkspaceRegistry::default())),
        watcher: Arc::new(WatcherHub::default()),
        metadata_engine: Arc::new(Mutex::new(None)),
        launch_path: launch_path_state.clone(),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            use tauri::{Emitter, Manager};
            if let Some(path) = md_studio_core::first_existing_markdown_path(args.iter().skip(1)) {
                let path_str = path.to_string_lossy().into_owned();
                let _ = app.emit("app://open-file", serde_json::json!({ "path": path_str }));
            }
            if let Some(splash) = app.get_webview_window("splashscreen") {
                let _ = splash.close();
            }
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .setup(|app| {
            use tauri::Manager;
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(6));
                if let Some(splash) = handle.get_webview_window("splashscreen") {
                    let _ = splash.close();
                }
                if let Some(main) = handle.get_webview_window("main") {
                    let _ = main.show();
                    let _ = main.set_focus();
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::open_workspace,
            commands::list_entries,
            commands::read_document,
            commands::save_document,
            commands::search_workspace,
            commands::export_html,
            commands::get_launch_path,
            commands::metadata::get_workspace_stats,
            commands::metadata::get_document_metadata,
            commands::metadata::get_all_documents,
            commands::metadata::trigger_reindex,
            commands::metadata::get_wiki_links_for,
            commands::metadata::get_tags,
            commands::close_splash,
            watcher::start_watching,
            watcher::stop_watching,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MD Studio");
}
