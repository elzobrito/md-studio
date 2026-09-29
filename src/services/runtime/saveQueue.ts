/**
 * 053-B — SaveQueue & SaveTicket Runtime
 *
 * Implementação da fila de salvamento assíncrona por documento.
 * Regras normativas:
 * 1. Um único save in-flight por documento (one-write-in-flight).
 * 2. SaveTicket vincula documentId, generation, contentIdentity, targetPath e expectedDiskHash.
 * 3. Coalescência de auto-save: requisições adicionais enquanto um write está in-flight
 *    coalescem no último estado pendente (pendingTicket).
 * 4. Late write race: confirmação de save antigo NUNCA limpa dirty de edição subsequente.
 * 5. expectedDiskHash: validação estrita antes do write no filesystem para detecção de conflitos.
 */

import {
  computeContentIdentitySync,
  isContentDirty,
  OperationGenerationManager,
} from "./contentIdentity";

export type PersistenceStatus =
  | "clean"
  | "modified"
  | "saving"
  | "conflicted"
  | "error";

export interface SaveTicket {
  ticketId: string;
  documentId: string;
  targetPath: string;
  generation: number;
  contentIdentity: string;
  expectedDiskHash: string;
  content: string;
  createdAt: number;
}

export interface SaveResult {
  ok: boolean;
  newDiskHash?: string;
  error?: "conflict" | "io" | "aborted" | string;
}

export type WriteProvider = (ticket: SaveTicket) => Promise<SaveResult>;

export interface DocumentSaveState {
  documentId: string;
  targetPath: string;
  currentContent: string;
  currentContentIdentity: string;
  persistedContentIdentity: string;
  persistedDiskHash: string;
  generation: number;
  isDirty: boolean;
  status: PersistenceStatus;
  hasInFlightWrite: boolean;
  hasPendingWrite: boolean;
}

export class DocumentSaveQueue {
  public readonly documentId: string;
  public targetPath: string;

  private content: string;
  private currentContentIdentity: string;
  private persistedContentIdentity: string;
  private persistedDiskHash: string;

  private genManager: OperationGenerationManager;
  private status: PersistenceStatus = "clean";

  private activeTicket: SaveTicket | null = null;
  private pendingTicket: SaveTicket | null = null;
  private writeProvider: WriteProvider;

  private listeners: Set<(state: DocumentSaveState) => void> = new Set();
  private ticketCounter = 0;

  constructor(
    documentId: string,
    targetPath: string,
    initialContent: string,
    initialDiskHash: string,
    writeProvider: WriteProvider
  ) {
    this.documentId = documentId;
    this.targetPath = targetPath;
    this.content = initialContent;
    this.currentContentIdentity = computeContentIdentitySync(initialContent);
    this.persistedContentIdentity = this.currentContentIdentity;
    this.persistedDiskHash = initialDiskHash;
    this.genManager = new OperationGenerationManager(1);
    this.writeProvider = writeProvider;
    this.status = "clean";
  }

  public getState(): DocumentSaveState {
    const isDirty = isContentDirty(
      this.currentContentIdentity,
      this.persistedContentIdentity
    );
    return {
      documentId: this.documentId,
      targetPath: this.targetPath,
      currentContent: this.content,
      currentContentIdentity: this.currentContentIdentity,
      persistedContentIdentity: this.persistedContentIdentity,
      persistedDiskHash: this.persistedDiskHash,
      generation: this.genManager.generation,
      isDirty,
      status: this.status,
      hasInFlightWrite: this.activeTicket !== null,
      hasPendingWrite: this.pendingTicket !== null,
    };
  }

