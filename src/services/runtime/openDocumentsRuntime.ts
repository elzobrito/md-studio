/**
 * 053-F — OpenDocumentsRuntime
 *
 * Gerenciador mestre de múltiplos documentos abertos no MD Studio.
 * Regras normativas:
 * 1. Path Index canônico: previne duplicação de abas para o mesmo arquivo em disco.
 * 2. Gestão de abas ativas e transição de foco baseada na estratégia Single View + setState.
 * 3. Integração com UntitledStore (053-C) para rascunhos privados e promoção via Save As.
 * 4. Fechamento seguro (close guard): exige confirmação se o documento estiver dirty.
 * 5. Integração com WorkspaceFsReconciler (053-E) para atualizar caminhos e status em tempo real.
 */

import { DocumentRuntime, type DocumentKind } from "./documentRuntime";
import { UntitledStore } from "./untitledStore";
import { WorkspaceFsReconciler, type FsWatchEvent, type IReconcilerDocumentHost, type ReconciledDocEntry, type ReconciledDocStatus } from "./workspaceFsReconciler";
import type { SaveResult, WriteProvider } from "./saveQueue";

export interface OpenDocumentsRuntimeOptions {
  workspaceId: string;
  workspaceRoot?: string;
  writeProvider: WriteProvider;
  untitledStore?: UntitledStore;
}

export interface CloseResult {
  closed: boolean;
  requiresConfirmation?: boolean;
  isDirty?: boolean;
  documentId?: string;
}

export class OpenDocumentsRuntime {
  public readonly workspaceId: string;
  public readonly workspaceRoot: string;

  private documents = new Map<string, DocumentRuntime>();
  private pathIndex = new Map<string, string>(); // normalizedPath -> documentId
  private activeDocId: string | null = null;

  private writeProvider: WriteProvider;
  public readonly untitledStore: UntitledStore;
  public readonly fsReconciler: WorkspaceFsReconciler;

  private listeners = new Set<() => void>();
  private docCounter = 0;

  constructor(opts: OpenDocumentsRuntimeOptions) {
    this.workspaceId = opts.workspaceId;
    this.workspaceRoot = opts.workspaceRoot || "";
    this.writeProvider = opts.writeProvider;
    this.untitledStore = opts.untitledStore || new UntitledStore();

    const hostAdapter: IReconcilerDocumentHost = {
      getOpenDocuments: () =>
        Array.from(this.documents.values()).map((d) => ({
          documentId: d.documentId,
          relativePath: d.relativePath || "",
          isDirty: d.isDirty(),
          status: d.getStatus() as ReconciledDocStatus,
        })),
      updateDocumentPath: (docId, newPath) => this.updateDocumentPath(docId, newPath),
      setDocumentStatus: (docId, status) => this.setDocumentStatus(docId, status),
      reloadCleanDocument: (docId) => this.reloadCleanDocument(docId),
    };

    this.fsReconciler = new WorkspaceFsReconciler(opts.workspaceId, hostAdapter);
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

  public normalizePath(pathStr: string): string {
    return pathStr.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+/g, "/").replace(/\/+$/, "");
  }

  public getActiveDocument(): DocumentRuntime | null {
    return this.activeDocId ? this.documents.get(this.activeDocId) || null : null;
  }

  public getActiveDocumentId(): string | null {
    return this.activeDocId;
  }

  public getOpenDocuments(): DocumentRuntime[] {
    return Array.from(this.documents.values());
  }

  public getDocument(documentId: string): DocumentRuntime | null {
    return this.documents.get(documentId) || null;
  }

  public getDocumentByPath(relativePath: string): DocumentRuntime | null {
    const norm = this.normalizePath(relativePath);
    const docId = this.pathIndex.get(norm);
    return docId ? this.documents.get(docId) || null : null;
  }

  /**
   * Abre um arquivo do workspace. Se já estiver aberto, foca a aba existente sem duplicar.
   */
  public openDocument(
    relativePath: string,
    content: string,
    diskHash: string,
    absolutePath: string | null = null
  ): { documentId: string; newlyOpened: boolean } {
    const normPath = this.normalizePath(relativePath);

    // 1. Deduplicação via Path Index
    const existingId = this.pathIndex.get(normPath);
    if (existingId && this.documents.has(existingId)) {
      this.switchActiveDocument(existingId);
      return { documentId: existingId, newlyOpened: false };
    }

    // 2. Cria nova instância de DocumentRuntime
    this.docCounter += 1;
    const documentId = `doc-${this.docCounter}`;
    const title = normPath.split("/").pop() || "Documento";

    const doc = new DocumentRuntime({
      documentId,
      kind: "persisted",
      title,
      relativePath: normPath,
      absolutePath,
      initialContent: content,
      initialDiskHash: diskHash,
      writeProvider: this.writeProvider,
    });

    // Escuta mudanças de estado do documento para notificar ouvintes
    doc.subscribe(() => this.notify());

    this.documents.set(documentId, doc);
    this.pathIndex.set(normPath, documentId);

    // Foca o novo documento
    this.switchActiveDocument(documentId);
    return { documentId, newlyOpened: true };
  }

