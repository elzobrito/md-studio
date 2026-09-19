pub mod index;
pub mod launch;
pub mod parser;
pub mod persistence;
pub mod workspace;

pub use index::{
    clear_index, extract_metadata, extract_metadata_from_str, index_path, load_index, save_index,
    DocumentMetadata, Heading, Link, MetadataIndex, ReindexEngine, ReindexReport, WikiLink,
    WorkspaceScanner, INDEX_DIR, INDEX_FILE,
};
pub use launch::{first_existing_markdown_path, is_markdown_path, path_from_arg};
pub use parser::{parse_tags, parse_wiki_links};
pub use persistence::{atomic_save, atomic_write_bytes, content_hash, read_file, SaveError};
pub use workspace::{resolve_within, Workspace, WorkspaceError, WorkspaceRegistry};
