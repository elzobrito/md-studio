use md_studio_core::export::{
    apply_mermaid_slots, build_epub, extract_headings, generate_content_opf, generate_nav_xhtml,
    generate_toc_ncx, html_to_xhtml, normalize_metadata, EpubExportPayload, EpubHeading,
    EpubMetadata, ManifestItem, MermaidSlot,
};
use std::fs;
use std::io::{Cursor, Read};
use zip::{CompressionMethod, ZipArchive};

fn read_entries(bytes: &[u8]) -> Vec<(String, Vec<u8>, CompressionMethod)> {
    let mut archive = ZipArchive::new(Cursor::new(bytes)).expect("zip");
    let mut entries = Vec::new();
    for index in 0..archive.len() {
        let mut file = archive.by_index(index).unwrap();
        let name = file.name().to_string();
        let method = file.compression();
        let mut data = Vec::new();
        file.read_to_end(&mut data).unwrap();
        entries.push((name, data, method));
    }
    entries
}

fn manifest_hrefs(opf: &str) -> Vec<String> {
    let mut hrefs = Vec::new();
    let mut rest = opf;
    while let Some(index) = rest.find("href=\"") {
        let tail = &rest[index + 6..];
        let end = tail.find('"').expect("href quote");
        hrefs.push(tail[..end].to_string());
        rest = &tail[end + 1..];
    }
    hrefs
}

fn entry<'a>(entries: &'a [(String, Vec<u8>, CompressionMethod)], name: &str) -> &'a [u8] {
    entries
        .iter()
        .find(|(entry, _, _)| entry == name)
        .map(|(_, data, _)| data.as_slice())
        .unwrap_or_else(|| panic!("missing {name}"))
}

#[test]
fn payload_deserializes_camel_case() {
    let raw = r#"{
        "metadata": {
            "title": "Arquitetura do Sistema",
            "author": "Elzo Brito",
            "lang": "pt-BR",
            "description": "Documento técnico",
            "date": "2026-09-24"
        },
        "bodyHtml": "<h1 id=\"topo\">Topo</h1>",
        "mermaidSlots": [{
            "id": "mermaid-001",
            "placeholder": "{{MERMAID:mermaid-001}}",
            "source": "graph TD;",
            "svgContent": "<svg xmlns=\"http://www.w3.org/2000/svg\"/>"
        }],
        "imageRefs": ["/tmp/figura.png"]
    }"#;
    let payload: EpubExportPayload = serde_json::from_str(raw).unwrap();
    assert_eq!(payload.metadata.title, "Arquitetura do Sistema");
    assert_eq!(payload.metadata.author.as_deref(), Some("Elzo Brito"));
    assert_eq!(payload.metadata.lang, "pt-BR");
    assert_eq!(payload.body_html, "<h1 id=\"topo\">Topo</h1>");
    assert_eq!(payload.mermaid_slots[0].id, "mermaid-001");
    assert_eq!(
        payload.mermaid_slots[0].svg_content.as_deref(),
        Some("<svg xmlns=\"http://www.w3.org/2000/svg\"/>")
    );
    assert_eq!(payload.image_refs, vec!["/tmp/figura.png".to_string()]);
}

#[test]
fn html_becomes_xhtml_with_heading_ids() {
    let xhtml = html_to_xhtml("<p>Oi &amp; tal<br>fim<h1>Intro</h1><h2>Parte</h2>").unwrap();
    assert!(xhtml.contains("<!DOCTYPE html>"));
    assert!(xhtml.contains("xmlns=\"http://www.w3.org/1999/xhtml\""));
    assert!(xhtml.contains("Oi &amp; tal"));
    assert!(xhtml.contains("<br/>"));
    assert!(xhtml.contains("</p>"));
    let headings = extract_headings(&xhtml);
    assert_eq!(
        headings,
        vec![
            EpubHeading {
                level: 1,
                text: "Intro".into(),
                anchor: "h-1".into(),
            },
            EpubHeading {
                level: 2,
                text: "Parte".into(),
                anchor: "h-2".into(),
            },
        ]
    );
}

