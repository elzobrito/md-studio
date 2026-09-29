/**
 * 053-C — Untitled Recovery Store Runtime
 *
 * Armazenamento privado da aplicação para documentos sem caminho físico em disco (untitled).
 * Regras normativas:
 * 1. Documentos untitled possuem identidade estável (untitled-1, untitled-2, ...) e não possuem
 *    arquivo físico associado no workspace até o Save As formal.
 * 2. Rascunhos residem no domínio privado do app (app-private storage), nunca criando
 *    arquivos invisíveis no workspace do usuário.
 * 3. Crash recovery: ao reiniciar, lista e restaura rascunhos de untitled não gravados.
 * 4. Save As Promotion: ao salvar formalmente em disco, o documento é promovido e seu rascunho
 *    privado é removido atômica e imediatamente (cleanup).
 * 5. Tolerância a falhas de storage (ex.: quota excedida) sem travar a interface.
 * 6. Sem acoplamento com SQLite (conforme R3).
 */

import { computeContentIdentitySync } from "./contentIdentity";

export interface UntitledDocument {
  id: string; // e.g. "untitled-1"
  title: string; // e.g. "Sem título 1"
  content: string;
  createdAt: number;
  updatedAt: number;
  templateId?: string;
  contentIdentity: string;
}

export interface UntitledRecoveryRecord {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  templateId?: string;
  contentIdentity: string;
}

export interface AppStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
}

export class MemoryStorageAdapter implements AppStorageAdapter {
  private data = new Map<string, string>();
  private shouldFailWrites = false;

  public getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    if (this.shouldFailWrites) {
      throw new Error("QuotaExceededError: LocalStorage quota exceeded");
    }
    this.data.set(key, value);
  }

  public removeItem(key: string): void {
    this.data.delete(key);
  }

  public keys(): string[] {
    return Array.from(this.data.keys());
  }

  public simulateFailure(fail: boolean): void {
    this.shouldFailWrites = fail;
  }
}

export class LocalStorageAdapter implements AppStorageAdapter {
  public getItem(key: string): string | null {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  }

  public setItem(key: string, value: string): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
  }

  public removeItem(key: string): void {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(key);
  }

  public keys(): string[] {
    if (typeof localStorage === "undefined") return [];
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) keys.push(k);
    }
    return keys;
  }
}

export class UntitledStore {
  private static STORAGE_PREFIX = "mdstudio:untitled:recovery:";
  private static INDEX_KEY = "mdstudio:untitled:index";

  private documents = new Map<string, UntitledDocument>();
  private storage: AppStorageAdapter;
  private sequenceCounter = 0;

  constructor(storageAdapter?: AppStorageAdapter) {
    this.storage = storageAdapter ?? (typeof localStorage !== "undefined" ? new LocalStorageAdapter() : new MemoryStorageAdapter());
    this.restoreIndex();
  }

  private getKey(id: string): string {
    return `${UntitledStore.STORAGE_PREFIX}${id}`;
  }

  private restoreIndex(): void {
    try {
      const rawIndex = this.storage.getItem(UntitledStore.INDEX_KEY);
      if (rawIndex) {
        const parsed = JSON.parse(rawIndex) as { counter: number; ids: string[] };
        this.sequenceCounter = parsed.counter || 0;
      }
    } catch {
      // Ignora falhas de parse e inicia índice limpo
      this.sequenceCounter = 0;
    }
  }

  private persistIndex(): void {
    try {
      const ids = Array.from(this.documents.keys());
      const payload = JSON.stringify({ counter: this.sequenceCounter, ids });
      this.storage.setItem(UntitledStore.INDEX_KEY, payload);
    } catch (err) {
      console.warn("[UntitledStore] Falha ao persistir índice:", err);
    }
  }

  /**
   * Cria um novo documento untitled com título automático sequencial (Sem título N).
   */
  public createUntitled(initialContent = "", templateId?: string): UntitledDocument {
    this.sequenceCounter += 1;
    const id = `untitled-${this.sequenceCounter}`;
    const title = `Sem título ${this.sequenceCounter}`;
    const now = Date.now();
    const contentIdentity = computeContentIdentitySync(initialContent);

    const doc: UntitledDocument = {
      id,
      title,
      content: initialContent,
      createdAt: now,
      updatedAt: now,
      templateId,
      contentIdentity,
    };

    this.documents.set(id, doc);
    this.persistSnapshot(doc);
    this.persistIndex();

    return { ...doc };
  }

