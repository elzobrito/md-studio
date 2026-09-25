use crate::export::css_templates::EPUB_MAIN_CSS;
use crate::export::epub_types::{
    normalize_metadata, EpubExportPayload, EpubExportResult, EpubMetadata, ManifestItem,
};
use crate::export::nav_generator::{generate_nav_xhtml, generate_toc_ncx};
use crate::export::xhtml_converter::{
    apply_mermaid_slots, escape_text, extract_headings, html_to_xhtml, safe_mermaid_id,
};
use crate::persistence::atomic_write_bytes;
use epub_builder::{EpubBuilder, EpubContent, EpubVersion, ReferenceType, ZipLibrary};
use std::fs;
use std::io::{Cursor, Read, Write};
use std::path::{Path, PathBuf};
use thiserror::Error;
use uuid::Uuid;
use zip::write::FileOptions;
use zip::{CompressionMethod, ZipArchive, ZipWriter};

#[derive(Debug, Error)]
pub enum EpubError {
    #[error("html conversion failed: {0}")]
    Conversion(String),
    #[error("path is outside the workspace")]
    OutsideWorkspace,
    #[error("epub build failed: {0}")]
    Build(String),
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
}

pub fn generate_content_opf(
    metadata: &EpubMetadata,
    manifest_items: &[ManifestItem],
) -> Result<String, EpubError> {
    let metadata = normalize_metadata(metadata.clone());
    let identifier = Uuid::new_v4();
    let mut manifest = String::new();
    let mut spine = String::new();
    for item in manifest_items {
        manifest.push_str(&format!(
            "<item id=\"{}\" href=\"{}\" media-type=\"{}\"",
            escape_text(&item.id),
            escape_text(&item.href),
            escape_text(&item.media_type)
        ));
        if let Some(properties) = &item.properties {
            manifest.push_str(&format!(" properties=\"{}\"", escape_text(properties)));
        }
        manifest.push_str("/>\n");
        let is_nav = item.properties.as_deref() == Some("nav");
        if item.media_type == "application/xhtml+xml" && !is_nav {
            spine.push_str(&format!("<itemref idref=\"{}\"/>\n", escape_text(&item.id)));
        }
    }
    let spine_open = match manifest_items
        .iter()
        .find(|item| item.media_type == "application/x-dtbncx+xml")
    {
        Some(item) => format!("<spine toc=\"{}\">", escape_text(&item.id)),
        None => "<spine>".to_string(),
    };
    let guide = match manifest_items
        .iter()
        .find(|item| item.properties.as_deref() == Some("nav"))
    {
        Some(item) => format!(
            "<guide>\n<reference type=\"toc\" title=\"Sumário\" href=\"{}\"/>\n</guide>\n",
            escape_text(&item.href)
        ),
        None => String::new(),
    };
    let mut optional = String::new();
    if let Some(author) = &metadata.author {
        optional.push_str(&format!(
            "<dc:creator>{}</dc:creator>\n",
            escape_text(author)
        ));
    }
    if let Some(description) = &metadata.description {
        optional.push_str(&format!(
            "<dc:description>{}</dc:description>\n",
            escape_text(description)
        ));
    }
    Ok(format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
         <package xmlns=\"http://www.idpf.org/2007/opf\" unique-identifier=\"bookid\" version=\"3.0\" xml:lang=\"{lang}\">\n\
         <metadata xmlns:dc=\"http://purl.org/dc/elements/1.1/\">\n\
         <dc:identifier id=\"bookid\">urn:uuid:{identifier}</dc:identifier>\n\
         <dc:title>{title}</dc:title>\n\
         <dc:language>{lang}</dc:language>\n\
         {optional}\
         <dc:date>{date}</dc:date>\n\
         <meta property=\"dcterms:modified\">{date}T00:00:00Z</meta>\n\
         </metadata>\n\
         <manifest>\n\
         {manifest}\
         </manifest>\n\
         {spine_open}\n\
         {spine}\
         </spine>\n\
         {guide}\
         </package>\n",
        spine_open = spine_open,
        guide = guide,
        lang = escape_text(&metadata.lang),
        title = escape_text(&metadata.title),
        date = escape_text(&metadata.date),
    ))
}