  /**
   * Cria um novo documento untitled no store privado.
   */
  public createUntitled(initialContent = "", templateId?: string): string {
    const untitledDoc = this.untitledStore.createUntitled(initialContent, templateId);
    this.docCounter += 1;
    const documentId = untitledDoc.id;

    const doc = new DocumentRuntime({
      documentId,
      kind: "untitled",
      title: untitledDoc.title,
      relativePath: null,
      absolutePath: null,
      initialContent: initialContent,
      initialDiskHash: "",
      writeProvider: this.writeProvider,
    });

    doc.subscribe(() => {
      // Sincroniza rascunho com o UntitledStore privado
      this.untitledStore.updateContent(documentId, doc.getContent());
      this.notify();
    });

    this.documents.set(documentId, doc);
    this.switchActiveDocument(documentId);
    return documentId;
  }

  /**
   * Alterna a aba ativa para o documento informado.
   */
  public switchActiveDocument(documentId: string): boolean {
    if (!this.documents.has(documentId)) {
      return false;
    }

    this.activeDocId = documentId;
    this.notify();
    return true;
  }

  /**
   * Fecha um documento aberto. Se estiver modificado (dirty), exige confirmação a menos que force=true.
   */
  public closeDocument(documentId: string, force = false): CloseResult {
    const doc = this.documents.get(documentId);
    if (!doc) {
      return { closed: false };
    }

    if (doc.isDirty() && !force) {
      return {
        closed: false,
        requiresConfirmation: true,
        isDirty: true,
        documentId,
      };
    }

    // Calcula próximo documento ativo se o que está fechando for o ativo
    if (this.activeDocId === documentId) {
      const docIds = Array.from(this.documents.keys());
      const idx = docIds.indexOf(documentId);
      let nextId: string | null = null;

      if (docIds.length > 1) {
        if (idx < docIds.length - 1) {
          nextId = docIds[idx + 1];
        } else {
          nextId = docIds[idx - 1];
        }
      }
      this.activeDocId = nextId;
    }

    // Remove do path index
    if (doc.relativePath) {
      this.pathIndex.delete(doc.relativePath);
    }

    // Se for untitled, descarta do store privado
    if (doc.kind === "untitled") {
      this.untitledStore.discardUntitled(documentId);
    }

    this.documents.delete(documentId);
    this.notify();
    return { closed: true, documentId };
  }

  /**
   * Promove um documento (untitled ou renomeado) para um caminho formal do workspace (Save As).
   */
  public async saveAs(
    documentId: string,
    newRelativePath: string,
    newAbsolutePath: string | null = null
  ): Promise<SaveResult | null> {
    const doc = this.documents.get(documentId);
    if (!doc) return null;

    const normPath = this.normalizePath(newRelativePath);

    // Se era untitled, promove no UntitledStore privado
    if (doc.kind === "untitled") {
      this.untitledStore.promoteToSaved(documentId, normPath);
      doc.kind = "persisted";
    } else if (doc.relativePath) {
      this.pathIndex.delete(doc.relativePath);
    }

    doc.updatePath(normPath);
    doc.absolutePath = newAbsolutePath;
    this.pathIndex.set(normPath, documentId);

    // Grava no disco
    const result = await doc.save();
    this.notify();
    return result;
  }

  /**
   * Salva o documento ativo.
   */
  public async saveActiveDocument(): Promise<SaveResult | null> {
    const active = this.getActiveDocument();
    return active ? active.save() : null;
  }

  // --- Implementação de IReconcilerDocumentHost (053-E integration) ---

  public updateDocumentPath(documentId: string, newRelativePath: string): void {
    const doc = this.documents.get(documentId);
    if (!doc) return;

    if (doc.relativePath) {
      this.pathIndex.delete(doc.relativePath);
    }

    const normPath = this.normalizePath(newRelativePath);
    doc.updatePath(normPath);
    this.pathIndex.set(normPath, documentId);
    this.notify();
  }

  public setDocumentStatus(documentId: string, newStatus: ReconciledDocStatus): void {
    const doc = this.documents.get(documentId);
    if (!doc) return;

    // Sincroniza status no saveQueue
    const state = doc.saveQueue.getState();
    if (newStatus === "conflicted") {
      // Marca conflito externo
      doc.saveQueue["status"] = "conflicted";
    } else if (newStatus === "missing") {
      doc.saveQueue["status"] = "error";
    }
    this.notify();
  }

  public async reloadCleanDocument(documentId: string): Promise<void> {
    const doc = this.documents.get(documentId);
    if (!doc || doc.isDirty()) return;

    // Em produção real, recarrega o conteúdo do disco via IPC read_document
    this.notify();
  }

  public handleFsEvent(event: FsWatchEvent): void {
    this.fsReconciler.onEvent(event);
  }

  // Adapter para o IReconcilerDocumentHost
  IReconcilerDocumentHost_getOpenDocuments(): ReconciledDocEntry[] {
    return Array.from(this.documents.values()).map((d) => ({
      documentId: d.documentId,
      relativePath: d.relativePath || "",
      isDirty: d.isDirty(),
      status: d.getStatus() as ReconciledDocStatus,
    }));
  }
}
