use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Component, Path, PathBuf};
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Error)]
pub enum WorkspaceError {
    #[error("invalid path")]
    InvalidPath,
    #[error("outside workspace")]
    OutsideWorkspace,
    #[error("symlink escape")]
    SymlinkEscape,
    #[error("not found")]
    NotFound,
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
}

#[derive(Debug, Clone)]
pub struct Workspace {
    pub id: String,
    pub root: PathBuf,
    pub kind: String,
}

#[derive(Default)]
pub struct WorkspaceRegistry {
    inner: HashMap<String, Workspace>,
}

impl WorkspaceRegistry {
    pub fn open(&mut self, path: &Path) -> Result<Workspace, WorkspaceError> {
        let root = fs::canonicalize(path).map_err(|_| WorkspaceError::NotFound)?;
        let kind = if root.is_file() {
            "single-file".into()
        } else {
            "folder".into()
        };
        let root = if root.is_file() {
            root.parent().unwrap().to_path_buf()
        } else {
            root
        };
        let id = Uuid::new_v4().to_string();
        let ws = Workspace {
            id: id.clone(),
            root,
            kind,
        };
        self.inner.insert(id, ws.clone());
        Ok(ws)
    }

    pub fn get(&self, id: &str) -> Option<&Workspace> {
        self.inner.get(id)
    }

    /// Keep only the workspace with `id` (prevents registry growth across re-opens).
    pub fn retain(&mut self, id: &str) {
        self.inner.retain(|k, _| k == id);
    }

    pub fn resolve(&self, id: &str, relative: &str) -> Result<PathBuf, WorkspaceError> {
        let ws = self.get(id).ok_or(WorkspaceError::NotFound)?;
        resolve_within(&ws.root, relative)
    }
}

pub fn resolve_within(root: &Path, relative: &str) -> Result<PathBuf, WorkspaceError> {
    if relative.is_empty() {
        return Ok(root.to_path_buf());
    }
    if Path::new(relative).is_absolute() {
        return Err(WorkspaceError::InvalidPath);
    }
    let mut joined = root.to_path_buf();
    for comp in Path::new(relative).components() {
        match comp {
            Component::Normal(s) => joined.push(s),
            Component::CurDir => {}
            Component::ParentDir => return Err(WorkspaceError::OutsideWorkspace),
            _ => return Err(WorkspaceError::InvalidPath),
        }
    }
    // Disallow escaping via symlink: canonicalize when exists
    if joined.exists() {
        let canon = fs::canonicalize(&joined)?;
        let root_canon = fs::canonicalize(root)?;
        if !canon.starts_with(&root_canon) {
            return Err(WorkspaceError::SymlinkEscape);
        }
        return Ok(canon);
    }
    // parent must stay inside root
    if let Some(parent) = joined.parent() {
        if parent.exists() {
            let parent_canon = fs::canonicalize(parent)?;
            let root_canon = fs::canonicalize(root)?;
            if !parent_canon.starts_with(&root_canon) {
                return Err(WorkspaceError::OutsideWorkspace);
            }
        }
    }
    Ok(joined)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceDescriptorDto {
    pub id: String,
    pub root_label: String,
    pub kind: String,
}
