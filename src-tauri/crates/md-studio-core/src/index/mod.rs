pub mod document_metadata;
pub mod index_persistence;
pub mod metadata_extractor;
pub mod metadata_index;
pub mod reindex_engine;
pub mod workspace_scanner;
pub mod wiki_resolve;

pub use document_metadata::{DocumentMetadata, Heading, Link, WikiLink};
pub use index_persistence::{clear_index, index_path, load_index, save_index, INDEX_DIR, INDEX_FILE};
pub use metadata_extractor::{extract_metadata, extract_metadata_from_str, slugify};
pub use metadata_index::MetadataIndex;
pub use reindex_engine::{ReindexEngine, ReindexReport};
pub use workspace_scanner::WorkspaceScanner;
pub use wiki_resolve::{ResolvedWikiLink, WikiLinkStatus};