#[test]
fn nav_and_ncx_include_h1_h2_only() {
    let headings = vec![
        EpubHeading {
            level: 1,
            text: "Intro".into(),
            anchor: "intro".into(),
        },
        EpubHeading {
            level: 2,
            text: "Parte".into(),
            anchor: "parte".into(),
        },
        EpubHeading {
            level: 3,
            text: "Detalhe".into(),
            anchor: "detalhe".into(),
        },
    ];
    let nav = generate_nav_xhtml(&headings);
    assert!(nav.contains("epub:type=\"toc\""));
    assert!(nav.contains("chapter.xhtml#intro"));
    assert!(nav.contains(">Intro</a>"));
    assert!(nav.contains("chapter.xhtml#parte"));
    let intro = nav.find(">Intro</a>").unwrap();
    let parte = nav.find(">Parte</a>").unwrap();
    assert!(intro < parte);
    assert!(nav[intro..parte].contains("<ol>"));
    assert!(!nav.contains("Detalhe"));

    let metadata = EpubMetadata {
        title: "Livro & Notas".into(),
        author: Some("Autora".into()),
        lang: "pt-BR".into(),
        description: None,
        date: "2026-09-24".into(),
    };
    let ncx = generate_toc_ncx(&headings, &metadata);
    assert!(ncx.contains("<navPoint id=\"navPoint-1\" playOrder=\"1\">"));
    assert!(ncx.contains("chapter.xhtml#parte"));
    assert!(ncx.contains("Livro &amp; Notas"));
    assert!(!ncx.contains("Detalhe"));
}

#[test]
fn content_opf_carries_metadata() {
    let metadata = normalize_metadata(EpubMetadata {
        title: "Arquitetura".into(),
        author: Some("Elzo Brito".into()),
        lang: "pt-BR".into(),
        description: Some("Documento".into()),
        date: "2026-09-24".into(),
    });
    let opf = generate_content_opf(
        &metadata,
        &[
            ManifestItem {
                id: "chapter".into(),
                href: "chapter.xhtml".into(),
                media_type: "application/xhtml+xml".into(),
                properties: None,
            },
            ManifestItem {
                id: "nav".into(),
                href: "nav.xhtml".into(),
                media_type: "application/xhtml+xml".into(),
                properties: Some("nav".into()),
            },
        ],
    )
    .unwrap();
    assert!(opf.contains("version=\"3.0\""));
    assert!(opf.contains("<dc:title>Arquitetura</dc:title>"));
    assert!(opf.contains("<dc:creator>Elzo Brito</dc:creator>"));
    assert!(opf.contains("<dc:language>pt-BR</dc:language>"));
    assert!(opf.contains("<dc:description>Documento</dc:description>"));
    assert!(opf.contains("<dc:date>2026-09-24</dc:date>"));
    assert!(opf.contains("properties=\"nav\""));
    assert!(opf.contains("<itemref idref=\"chapter\"/>"));
    assert!(!opf.contains("idref=\"nav\""));
    assert!(opf.contains("<reference type=\"toc\" title=\"Sumário\" href=\"nav.xhtml\"/>"));
    assert!(!opf.contains("toc=\"ncx\""));
}

