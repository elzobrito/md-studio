use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::Path;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SaveError {
    #[error("hash mismatch")]
    HashMismatch,
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
}

pub fn content_hash(bytes: &[u8]) -> String {
    let mut h = Sha256::new();
    h.update(bytes);
    hex::encode(h.finalize())
}

pub fn read_file(path: &Path) -> Result<(String, String, u64), std::io::Error> {
    let mut f = File::open(path)?;
    let mut buf = String::new();
    f.read_to_string(&mut buf)?;
    let meta = fs::metadata(path)?;
    let mtime = meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    let hash = content_hash(buf.as_bytes());
    Ok((buf, hash, mtime))
}

#[derive(Debug, Clone)]
pub struct PreviousDocumentState {
    pub content: String,
    pub hash: String,
    pub mtime_ms: u64,
}

#[derive(Debug, Clone)]
pub struct AtomicSaveOutcome {
    pub new_hash: String,
    pub previous: Option<PreviousDocumentState>,
}

pub fn atomic_save_with_previous(
    path: &Path,
    expected_hash: &str,
    content: &str,
) -> Result<AtomicSaveOutcome, SaveError> {
    let mut previous = None;
    if path.exists() {
        let (current, hash, mtime) = read_file(path)?;
        if hash != expected_hash {
            return Err(SaveError::HashMismatch);
        }
        previous = Some(PreviousDocumentState {
            content: current,
            hash,
            mtime_ms: mtime,
        });
    } else if !expected_hash.is_empty() && expected_hash != "new" {
        // allow empty/new sentinel for first write
    }

    let parent = path.parent().unwrap_or_else(|| Path::new("."));
    fs::create_dir_all(parent)?;
    let tmp = parent.join(format!(
        ".{}.tmp-{}",
        path.file_name().and_then(|s| s.to_str()).unwrap_or("doc"),
        std::process::id()
    ));
    {
        let mut f = File::create(&tmp)?;
        f.write_all(content.as_bytes())?;
        f.sync_all()?;
    }
    fs::rename(&tmp, path)?;
    // best-effort dir fsync omitted for portability
    Ok(AtomicSaveOutcome {
        new_hash: content_hash(content.as_bytes()),
        previous,
    })
}

pub fn atomic_save(path: &Path, expected_hash: &str, content: &str) -> Result<String, SaveError> {
    atomic_save_with_previous(path, expected_hash, content).map(|o| o.new_hash)
}


/// Atomic write without hash check (trusted export sink).
pub fn atomic_write_bytes(path: &Path, bytes: &[u8]) -> Result<(), std::io::Error> {
    let parent = path.parent().unwrap_or_else(|| Path::new("."));
    fs::create_dir_all(parent)?;
    let tmp = parent.join(format!(
        ".{}.tmp-{}",
        path.file_name().and_then(|s| s.to_str()).unwrap_or("out"),
        std::process::id()
    ));
    {
        let mut f = File::create(&tmp)?;
        f.write_all(bytes)?;
        f.sync_all()?;
    }
    fs::rename(&tmp, path)?;
    Ok(())
}
