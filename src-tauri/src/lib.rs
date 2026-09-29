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
    #[cfg(target_os = "linux")]
    {
        // Inside Snap, the GNOME extension (core24/gnome-46-2404) manages
        // graphics backends, Mesa, and WebKitGTK variables automatically.
        // Never override them when running under SNAP confinement.
        if std::env::var("SNAP").is_err() {
            if std::env::var("GDK_BACKEND").map(|v| v.is_empty()).unwrap_or(true) {
                std::env::set_var("GDK_BACKEND", "x11");
            }
            if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").map(|v| v.is_empty()).unwrap_or(true) {
                std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
            }
        }
    }

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
            if let Some(main) = app.get_webview_window("main") {
                eprintln!("[TAURI_SETUP] main window initialized successfully, url={:?}", main.url());
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::open_workspace,
            commands::list_entries,
            commands::read_document,
            commands::save_document,
            commands::search_workspace,
            commands::export_html,
            commands::export_epub,
            commands::get_launch_path,
            commands::metadata::get_workspace_stats,
            commands::metadata::get_document_metadata,
            commands::metadata::get_all_documents,
            commands::metadata::trigger_reindex,
            commands::metadata::get_wiki_links_for,
            commands::metadata::resolve_wiki_link,
            commands::metadata::get_resolved_wiki_links_for,
            commands::metadata::get_tags,
            commands::metadata::get_backlinks,
            commands::close_splash,
            commands::formatter::format_code,
            commands::list_history_entries,
            commands::get_history_snapshot,
            commands::restore_history_entry,
            commands::git_is_repository,
            commands::git_get_status,
            commands::git_get_file_diff,
            commands::git_get_file_history,
            commands::git_get_file_at_commit,
            commands::importer::import_check_capabilities,
            commands::importer::import_convert_source,
            commands::importer::import_commit_document,
            watcher::start_watching,
            watcher::stop_watching,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MD Studio");
}
