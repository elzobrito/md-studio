use md_studio_core::{atomic_save, content_hash};
use std::fs;
use tempfile::tempdir;

#[test]
fn writes_new_file() {
    let dir = tempdir().unwrap();
    let p = dir.path().join("a.md");
    let h = atomic_save(&p, "new", "hello").unwrap();
    assert_eq!(fs::read_to_string(&p).unwrap(), "hello");
    assert_eq!(h, content_hash(b"hello"));
}

#[test]
fn detects_conflict() {
    let dir = tempdir().unwrap();
    let p = dir.path().join("a.md");
    fs::write(&p, "old").unwrap();
    let err = atomic_save(&p, "deadbeef", "new").unwrap_err();
    assert!(format!("{err}").contains("hash") || format!("{err}").contains("Hash"));
}
