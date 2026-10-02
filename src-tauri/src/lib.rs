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
        .on_page_load(|webview, payload| {
            if payload.event() == tauri::webview::PageLoadEvent::Finished {
                eprintln!(
                    "[TAURI_PAGE_LOAD] event=Finished window={}",
                    webview.label()
                );
            }
        })
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
            if let Some(main) = app.get_webview_window("main") {
                eprintln!(
                    "[TAURI_SETUP] main window initialized successfully, url={:?}",
                    main.url()
                );
            }
            // Fallback: If splashscreen window failed to initialize, show main window immediately
            if app.get_webview_window("splashscreen").is_none() {
                eprintln!(
                    "[WARN][SPLASH_SETUP] Splashscreen window not found at setup; showing main window immediately"
                );
                if let Some(main) = app.get_webview_window("main") {
                    let _ = main.show();
                    let _ = main.set_focus();
                }
            }
            // Defensive fail-safe timeout: ensure main window is visible if frontend readiness signal times out
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(8));
                if let Some(splash) = handle.get_webview_window("splashscreen") {
                    if splash.is_visible().unwrap_or(true) {
                        eprintln!(
                            "[WARN][SPLASH_FAILSAFE] Frontend readiness signal timed out after 8s; forcing main window visibility"
                        );
                        if let Some(main) = handle.get_webview_window("main") {
                            let _ = main.show();
                            let _ = main.set_focus();
                        }
                        let _ = splash.close();
                    }
                } else if let Some(main) = handle.get_webview_window("main") {
                    if !main.is_visible().unwrap_or(true) {
                        eprintln!(
                            "[WARN][SPLASH_FAILSAFE] Splashscreen closed but main window still hidden after 8s; forcing main window visibility"
                        );
                        let _ = main.show();
                        let _ = main.set_focus();
                    }
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
