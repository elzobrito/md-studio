pub mod assets;
pub mod doctor;
pub mod export;
pub mod git;
pub mod graph;
pub mod history;
pub mod index;
pub mod launch;
pub mod parser;
pub mod persistence;
pub mod workspace;

pub use graph::{
    EdgeRelation, GraphEdge, GraphNode, GraphSnapshot, ImpactReport, KnowledgeGraph, NodeKind,
    RelationshipPath, SubgraphResult,
};

pub use assets::{
    analyze_assets, calculate_sha256, save_pasted_asset, AssetDiagnostic, AssetDiagnosticKind,
    AssetError, AssetRecord,
};
pub use doctor::{Doctor, DoctorDiagnostic, DoctorQuickFix};

pub use export::{
    build_epub, extract_headings, html_to_xhtml, EpubExportPayload, EpubExportResult, EpubMetadata,
    MermaidSlot,
};
pub use git::{FileDiffGutter, GitCommitSummary, GitError, GitFileStatus, GitProvider};
pub use history::{
    DocumentHistoryManifest, DocumentRestoredSnapshot, HistoryEntry, HistoryError, HistorySnapshot,
    HistoryStore,
};
pub use index::{
    clear_index, extract_metadata, extract_metadata_from_str, index_path, load_index, save_index,
    BacklinkGroup, BacklinkIndex, BacklinkOccurrence, BacklinkResult, DocumentMetadata, Heading,
    Link, MetadataIndex, ReindexEngine, ReindexReport, ResolvedWikiLink, WikiLink, WikiLinkStatus,
    WorkspaceScanner, INDEX_DIR, INDEX_FILE,
};
pub use launch::{first_existing_markdown_path, is_markdown_path, path_from_arg};
pub use parser::{parse_tags, parse_wiki_links};
pub use persistence::{
    atomic_save, atomic_save_with_previous, atomic_write_bytes, content_hash, read_file,
    AtomicSaveOutcome, PreviousDocumentState, SaveError,
};
pub use workspace::{resolve_within, Workspace, WorkspaceError, WorkspaceRegistry};