pub fn build_epub(
    payload: &EpubExportPayload,
    workspace_root: &Path,
    output_path: &Path,
) -> Result<EpubExportResult, EpubError> {
    let metadata = normalize_metadata(payload.metadata.clone());
    let guarded_images = guard_images(workspace_root, &payload.image_refs)?;
    let xhtml = html_to_xhtml(&payload.body_html).map_err(|err| EpubError::Conversion(err.0))?;
    let applied = apply_mermaid_slots(&xhtml, &payload.mermaid_slots)
        .map_err(|err| EpubError::Conversion(err.0))?;
    let chapter = applied.xhtml.replace(
        "<title></title>",
        &format!("<title>{}</title>", escape_text(&metadata.title)),
    );
    let headings = extract_headings(&chapter);
    let nav = generate_nav_xhtml(&headings);
    let toc = generate_toc_ncx(&headings, &metadata);
    let mut manifest = vec![
        ManifestItem {
            id: "stylesheet".into(),
            href: "stylesheet.css".into(),
            media_type: "text/css".into(),
            properties: None,
        },
        ManifestItem {
            id: "style".into(),
            href: "styles/main.css".into(),
            media_type: "text/css".into(),
            properties: None,
        },
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
        ManifestItem {
            id: "ncx".into(),
            href: "toc.ncx".into(),
            media_type: "application/x-dtbncx+xml".into(),
            properties: None,
        },
    ];
    for (href, _path) in &guarded_images {
        manifest.push(ManifestItem {
            id: format!("img-{}", manifest.len()),
            href: href.clone(),
            media_type: mime_for(Path::new(href)).into(),
            properties: None,
        });
    }
    for slot in &payload.mermaid_slots {
        if slot
            .svg_content
            .as_deref()
            .map(str::trim)
            .filter(|svg| !svg.is_empty())
            .is_some()
        {
            let id = safe_mermaid_id(&slot.id).map_err(|err| EpubError::Conversion(err.0))?;
            manifest.push(ManifestItem {
                id: format!("mermaid-{id}"),
                href: format!("images/{id}.svg"),
                media_type: "image/svg+xml".into(),
                properties: None,
            });
        }
    }
    let opf = generate_content_opf(&metadata, &manifest)?;

    let mut builder =
        EpubBuilder::new(ZipLibrary::new().map_err(|err| EpubError::Build(err.to_string()))?)
            .map_err(|err| EpubError::Build(err.to_string()))?;
    builder.epub_version(EpubVersion::V30);
    builder.set_title(&metadata.title);
    builder.set_lang(&metadata.lang);
    builder.set_generator("MD Studio");
    if let Some(author) = &metadata.author {
        builder.add_author(author);
    }
    if let Some(description) = &metadata.description {
        builder
            .metadata("description", description)
            .map_err(|err| EpubError::Build(err.to_string()))?;
    }
    builder
        .stylesheet(EPUB_MAIN_CSS.as_bytes())
        .map_err(|err| EpubError::Build(err.to_string()))?;
    builder
        .add_resource("styles/main.css", EPUB_MAIN_CSS.as_bytes(), "text/css")
        .map_err(|err| EpubError::Build(err.to_string()))?;
    builder
        .add_content(
            EpubContent::new("chapter.xhtml", chapter.as_bytes())
                .title(&metadata.title)
                .reftype(ReferenceType::Text),
        )
        .map_err(|err| EpubError::Build(err.to_string()))?;
    for (href, path) in &guarded_images {
        let bytes = fs::read(path)?;
        builder
            .add_resource(href, bytes.as_slice(), mime_for(path))
            .map_err(|err| EpubError::Build(err.to_string()))?;
    }
    for slot in &payload.mermaid_slots {
        if let Some(svg) = slot
            .svg_content
            .as_deref()
            .map(str::trim)
            .filter(|svg| !svg.is_empty())
        {
            let id = safe_mermaid_id(&slot.id).map_err(|err| EpubError::Conversion(err.0))?;
            builder
                .add_resource(format!("images/{id}.svg"), svg.as_bytes(), "image/svg+xml")
                .map_err(|err| EpubError::Build(err.to_string()))?;
        }
    }

    let mut raw = Vec::new();
    builder
        .generate(&mut raw)
        .map_err(|err| EpubError::Build(err.to_string()))?;
    let epub = replace_entries(
        &raw,
        &[
            ("OEBPS/nav.xhtml", nav.as_bytes()),
            ("OEBPS/toc.ncx", toc.as_bytes()),
            ("OEBPS/content.opf", opf.as_bytes()),
        ],
    )?;
    atomic_write_bytes(output_path, &epub)?;
    Ok(EpubExportResult {
        output_path: output_path.to_string_lossy().into_owned(),
        image_count: guarded_images.len(),
        mermaid_count: applied.mermaid_count,
        mermaid_fallback_count: applied.mermaid_fallback_count,
        warnings: Vec::new(),
    })
}

