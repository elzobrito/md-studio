use std::collections::HashSet;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::State;

use md_studio_core::index::{
    save_index, DocumentMetadata, ReindexEngine, ReindexReport, ResolvedWikiLink, WikiLink,
};
use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceStats {
    pub total_documents: usize,
    pub total_words: usize,
    pub total_links: usize,
    pub total_wiki_links: usize,
    pub total_tags: usize,
    pub unique_tags: usize,
    pub total_mermaid: usize,
    pub total_katex: usize,
}

fn get_engine(state: &AppState) -> Option<ReindexEngine> {
    let guard = state.metadata_engine.lock();
    guard.as_ref().cloned()
}

fn find_document<'a>(
    index: &'a md_studio_core::index::MetadataIndex,
    path: &str,
) -> Option<&'a DocumentMetadata> {
    let clean_path = path.replace('\\', "/");
    let target = PathBuf::from(&clean_path);
    index.documents.iter().find_map(|(indexed_path, document)| {
        (indexed_path == &target
            || indexed_path.to_string_lossy().replace('\\', "/") == clean_path)
            .then_some(document)
    })
}

#[tauri::command]
pub async fn get_workspace_stats(
    state: State<'_, AppState>,
) -> Result<WorkspaceStats, String> {
    let engine = match get_engine(&state) {
        Some(e) => e,
        None => return Ok(WorkspaceStats::default()),
    };

    let index_guard = engine.index.lock().map_err(|e| e.to_string())?;
    let docs = index_guard.all();

    let mut unique_tags = HashSet::new();
    let mut total_words = 0;
    let mut total_links = 0;
    let mut total_wiki_links = 0;
    let mut total_tags = 0;
    let mut total_mermaid = 0;
    let mut total_katex = 0;

    for d in &docs {
        total_words += d.word_count;
        total_links += d.links.len();
        total_wiki_links += d.wiki_links.len();
        total_tags += d.tags.len();
        total_mermaid += d.mermaid_blocks;
        total_katex += d.katex_blocks;
        for t in &d.tags {
            unique_tags.insert(t.clone());
        }
    }

    Ok(WorkspaceStats {
        total_documents: docs.len(),
        total_words,
        total_links,
        total_wiki_links,
        total_tags,
        unique_tags: unique_tags.len(),
        total_mermaid,
        total_katex,
    })
}

#[tauri::command]
pub async fn get_document_metadata(
    path: String,
    state: State<'_, AppState>,
) -> Result<Option<DocumentMetadata>, String> {
    let engine = match get_engine(&state) {
        Some(e) => e,
        None => return Ok(None),
    };

    let index_guard = engine.index.lock().map_err(|e| e.to_string())?;
    Ok(find_document(&index_guard, &path).cloned())
}

#[tauri::command]
pub async fn get_all_documents(
    state: State<'_, AppState>,
) -> Result<Vec<DocumentMetadata>, String> {
    let engine = match get_engine(&state) {
        Some(e) => e,
        None => return Ok(vec![]),
    };

    let index_guard = engine.index.lock().map_err(|e| e.to_string())?;
    Ok(index_guard.all().into_iter().cloned().collect())
}

#[tauri::command]
pub async fn trigger_reindex(
    state: State<'_, AppState>,
) -> Result<ReindexReport, String> {
    let engine = get_engine(&state)
        .ok_or_else(|| "Nenhum workspace ativo para reindexação".to_string())?;

    let report = engine.full_reindex()?;
    if let Ok(idx) = engine.index.lock() {
        let _ = save_index(&idx, &engine.root);
    }
    Ok(report)
}

#[tauri::command]
pub async fn get_wiki_links_for(
    path: String,
    state: State<'_, AppState>,
) -> Result<Vec<WikiLink>, String> {
    let engine = match get_engine(&state) {
        Some(e) => e,
        None => return Ok(vec![]),
    };

    let index_guard = engine.index.lock().map_err(|e| e.to_string())?;
    Ok(find_document(&index_guard, &path)
        .map(|document| document.wiki_links.clone())
        .unwrap_or_default())
}

#[tauri::command]
pub async fn resolve_wiki_link(
    target: String,
    state: State<'_, AppState>,
) -> Result<ResolvedWikiLink, String> {
    let engine = get_engine(&state)
        .ok_or_else(|| "Nenhum workspace ativo para resolver wiki link".to_string())?;
    let index_guard = engine.index.lock().map_err(|e| e.to_string())?;
    Ok(index_guard.resolve_wiki_link(&target))
}

#[tauri::command]
pub async fn get_resolved_wiki_links_for(
    path: String,
    state: State<'_, AppState>,
) -> Result<Vec<ResolvedWikiLink>, String> {
    let engine = match get_engine(&state) {
        Some(engine) => engine,
        None => return Ok(vec![]),
    };
    let index_guard = engine.index.lock().map_err(|e| e.to_string())?;
    Ok(find_document(&index_guard, &path)
        .map(|document| index_guard.resolve_all(document))
        .unwrap_or_default())
}

#[tauri::command]
pub async fn get_tags(
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let engine = match get_engine(&state) {
        Some(e) => e,
        None => return Ok(vec![]),
    };

    let index_guard = engine.index.lock().map_err(|e| e.to_string())?;
    let mut tags = HashSet::new();
    for doc in index_guard.all() {
        for t in &doc.tags {
            tags.insert(t.clone());
        }
    }

    let mut sorted: Vec<String> = tags.into_iter().collect();
    sorted.sort();
    Ok(sorted)
}
