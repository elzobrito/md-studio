/**
 * 053-E — Workspace Filesystem Reconciler Runtime
 *
 * Reconciliador de eventos do filesystem para o runtime multi-documento.
 * Conecta o watcher Rust existente (`workspace://change`) ao `OpenDocumentsRuntime`.
 *
 * Regras normativas:
 * 1. Confinamento e normalização de caminhos relativos ao workspace.
 * 2. Supressão de eco já garantida pelo backend Rust (WatcherHub.internal_saves).
 * 3. Rename de arquivo e pasta:
 *    - Se o arquivo aberto for renomeado, atualiza o path.
 *    - Se uma pasta for renomeada, atualiza todos os documentos abertos sob aquela pasta.
 * 4. Deleção externa (removed):
 *    - Se clean: marca status como "missing".
 *    - Se dirty: NUNCA descarta o buffer do usuário! Mantém isDirty=true com status "missing",
 *      permitindo salvar via Save As ou restaurar.
 * 5. Modificação externa (modified):
 *    - Se clean: pode recarregar ou marcar para atualização.
 *    - Se dirty: marca status como "conflicted" sem sobrescrever a digitação local.
 * 6. Burst coalescing: absorve rajadas de eventos (ex.: git checkout) de forma estável.
 */

export interface FsWatchEvent {
  type: "created" | "modified" | "removed" | "renamed";
  relativePath: string;
  from?: string;
  workspaceId: string;
}

export type ReconciledDocStatus = "clean" | "modified" | "conflicted" | "missing";

export interface ReconciledDocEntry {
  documentId: string;
  relativePath: string;
  isDirty: boolean;
  status: ReconciledDocStatus;
}

export interface IReconcilerDocumentHost {
  getOpenDocuments(): ReconciledDocEntry[];
  updateDocumentPath(documentId: string, newRelativePath: string): void;
  setDocumentStatus(documentId: string, newStatus: ReconciledDocStatus): void;
  reloadCleanDocument?(documentId: string): Promise<void>;
}

export class WorkspaceFsReconciler {
  private workspaceId: string;
  private host: IReconcilerDocumentHost;
  private pendingBatch: FsWatchEvent[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private batchDelayMs: number;
  private onBatchProcessed?: (events: FsWatchEvent[]) => void;

  constructor(
    workspaceId: string,
    host: IReconcilerDocumentHost,
    batchDelayMs = 50,
    onBatchProcessed?: (events: FsWatchEvent[]) => void
  ) {
    this.workspaceId = workspaceId;
    this.host = host;
    this.batchDelayMs = batchDelayMs;
    this.onBatchProcessed = onBatchProcessed;
  }

  public normalizePath(pathStr: string): string {
    return pathStr
      .replace(/\\/g, "/")
      .replace(/^\.\//, "")
      .replace(/\/+/g, "/")
      .replace(/\/+$/, "");
  }

  /**
   * Recebe um evento direto do watcher Rust (workspace://change)
   */
  public onEvent(event: FsWatchEvent): void {
    if (event.workspaceId !== this.workspaceId) return;

    this.pendingBatch.push(event);

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.flushBatch();
    }, this.batchDelayMs);
  }

  /**
   * Processa imediatamente os eventos pendentes (síncrono / forçado)
   */
  public flushBatch(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.pendingBatch.length === 0) return;

    const eventsToProcess = [...this.pendingBatch];
    this.pendingBatch = [];

    // Processa os eventos
    for (const evt of eventsToProcess) {
      this.reconcileSingleEvent(evt);
    }

    if (this.onBatchProcessed) {
      this.onBatchProcessed(eventsToProcess);
    }
  }

  private reconcileSingleEvent(event: FsWatchEvent): void {
    const relPath = this.normalizePath(event.relativePath);
    const openDocs = this.host.getOpenDocuments();

    switch (event.type) {
      case "modified": {
        // Encontra documento aberto com este caminho
        const doc = openDocs.find((d) => this.normalizePath(d.relativePath) === relPath);
        if (doc) {
          if (doc.isDirty) {
            // Conflito externo detectado: usuário alterou no editor E o arquivo mudou no disco
            this.host.setDocumentStatus(doc.documentId, "conflicted");
          } else {
            // Documento limpo: pode recarregar
            if (this.host.reloadCleanDocument) {
              void this.host.reloadCleanDocument(doc.documentId);
            }
          }
        }
        break;
      }

      case "removed": {
        // Encontra documentos afetados (arquivo direto ou contidos em pasta removida)
        for (const doc of openDocs) {
          const docPath = this.normalizePath(doc.relativePath);
          const isDirectMatch = docPath === relPath;
          const isInsideDir = docPath.startsWith(`${relPath}/`);

          if (isDirectMatch || isInsideDir) {
            // Documento foi removido do disco externamente
            // Regra R3: buffer NUNCA é descartado se dirty!
            this.host.setDocumentStatus(doc.documentId, "missing");
          }
        }
        break;
      }

      case "renamed": {
        const fromPath = event.from ? this.normalizePath(event.from) : null;
        if (!fromPath) break;

        for (const doc of openDocs) {
          const docPath = this.normalizePath(doc.relativePath);

          if (docPath === fromPath) {
            // Renomeação direta do arquivo
            this.host.updateDocumentPath(doc.documentId, relPath);
          } else if (docPath.startsWith(`${fromPath}/`)) {
            // Renomeação de pasta pai: atualiza o prefixo do caminho relativo
            const suffix = docPath.slice(fromPath.length);
            const newDocPath = `${relPath}${suffix}`;
            this.host.updateDocumentPath(doc.documentId, newDocPath);
          }
        }
        break;
      }

      case "created": {
        // Arquivo criado externamente: não afeta diretamente documentos abertos
        break;
      }
    }
  }

  public destroy(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.pendingBatch = [];
  }
}
