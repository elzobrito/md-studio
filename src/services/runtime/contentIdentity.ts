/**
 * 053-B — Content Identity & Generation Runtime
 *
 * Implementação normativa de identidade de conteúdo e ordenação de operações.
 * R3 Principle: "Ordem de operação não é identidade de conteúdo."
 *
 * - operationGeneration: contador monotônico por documento para ordenar/cancelar operações assíncronas.
 * - contentIdentity: hash determinístico (SHA-256) do buffer de texto para decidir equivalência/dirty.
 * - dirty: currentContentIdentity !== persistedContentIdentity.
 */

import { createHash } from "crypto";

/**
 * Calcula a identidade de conteúdo (SHA-256 em hexadecimal) de forma síncrona.
 * Ideal para testes e operações locais determinísticas.
 */
export function computeContentIdentitySync(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Calcula a identidade de conteúdo de forma assíncrona, utilizando Web Crypto
 * quando disponível no ambiente browser/WebView, com fallback para Node crypto.
 */
export async function computeContentIdentity(content: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return computeContentIdentitySync(content);
}

/**
 * Avalia se o buffer atual diverge do estado persistido em disco.
 * Retorna false se o conteúdo for idêntico (clean), mesmo após operações de undo.
 */
export function isContentDirty(
  currentIdentity: string,
  persistedIdentity: string
): boolean {
  return currentIdentity !== persistedIdentity;
}

/**
 * Gerenciador de geração de operações monotônicas por documento.
 */
export class OperationGenerationManager {
  private currentGeneration: number;

  constructor(initialGeneration = 1) {
    this.currentGeneration = initialGeneration;
  }

  public get generation(): number {
    return this.currentGeneration;
  }

  public next(): number {
    this.currentGeneration += 1;
    return this.currentGeneration;
  }

  public isStale(ticketGeneration: number): boolean {
    return ticketGeneration < this.currentGeneration;
  }
}