  public subscribe(listener: (state: DocumentSaveState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  /**
   * Registra uma alteração no conteúdo editorial (digitação ou comando).
   * Incrementa monotônicamente a geração e recalcula dirty por equivalência de hash.
   */
  public edit(newContent: string): void {
    this.content = newContent;
    this.currentContentIdentity = computeContentIdentitySync(newContent);
    this.genManager.next();

    this.recomputeStatus();
    this.notify();
  }

  /**
   * Aplica um Undo ou Redo retornando a um snapshot anterior.
   * Se o conteúdo for equivalente ao persistido em disco, o documento retorna
   * ao estado clean (dirty = false), mesmo que a geração de operações tenha avançado!
   */
  public stepHistory(historicalContent: string): void {
    this.content = historicalContent;
    this.currentContentIdentity = computeContentIdentitySync(historicalContent);
    this.genManager.next();

    this.recomputeStatus();
    this.notify();
  }

  /**
   * Solicita o salvamento assíncrono do documento.
   * Se já houver uma gravação em voo (in-flight), a nova requisição é enfileirada
   * e coalescida como pendingTicket.
   */
  public async requestSave(): Promise<SaveResult | null> {
    const isDirty = isContentDirty(
      this.currentContentIdentity,
      this.persistedContentIdentity
    );

    // Se já estiver limpo e sem gravação pendente, save manual é no-op
    if (!isDirty && !this.activeTicket && !this.pendingTicket) {
      return { ok: true, newDiskHash: this.persistedDiskHash };
    }

    this.ticketCounter += 1;
    const ticket: SaveTicket = {
      ticketId: `${this.documentId}-ticket-${this.ticketCounter}`,
      documentId: this.documentId,
      targetPath: this.targetPath,
      generation: this.genManager.generation,
      contentIdentity: this.currentContentIdentity,
      expectedDiskHash: this.persistedDiskHash,
      content: this.content,
      createdAt: Date.now(),
    };

    if (this.activeTicket !== null) {
      // Coalescing: sobrescreve qualquer ticket pendente com o estado mais recente
      this.pendingTicket = ticket;
      this.notify();
      return null;
    }

    return this.dispatchTicket(ticket);
  }

  private async dispatchTicket(ticket: SaveTicket): Promise<SaveResult> {
    this.activeTicket = ticket;
    this.status = "saving";
    this.notify();

    try {
      const result = await this.writeProvider(ticket);
      this.handleSaveAck(ticket, result);
      return result;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const failureResult: SaveResult = { ok: false, error: errorMsg };
      this.handleSaveAck(ticket, failureResult);
      return failureResult;
    }
  }

  private handleSaveAck(ticket: SaveTicket, result: SaveResult): void {
    // Validação estrita: o ticket deve pertencer a este documento
    if (ticket.documentId !== this.documentId) {
      return;
    }

    this.activeTicket = null;

    if (result.ok && result.newDiskHash) {
      // Gravação bem sucedida:
      // O conteúdo persistido passa a ser o do ticket que foi gravado
      this.persistedContentIdentity = ticket.contentIdentity;
      this.persistedDiskHash = result.newDiskHash;

      // Late write acknowledgment guard:
      // Se o usuário digitou novos caracteres enquanto a gravação estava em voo,
      // currentContentIdentity != ticket.contentIdentity, logo continua dirty!
      const isDirty = isContentDirty(
        this.currentContentIdentity,
        this.persistedContentIdentity
      );
      this.status = isDirty ? "modified" : "clean";
    } else {
      if (result.error === "conflict" || result.error === "hash mismatch") {
        this.status = "conflicted";
      } else {
        this.status = "error";
      }
    }

    this.notify();

    // Se havia um ticket pendente acumulado durante o write, despacha-o agora
    if (this.pendingTicket !== null) {
      const nextTicket = this.pendingTicket;
      this.pendingTicket = null;
      // Atualiza o expectedDiskHash para o novo hash resultante do save anterior
      nextTicket.expectedDiskHash = this.persistedDiskHash;
      // Despacha assincronamente a próxima gravação coalescida
      void this.dispatchTicket(nextTicket);
    }
  }

  private recomputeStatus(): void {
    const isDirty = isContentDirty(
      this.currentContentIdentity,
      this.persistedContentIdentity
    );

    if (this.status === "saving") {
      // Durante o save ativo, o status permanece saving até o ack
      return;
    }

    if (isDirty) {
      this.status = "modified";
    } else {
      this.status = "clean";
    }
  }
}
