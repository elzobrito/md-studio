use serde::{Deserialize, Serialize};

/// IPC DTOs — camelCase to match TypeScript contracts in src/contracts/types.ts
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceDescriptor {
    pub id: String,
    pub root_label: String,
    pub kind: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub name: String,
    pub relative_path: String,
    pub kind: String,
    pub size: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentSnapshot {
    pub workspace_id: String,
    pub relative_path: String,
    pub content: String,
    pub encoding: String,
    pub mtime_ms: u64,
    pub content_hash: String,
    pub version: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub relative_path: String,
    pub line: u32,
    pub preview: String,
}
