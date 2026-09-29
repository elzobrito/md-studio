/**
 * 053-F — DocumentRuntime
 *
 * Encapsula o estado completo de um documento individual aberto no MD Studio.
 * Isolamento estrito por documentId:
 * - Conteúdo, contentIdentity e histórico de operações
 * - Fila de gravação assíncrona (DocumentSaveQueue)
 * - Sessão de editor CodeMirror (EditorState com historyField)
 * - Posição de cursor, seleção e scroll
 * - Status de persistência ("clean" | "modified" | "saving" | "conflicted" | "missing" | "error")
 */

import { EditorState, type Extension } from "@codemirror/state";
import { history } from "@codemirror/commands";
import { DocumentSaveQueue, type PersistenceStatus, type SaveResult, type WriteProvider } from "./saveQueue";
import { computeContentIdentitySync } from "./contentIdentity";

export type DocumentKind = "persisted" | "untitled";

export interface DocumentRuntimeOptions {
  documentId: string;
  kind: DocumentKind;
  title: string;
  relativePath: string | null;
  absolutePath: string | null;
  initialContent: string;
  initialDiskHash: string;
  writeProvider: WriteProvider;
  extraExtensions?: Extension[];
}

export class DocumentRuntime {
  public readonly documentId: string;
  public kind: DocumentKind;
  public title: string;
  public relativePath: string | null;
  public absolutePath: string | null;

  public readonly saveQueue: DocumentSaveQueue;
  public editorState: EditorState;
  public scrollPosition = { top: 0, left: 0 };
  public selection = { anchor: 0, head: 0 };

  private listeners = new Set<() => void>();

  constructor(opts: DocumentRuntimeOptions) {
    this.documentId = opts.documentId;
    this.kind = opts.kind;
    this.title = opts.title;
    this.relativePath = opts.relativePath;
    this.absolutePath = opts.absolutePath;

    // Inicializa o SaveQueue para este documento
    this.saveQueue = new DocumentSaveQueue(
      opts.documentId,
      opts.relativePath || `untitled:${opts.documentId}`,
      opts.initialContent,
      opts.initialDiskHash,
      opts.writeProvider
    );

    // Inicializa o EditorState com histórico isolado de undo/redo
    this.editorState = EditorState.create({
      doc: opts.initialContent,
      extensions: [history(), ...(opts.extraExtensions || [])],
    });

    // Sincroniza notificações do SaveQueue
    this.saveQueue.subscribe(() => {
      this.notify();
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) {
      l();
    }
  }

  public getContent(): string {
    return this.saveQueue.getState().currentContent;
  }

  public getContentIdentity(): string {
    return this.saveQueue.getState().currentContentIdentity;
  }

  public isDirty(): boolean {
    return this.saveQueue.getState().isDirty;
  }

  public getStatus(): PersistenceStatus {
    return this.saveQueue.getState().status;
  }

  public getGeneration(): number {
    return this.saveQueue.getState().generation;
  }

  /**
   * Atualiza o conteúdo editorial a partir de digitação ou transação do CodeMirror.
   */
  public editContent(newContent: string): void {
    this.saveQueue.edit(newContent);
    this.notify();
  }

  /**
   * Atualiza o EditorState quando a view ativa sofre transações.
   */
  public updateEditorState(newState: EditorState): void {
    this.editorState = newState;
    const newContent = newState.doc.toString();
    const currentContent = this.getContent();

    if (newContent !== currentContent) {
      this.saveQueue.edit(newContent);
    }

    const sel = newState.selection.main;
    this.selection = { anchor: sel.anchor, head: sel.head };
    this.notify();
  }

  /**
   * Aplica navegação no histórico (undo/redo).
   */
  public stepHistory(content: string): void {
    this.saveQueue.stepHistory(content);
    this.notify();
  }

  /**
   * Dispara o salvamento deste documento.
   */
  public async save(): Promise<SaveResult | null> {
    return this.saveQueue.requestSave();
  }

  /**
   * Atualiza o caminho do documento após renomeação no filesystem.
   */
  public updatePath(newRelativePath: string, newTitle?: string): void {
    this.relativePath = newRelativePath;
    this.title = newTitle || newRelativePath.split("/").pop() || this.title;
    this.saveQueue.targetPath = newRelativePath;
    this.notify();
  }

  public setScroll(top: number, left: number): void {
    this.scrollPosition = { top, left };
  }

  public setSelection(anchor: number, head: number): void {
    this.selection = { anchor, head };
  }
}
