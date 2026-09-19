//! Cold-start launch path helpers: pick a Markdown file from CLI argv.

use std::path::{Path, PathBuf};

/// Extensions treated as Markdown for OS open / argv.
const MARKDOWN_EXTS: &[&str] = &["md", "markdown", "mdx"];

pub fn is_markdown_path(path: &Path) -> bool {
    path.extension()
        .and_then(|s| s.to_str())
        .map(|ext| MARKDOWN_EXTS.iter().any(|e| ext.eq_ignore_ascii_case(e)))
        .unwrap_or(false)
}

/// Turn a raw argv token into a filesystem path.
/// Supports plain paths and simple `file://` URLs. Skips flags (`-…`).
pub fn path_from_arg(arg: &str) -> Option<PathBuf> {
    let s = arg.trim();
    if s.is_empty() || s.starts_with('-') {
        return None;
    }
    if let Some(rest) = s.strip_prefix("file://") {
        // file:///abs/path → /abs/path ; file://localhost/abs → /abs after host strip
        let path_part = if rest.starts_with('/') {
            rest.to_string()
        } else if let Some(idx) = rest.find('/') {
            rest[idx..].to_string()
        } else {
            return None;
        };
        // Best-effort percent-decode for spaces etc.
        let decoded = percent_decode(&path_part);
        return Some(PathBuf::from(decoded));
    }
    Some(PathBuf::from(s))
}

fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let (Some(h), Some(l)) = (from_hex(bytes[i + 1]), from_hex(bytes[i + 2])) {
                out.push((h << 4) | l);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn from_hex(b: u8) -> Option<u8> {
    match b {
        b'0'..=b'9' => Some(b - b'0'),
        b'a'..=b'f' => Some(b - b'a' + 10),
        b'A'..=b'F' => Some(b - b'A' + 10),
        _ => None,
    }
}

/// Prefer the first **absolute**, existing Markdown file among argv-like tokens.
/// Relative paths, non-markdown, missing files, and flags are skipped (no panic).
pub fn first_existing_markdown_path<I, S>(args: I) -> Option<PathBuf>
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    for arg in args {
        let Some(path) = path_from_arg(arg.as_ref()) else {
            continue;
        };
        if !path.is_absolute() {
            continue;
        }
        if !is_markdown_path(&path) {
            continue;
        }
        // is_file() is false for missing paths — skip without crashing
        if path.is_file() {
            return Some(path);
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn prefers_first_existing_md_among_many() {
        let dir = tempdir().unwrap();
        let a = dir.path().join("a.md");
        let b = dir.path().join("b.md");
        fs::write(&a, "# a").unwrap();
        fs::write(&b, "# b").unwrap();
        let got = first_existing_markdown_path([
            a.to_string_lossy().to_string(),
            b.to_string_lossy().to_string(),
        ]);
        assert_eq!(got.as_deref(), Some(a.as_path()));
    }

    #[test]
    fn skips_missing_and_non_md_without_panic() {
        let dir = tempdir().unwrap();
        let missing = dir.path().join("gone.md");
        let txt = dir.path().join("note.txt");
        let ok = dir.path().join("ok.md");
        fs::write(&txt, "x").unwrap();
        fs::write(&ok, "# ok").unwrap();
        let got = first_existing_markdown_path([
            missing.to_string_lossy().to_string(),
            txt.to_string_lossy().to_string(),
            "--flag".into(),
            ok.to_string_lossy().to_string(),
        ]);
        assert_eq!(got.as_deref(), Some(ok.as_path()));
    }

    #[test]
    fn ignores_relative_paths() {
        let got = first_existing_markdown_path(["README.md", "./docs/x.md"]);
        assert!(got.is_none());
    }

    #[test]
    fn accepts_file_url() {
        let dir = tempdir().unwrap();
        let f = dir.path().join("via-url.md");
        fs::write(&f, "# url").unwrap();
        let url = format!("file://{}", f.display());
        let got = first_existing_markdown_path([url]);
        assert_eq!(got.as_deref(), Some(f.as_path()));
    }

    #[test]
    fn markdown_ext_case_insensitive() {
        assert!(is_markdown_path(Path::new("/tmp/X.MD")));
        assert!(is_markdown_path(Path::new("/tmp/x.Markdown")));
        assert!(!is_markdown_path(Path::new("/tmp/x.txt")));
    }
}
