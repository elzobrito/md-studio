# Architecture Specification: DocumentRuntime & OpenDocumentsRuntime (053-F)

## 1. Context & Objectives

As mandated by **053-nova-gui-R3.md** and spikes 053-B, 053-C, 053-D, and 053-E, MD Studio R3 migrates from a single active document model to a multi-document runtime capable of managing multiple concurrent tabs with complete isolation of editorial state, deterministic identity tracking, asynchronous persistence guards, crash recovery, and external filesystem event reconciliation.

## 2. Architecture Overview

The multi-document runtime consists of two primary layers:

1. **`DocumentRuntime` (Per-Document State):**
   - Encapsulates mutable runtime state for a single open tab/document (`documentId`).
   - Maintains:
     - `documentId`: Deterministic UUID/ULID identifying the open instance.
     - `canonicalPath`: Normalized workspace-relative path (or `null` for untitled buffers).
     - `editorState`: CodeMirror 6 `EditorState` instance preserving undo/redo history, selection, fold states, and transaction branches.
     - `contentIdentity`: Deterministic SHA-256 hash calculated over UTF-8 buffer contents.
     - `persistedContentIdentity`: Hash snapshot at last clean disk sync point.
     - `operationGeneration`: Monotonic counter incremented on every transaction for ordering and late-write rejection.
     - `status`: `clean | dirty | saving | conflict | missing | recovering`.
     - `untitledMetadata`: Sequence number `N`, creation timestamp, and local crash recovery key if untitled.
     - `saveQueue`: Dedicated instance of `SaveQueue` ensuring one write in flight and dirty coalescing.

2. **`OpenDocumentsRuntime` (Global Session Manager):**
   - Coordinates the set of open documents in memory.
   - Maintains:
     - Ordered list of `openDocumentIds` (tab order).
     - Active document ID (`activeDocumentId`).
     - Fast lookup indexes: `byId: Map<string, DocumentRuntime>` and `byPath: Map<string, string>` (canonical path to document ID).
     - External filesystem event integration via `IReconcilerDocumentHost` interface.
     - Session persistence and crash recovery loader on startup.

## 3. Key Invariants & Contracts

1. **Deterministic Identity vs Monotonic Generation:**
   - Dirty status is strictly calculated as:
     `isContentDirty = (currentContentIdentity !== persistedContentIdentity)`
   - Monotonic generation (`operationGeneration`) is strictly an async ordering token, preventing stale save callbacks from marking dirty buffers as clean.

2. **Undo-to-Clean & Redo-to-Dirty:**
   - Because `contentIdentity` is content-derived (SHA-256), undoing all changes back to the exact persisted text naturally restores `isContentDirty === false` without synthetic tracking flags.

3. **External Mutation & Reconciliation Safety:**
   - If an external FS event signals a modification while a buffer is `dirty`, the runtime flags `status = 'conflict'` and does not silently overwrite the in-memory buffer.
   - If an external FS event signals deletion (`unlink`), clean documents are closed or flagged missing; dirty documents enter `status = 'missing'` with buffer preserved, allowing Save As recovery.

4. **CodeMirror 6 Single View Strategy (ADR-053-D):**
   - The DOM maintains a single `EditorView`. Switching active tabs invokes `view.setState(docRuntime.editorState)`. This ensures P50 tab-switch latency under 2ms with zero DOM thrashing and 100% preservation of undo/redo history.

## 4. Verification & Testing

Unit and integration tests in `tests/runtime/open-documents-runtime.test.ts` verify:
- Multi-document tab lifecycle (open, activate, close).
- Path indexing and duplicate prevention.
- Dirty tracking, undo-to-clean transitions.
- Untitled document creation and promotion via Save As.
- Reconciliation hooks under concurrent operations.