#[test]
fn empty_frontmatter_uses_safe_defaults() {
    let payload: EpubExportPayload =
        serde_json::from_str(r#"{"metadata":{"title":"","lang":""},"bodyHtml":"<p>Olá</p>"}"#)
            .unwrap();
    let metadata = normalize_metadata(payload.metadata);
    assert_eq!(metadata.title, "Sem título");
    assert_eq!(metadata.lang, "pt-BR");
    assert!(metadata.author.is_none());
    assert!(metadata.date.contains('-'));
    assert_eq!(metadata.date.len(), 10);
}

#[test]
fn mermaid_svg_becomes_image_and_null_becomes_code() {
    let xhtml = html_to_xhtml("<p>{{MERMAID:ok}}</p><p>{{MERMAID:bad}}</p>").unwrap();
    let slots = vec![
        MermaidSlot {
            id: "ok".into(),
            placeholder: "{{MERMAID:ok}}".into(),
            source: "graph TD;".into(),
            svg_content: Some("<svg xmlns=\"http://www.w3.org/2000/svg\"/>".into()),
        },
        MermaidSlot {
            id: "bad".into(),
            placeholder: "{{MERMAID:bad}}".into(),
            source: "A-->B <script>".into(),
            svg_content: None,
        },
    ];
    let applied = apply_mermaid_slots(&xhtml, &slots).unwrap();
    assert_eq!(applied.mermaid_count, 1);
    assert_eq!(applied.mermaid_fallback_count, 1);
    assert!(applied
        .xhtml
        .contains("<img src=\"images/ok.svg\" alt=\"diagrama\"/>"));
    assert!(applied.xhtml.contains("class=\"mermaid-fallback\""));
    assert!(applied.xhtml.contains("A--&gt;B &lt;script&gt;"));
    assert!(!applied.xhtml.contains("{{MERMAID:"));
}

#[test]
fn epub_zip_includes_local_image_and_rejects_escape() {
    let root = tempfile::tempdir().unwrap();
    let figure = root.path().join("figura.png");
    fs::write(&figure, b"\x89PNG-local").unwrap();
    let outside = tempfile::tempdir().unwrap();
    let secret = outside.path().join("secret.png");
    fs::write(&secret, b"secret").unwrap();
    let link = root.path().join("link.png");
    std::os::unix::fs::symlink(&secret, &link).unwrap();

    let payload = EpubExportPayload {
        metadata: EpubMetadata {
            title: "Arquitetura".into(),
            author: Some("Elzo Brito".into()),
            lang: "pt-BR".into(),
            description: Some("Documento".into()),
            date: "2026-09-24".into(),
        },
        body_html: "<h1>Intro</h1><p>{{MERMAID:mermaid-001}}</p><p>{{MERMAID:bad}}</p>".into(),
        mermaid_slots: vec![
            MermaidSlot {
                id: "mermaid-001".into(),
                placeholder: "{{MERMAID:mermaid-001}}".into(),
                source: "graph TD;".into(),
                svg_content: Some("<svg xmlns=\"http://www.w3.org/2000/svg\"/>".into()),
            },
            MermaidSlot {
                id: "bad".into(),
                placeholder: "{{MERMAID:bad}}".into(),
                source: "graph LR;".into(),
                svg_content: None,
            },
        ],
        image_refs: vec![figure.to_string_lossy().into_owned()],
    };
    let dest = root.path().join("out").join("livro.epub");
    let result = build_epub(&payload, root.path(), &dest).unwrap();
    assert_eq!(result.image_count, 1);
    assert_eq!(result.mermaid_count, 1);
    assert_eq!(result.mermaid_fallback_count, 1);
    assert!(dest.is_file());
    assert!(fs::read_dir(dest.parent().unwrap())
        .unwrap()
        .all(|entry| !entry.unwrap().file_name().to_string_lossy().contains(".tmp-")));

    let bytes = fs::read(&dest).unwrap();
    let entries = read_entries(&bytes);
    assert_eq!(entries[0].0, "mimetype");
    assert_eq!(entries[0].2, CompressionMethod::Stored);
    assert_eq!(entries[0].1, b"application/epub+zip");
    let opf = std::str::from_utf8(entry(&entries, "OEBPS/content.opf")).unwrap();
    assert!(opf.contains("<dc:title>Arquitetura</dc:title>"));
    assert!(opf.contains("<dc:language>pt-BR</dc:language>"));
    assert!(opf.contains("<dc:creator>Elzo Brito</dc:creator>"));
    assert!(opf.contains("toc=\"ncx\""));
    assert!(opf.contains("<reference type=\"toc\" title=\"Sumário\" href=\"nav.xhtml\"/>"));
    assert!(opf.contains("properties=\"nav\""));
    for href in manifest_hrefs(opf) {
        let name = format!("OEBPS/{href}");
        assert!(
            entries.iter().any(|(entry, _, _)| entry == &name),
            "manifest item missing from zip: {name}"
        );
    }
    let container = std::str::from_utf8(entry(&entries, "META-INF/container.xml")).unwrap();
    assert!(container.contains("version=\"1.0\""));
    assert!(container.contains("full-path=\"OEBPS/content.opf\""));
    assert!(container.contains("application/oebps-package+xml"));
    let chapter = std::str::from_utf8(entry(&entries, "OEBPS/chapter.xhtml")).unwrap();
    assert!(chapter.contains("<!DOCTYPE html>"));
    assert!(chapter.contains("xmlns=\"http://www.w3.org/1999/xhtml\""));
    assert!(chapter.contains("images/mermaid-001.svg"));
    assert!(chapter.contains("mermaid-fallback"));
    let nav = std::str::from_utf8(entry(&entries, "OEBPS/nav.xhtml")).unwrap();
    assert!(nav.contains("Intro"));
    assert!(nav.contains("epub:type=\"toc\""));
    let ncx = std::str::from_utf8(entry(&entries, "OEBPS/toc.ncx")).unwrap();
    assert!(ncx.contains("navPoint"));
    assert_eq!(entry(&entries, "OEBPS/images/figura.png"), b"\x89PNG-local");
    assert_eq!(
        entry(&entries, "OEBPS/images/mermaid-001.svg"),
        b"<svg xmlns=\"http://www.w3.org/2000/svg\"/>"
    );
    assert!(entries
        .iter()
        .all(|(name, _, _)| name != "OEBPS/images/bad.svg"));
    let css = std::str::from_utf8(entry(&entries, "OEBPS/styles/main.css")).unwrap();
    assert!(css.contains("Georgia"));
    assert!(entries
        .iter()
        .any(|(name, _, _)| name == "META-INF/container.xml"));

    let mut escaped = payload.clone();
    escaped.image_refs = vec![secret.to_string_lossy().into_owned()];
    let rejected = root.path().join("rejected.epub");
    assert!(build_epub(&escaped, root.path(), &rejected).is_err());
    assert!(!rejected.exists());

    let mut linked = payload.clone();
    linked.image_refs = vec![link.to_string_lossy().into_owned()];
    let rejected_link = root.path().join("rejected-link.epub");
    assert!(build_epub(&linked, root.path(), &rejected_link).is_err());
    assert!(!rejected_link.exists());
}
