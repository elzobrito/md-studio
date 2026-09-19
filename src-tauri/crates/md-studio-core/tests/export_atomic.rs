
use md_studio_core::atomic_write_bytes;
use std::fs;
use tempfile::tempdir;

#[test]
fn atomic_write_export_html() {
    let dir = tempdir().unwrap();
    let dest = dir.path().join("out.html");
    let html = b"<!DOCTYPE html><html><body><h1>Title</h1></body></html>";
    atomic_write_bytes(&dest, html).unwrap();
    let got = fs::read_to_string(&dest).unwrap();
    assert!(got.contains("<h1>Title</h1>"));
    assert!(!got.contains("<pre>"));
}
