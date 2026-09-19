//! Local asset resolution helpers (scoped reads).
use crate::workspace::{resolve_within, WorkspaceError};
use std::fs;
use std::path::{Path, PathBuf};

pub fn read_asset(root: &Path, relative: &str) -> Result<Vec<u8>, WorkspaceError> {
    let path = resolve_within(root, relative)?;
    Ok(fs::read(path)?)
}

pub fn is_image(path: &PathBuf) -> bool {
    matches!(
        path.extension().and_then(|s| s.to_str()).map(|s| s.to_ascii_lowercase()).as_deref(),
        Some("png" | "jpg" | "jpeg" | "gif" | "webp" | "svg")
    )
}
