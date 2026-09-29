# Specification & Architecture: Semantic Pipeline & Bounded Artifact Caches (053-G)

## 1. Context & Objectives

In accordance with normative sections 43–53 of **053-nova-gui-R3.md**, task **053-G** establishes:
1. **Decoupled Semantic Projections:** Projections such as Table of Contents (TOC/Headings), outgoing wiki links, block references (`^block-id`), annotations (TODOs/FIXMEs), frontmatter, and metrics are derived strictly from canonical markdown content, without requiring the Preview DOM to be mounted or active.
2. **Stale-Result Rejection:** All asynchronous semantic and preview calculations are stamped with `(documentId, operationGeneration, contentIdentity)`. If concurrent editing advances the document generation or identity before an async operation completes, the stale result is immediately discarded, preventing visual corruption.
3. **Bounded LRU Artifact Caching:** Memory is protected by enforcing deterministic `maxEntries` and `maxEstimatedBytes` budgets with LRU eviction and active-document preservation, preventing unbounded cache growth.

## 2. Core Components

### `DocumentSemanticModel` (`src/services/runtime/semanticModel.ts`)
- Pure data structure encapsulating:
  - `documentId`, `operationGeneration`, `contentIdentity`, `createdAt`
  - `headings`: Extracted from AST/TOC parser
  - `outgoingLinks`: Wiki links and targets
  - `blocks`: Positional block identifiers (`^id`)
  - `todos`: Parsed annotations
  - `metrics`: Word, line, heading, link, and asset counters
  - `readingTimeMinutes`: Standard estimate (~200 wpm)
  - `hasDiagrams`, `hasCodeBlocks`

### `BoundedArtifactCache` (`src/services/runtime/artifactCache.ts`)
- Generic LRU cache indexing artifacts by `${documentId}:${contentIdentity}:${operationGeneration}`.
- Tracks exact metrics: `hits`, `misses`, `evictions`, `entries`, `estimatedBytes`.
- Eviction order favors least recently used entries, while preserving the currently active document whenever other candidates are available.
- Explicit document purge via `evictDocument(documentId)` on tab close or file deletion.

### `SemanticPipeline` (`src/services/runtime/semanticPipeline.ts`)
- Computes `DocumentSemanticModel` synchronously or through cache lookup.
- Coordinates asynchronous preview rendering (`processMarkdown`) with stale-result verification against live document state.
- Exposes cache metrics for internal diagnostics.

## 3. Verification & Compliance

- Test suite `tests/runtime/semantic-pipeline-cache.test.ts` (9 tests) verifies:
  - Cache hits, misses, and exact key matching
  - LRU eviction when `maxEntries` is exceeded
  - Byte budget eviction when `maxEstimatedBytes` is exceeded
  - Active document preservation during eviction
  - Full document cleanup on `evictDocument`
  - Zero-DOM semantic model extraction
  - Stale async result rejection under concurrent edits
- Full runtime suite (`tests/runtime/` — 43 tests) passes 100%.
