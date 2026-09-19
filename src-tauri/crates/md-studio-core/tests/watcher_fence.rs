
use md_studio_core::resolve_within;
use std::fs;
use tempfile::tempdir;

#[test]
fn fence_accepts_nested_markdown() {
    let dir = tempdir().unwrap();
    fs::create_dir_all(dir.path().join("docs")).unwrap();
    let p = resolve_within(dir.path(), "docs/readme.md").unwrap();
    assert!(p.ends_with("readme.md"));
}

#[test]
fn fence_rejects_parent_escape() {
    let dir = tempdir().unwrap();
    assert!(resolve_within(dir.path(), "../secret.md").is_err());
}