fn guard_images(
    workspace_root: &Path,
    image_refs: &[String],
) -> Result<Vec<(String, PathBuf)>, EpubError> {
    let root = dunce::canonicalize(workspace_root).map_err(|_| EpubError::OutsideWorkspace)?;
    let mut guarded = Vec::new();
    let mut used_names = Vec::new();
    for image_ref in image_refs {
        let candidate = Path::new(image_ref);
        if !candidate.is_absolute() {
            return Err(EpubError::OutsideWorkspace);
        }
        let canon = dunce::canonicalize(candidate).map_err(|_| EpubError::OutsideWorkspace)?;
        if !canon.is_file() || !canon.starts_with(&root) || canon == root {
            return Err(EpubError::OutsideWorkspace);
        }
        let original = canon
            .file_name()
            .map(|name| name.to_string_lossy().replace('\\', "_"))
            .filter(|name| !name.is_empty() && name != "." && name != "..")
            .ok_or(EpubError::OutsideWorkspace)?;
        let mut href_name = original.clone();
        let mut suffix = 2u32;
        while used_names.iter().any(|name| name == &href_name) {
            let path = Path::new(&original);
            let stem = path
                .file_stem()
                .map(|stem| stem.to_string_lossy().into_owned())
                .unwrap_or_else(|| "image".into());
            let ext = path
                .extension()
                .map(|ext| format!(".{}", ext.to_string_lossy()))
                .unwrap_or_default();
            href_name = format!("{stem}-{suffix}{ext}");
            suffix += 1;
        }
        used_names.push(href_name.clone());
        guarded.push((format!("images/{href_name}"), canon));
    }
    Ok(guarded)
}

fn mime_for(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_ascii_lowercase()
        .as_str()
    {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "webp" => "image/webp",
        "css" => "text/css",
        _ => "application/octet-stream",
    }
}

fn replace_entries(original: &[u8], replacements: &[(&str, &[u8])]) -> Result<Vec<u8>, EpubError> {
    let mut archive =
        ZipArchive::new(Cursor::new(original)).map_err(|err| EpubError::Build(err.to_string()))?;
    let mut entries = Vec::with_capacity(archive.len());
    for index in 0..archive.len() {
        let mut file = archive
            .by_index(index)
            .map_err(|err| EpubError::Build(err.to_string()))?;
        let name = file.name().to_string();
        let mut bytes = Vec::new();
        file.read_to_end(&mut bytes)?;
        entries.push((name, bytes));
    }
    if let Some(position) = entries.iter().position(|(name, _)| name == "mimetype") {
        let mimetype = entries.remove(position);
        entries.insert(0, mimetype);
    }
    let mut cursor = Cursor::new(Vec::new());
    {
        let mut writer = ZipWriter::new(&mut cursor);
        let stored = FileOptions::default().compression_method(CompressionMethod::Stored);
        let deflated = FileOptions::default().compression_method(CompressionMethod::Deflated);
        for (name, bytes) in &entries {
            let data = replacements
                .iter()
                .find(|(entry, _)| *entry == name)
                .map(|(_, data)| *data)
                .unwrap_or(bytes.as_slice());
            let options = if name == "mimetype" { stored } else { deflated };
            writer
                .start_file(name, options)
                .map_err(|err| EpubError::Build(err.to_string()))?;
            writer.write_all(data)?;
        }
        writer
            .finish()
            .map_err(|err| EpubError::Build(err.to_string()))?;
    }
    Ok(cursor.into_inner())
}
