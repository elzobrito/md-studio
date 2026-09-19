use md_studio_core::resolve_within;
use std::fs;
use tempfile::tempdir;

#[test]
fn rejects_parent_dir() {
    let dir = tempdir().unwrap();
    let err = resolve_within(dir.path(), "../etc/passwd").unwrap_err();
    let s = err.to_string();
    assert!(s.contains("outside") || s.contains("Outside") || s.contains("invalid"), "{s}");
}

#[test]
fn rejects_absolute() {
    let dir = tempdir().unwrap();
    assert!(resolve_within(dir.path(), "/etc/passwd").is_err());
}

#[test]
fn accepts_nested() {
    let dir = tempdir().unwrap();
    fs::create_dir_all(dir.path().join("a")).unwrap();
    let p = resolve_within(dir.path(), "a/b.md").unwrap();
    assert!(p.ends_with("b.md"));
}
