mod css_templates;
mod epub_builder;
mod epub_types;
mod nav_generator;
mod xhtml_converter;

pub use css_templates::EPUB_MAIN_CSS;
pub use epub_builder::{build_epub, generate_content_opf, EpubError};
pub use epub_types::{
    normalize_metadata, EpubExportPayload, EpubExportResult, EpubMetadata, ManifestItem,
    MermaidSlot,
};
pub use nav_generator::{generate_nav_xhtml, generate_toc_ncx};
pub use xhtml_converter::{
    apply_mermaid_slots, extract_headings, html_to_xhtml, ConversionError, EpubHeading,
};
