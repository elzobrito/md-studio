export interface CacheIdentifiable {
  documentId: string;
  operationGeneration: number;
  contentIdentity: string;
  estimatedWeightBytes?: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  entries: number;
  estimatedBytes: number;
  maxEntries: number;
  maxEstimatedBytes: number;
}

export interface BoundedArtifactCacheOptions {
  maxEntries?: number;
  maxEstimatedBytes?: number;
}

/**
 * Deterministic Bounded LRU Cache for async semantic and preview artifacts.
 * Prevents memory leaks by enforcing entry count and byte budgets with LRU eviction.
 */
export class BoundedArtifactCache<T extends CacheIdentifiable> {
  private readonly maxEntries: number;
  private readonly maxEstimatedBytes: number;
  // Key format: `${documentId}:${contentIdentity}:${operationGeneration}`
  private readonly entries = new Map<string, T>();
  private readonly docLatestKey = new Map<string, string>();

  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private currentBytes = 0;
  private activeDocumentId: string | null = null;

  constructor(options: BoundedArtifactCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? 20;
    this.maxEstimatedBytes = options.maxEstimatedBytes ?? 25 * 1024 * 1024; // 25 MB default
  }

  public setActiveDocumentId(documentId: string | null): void {
    this.activeDocumentId = documentId;
  }

  public getActiveDocumentId(): string | null {
    return this.activeDocumentId;
  }

  private buildKey(documentId: string, contentIdentity: string, generation: number): string {
    return `${documentId}:${contentIdentity}:${generation}`;
  }

  private estimateWeight(item: T): number {
    if (typeof item.estimatedWeightBytes === 'number' && item.estimatedWeightBytes > 0) {
      return item.estimatedWeightBytes;
    }
    // Fallback conservative estimation: 2KB base
    return 2048;
  }

  /**
   * Retrieves an artifact matching exact documentId, contentIdentity, and operationGeneration.
   * Touches entry to mark as most recently used.
   */
  public get(documentId: string, contentIdentity: string, generation: number): T | null {
    const key = this.buildKey(documentId, contentIdentity, generation);
    const existing = this.entries.get(key);
    if (!existing) {
      this.misses++;
      return null;
    }

    this.hits++;
    // Move to most recently used by re-inserting
    this.entries.delete(key);
    this.entries.set(key, existing);
    return existing;
  }

  /**
   * Retrieves the latest cached artifact for a given documentId.
   */
  public getLatest(documentId: string): T | null {
    const latestKey = this.docLatestKey.get(documentId);
    if (!latestKey) {
      this.misses++;
      return null;
    }
    const existing = this.entries.get(latestKey);
    if (!existing) {
      this.docLatestKey.delete(documentId);
      this.misses++;
      return null;
    }

    this.hits++;
    this.entries.delete(latestKey);
    this.entries.set(latestKey, existing);
    return existing;
  }

  /**
   * Stores an artifact, updating bytes and triggering eviction if limits are exceeded.
   */
  public put(item: T): void {
    const key = this.buildKey(item.documentId, item.contentIdentity, item.operationGeneration);
    const weight = this.estimateWeight(item);

    // If key already exists, replace and adjust byte count
    if (this.entries.has(key)) {
      const oldItem = this.entries.get(key)!;
      this.currentBytes -= this.estimateWeight(oldItem);
      this.entries.delete(key);
    }

    this.entries.set(key, item);
    this.docLatestKey.set(item.documentId, key);
    this.currentBytes += weight;

    this.evictIfNeeded();
  }

  /**
   * Evicts artifacts when exceeding maxEntries or maxEstimatedBytes.
   * Prioritizes preserving the activeDocumentId when non-active entries exist.
   */
  private evictIfNeeded(): void {
    while (
      (this.entries.size > this.maxEntries || this.currentBytes > this.maxEstimatedBytes) &&
      this.entries.size > 0
    ) {
      // Find oldest key to evict (least recently used)
      let keyToEvict: string | null = null;
      let candidateKey: string | null = null;

      for (const [k, item] of this.entries.entries()) {
        if (!candidateKey) {
          candidateKey = k;
        }
        if (item.documentId !== this.activeDocumentId) {
          keyToEvict = k;
          break;
        }
      }

      // If all remaining entries belong to activeDocumentId, evict the candidate
      if (!keyToEvict) {
        keyToEvict = candidateKey;
      }

      if (!keyToEvict) {
        break;
      }

      const itemToEvict = this.entries.get(keyToEvict)!;
      this.currentBytes -= this.estimateWeight(itemToEvict);
      this.entries.delete(keyToEvict);
      this.evictions++;

      // If this was the latest key for the document, clean up reference
      if (this.docLatestKey.get(itemToEvict.documentId) === keyToEvict) {
        this.docLatestKey.delete(itemToEvict.documentId);
      }
    }
  }

  /**
   * Purges all cached artifacts for a specific document (e.g. when closed).
   */
  public evictDocument(documentId: string): void {
    for (const [key, item] of Array.from(this.entries.entries())) {
      if (item.documentId === documentId) {
        this.currentBytes -= this.estimateWeight(item);
        this.entries.delete(key);
        this.evictions++;
      }
    }
    this.docLatestKey.delete(documentId);
  }

  /**
   * Clears the entire cache.
   */
  public clear(): void {
    this.entries.clear();
    this.docLatestKey.clear();
    this.currentBytes = 0;
  }

  public getMetrics(): CacheMetrics {
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      entries: this.entries.size,
      estimatedBytes: this.currentBytes,
      maxEntries: this.maxEntries,
      maxEstimatedBytes: this.maxEstimatedBytes,
    };
  }
}