  /**
   * Atualiza o conteúdo editorial do documento untitled e persiste o snapshot privado.
   */
  public updateContent(id: string, newContent: string): UntitledDocument | null {
    const doc = this.documents.get(id);
    if (!doc) return null;

    doc.content = newContent;
    doc.updatedAt = Date.now();
    doc.contentIdentity = computeContentIdentitySync(newContent);

    this.persistSnapshot(doc);
    return { ...doc };
  }

  public getDocument(id: string): UntitledDocument | null {
    const doc = this.documents.get(id);
    return doc ? { ...doc } : null;
  }

  public listDocuments(): UntitledDocument[] {
    return Array.from(this.documents.values()).map((d) => ({ ...d }));
  }

  /**
   * Salva o snapshot no storage privado da aplicação com tratamento de falhas.
   */
  private persistSnapshot(doc: UntitledDocument): void {
    try {
      const record: UntitledRecoveryRecord = {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        templateId: doc.templateId,
        contentIdentity: doc.contentIdentity,
      };
      this.storage.setItem(this.getKey(doc.id), JSON.stringify(record));
    } catch (err) {
      // Degradação graciosa: loga aviso sem travar execução (memória continua íntegra)
      console.warn(`[UntitledStore] Falha de quota ao persistir rascunho de ${doc.id}:`, err);
    }
  }

  /**
   * Lista todos os rascunhos de untitled disponíveis para recuperação pós-crash.
   */
  public listRecoverableSnapshots(): UntitledRecoveryRecord[] {
    const records: UntitledRecoveryRecord[] = [];
    const keys = this.storage.keys();

    for (const key of keys) {
      if (key.startsWith(UntitledStore.STORAGE_PREFIX)) {
        try {
          const raw = this.storage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw) as UntitledRecoveryRecord;
            records.push(parsed);
          }
        } catch {
          // Ignora registros corrompidos
        }
      }
    }

    return records.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Restaura um rascunho recuperado no store ativo.
   */
  public recoverSnapshot(record: UntitledRecoveryRecord): UntitledDocument {
    const doc: UntitledDocument = {
      id: record.id,
      title: record.title,
      content: record.content,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      templateId: record.templateId,
      contentIdentity: record.contentIdentity,
    };

    this.documents.set(doc.id, doc);
    this.persistIndex();
    return { ...doc };
  }

  /**
   * Remove o documento do store e limpa o storage privado (ao fechar e descartar).
   */
  public discardUntitled(id: string): boolean {
    const existed = this.documents.delete(id);
    try {
      this.storage.removeItem(this.getKey(id));
      this.persistIndex();
    } catch (err) {
      console.warn(`[UntitledStore] Falha ao remover rascunho de ${id}:`, err);
    }
    return existed;
  }

  /**
   * Promove o documento untitled para arquivo físico formal (Save As).
   * Remove imediatamente o rascunho do storage privado do aplicativo.
   */
  public promoteToSaved(id: string, promotedPath: string): { promoted: boolean; targetPath: string } {
    const doc = this.documents.get(id);
    if (!doc) {
      return { promoted: false, targetPath: promotedPath };
    }

    // Remove do store de untitled e apaga o snapshot privado
    this.discardUntitled(id);

    return {
      promoted: true,
      targetPath: promotedPath,
    };
  }

  /**
   * Retenção de rascunhos: expira rascunhos antigos (padrão 90 dias, conforme INV-DRAFT-RETENTION).
   */
  public purgeExpiredSnapshots(maxAgeMs = 90 * 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let purgedCount = 0;
    const snapshots = this.listRecoverableSnapshots();

    for (const snap of snapshots) {
      if (now - snap.updatedAt > maxAgeMs) {
        this.storage.removeItem(this.getKey(snap.id));
        this.documents.delete(snap.id);
        purgedCount += 1;
      }
    }

    if (purgedCount > 0) {
      this.persistIndex();
    }

    return purgedCount;
  }
}
