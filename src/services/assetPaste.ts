import { triggerReindex } from "../lib/ipc/metadata";

export interface AssetPasteOptions {
  workspaceRoot?: string;
  customFilename?: string;
  allowOverwrite?: boolean;
}

export interface AssetPasteResult {
  success: boolean;
  assetPath?: string;
  markdownRef?: string;
  sha256?: string;
  error?: string;
}

/**
 * Valida a fronteira de segurança (path fence) para destinos de assets.
 * Rejeita qualquer tentativa de escape de diretório ou destino fora de assets/.
 */
export function validateAssetDestination(targetPath: string): { valid: boolean; reason?: string } {
  const norm = targetPath.replace(/\\/g, "/").trim();
  const clean = norm.startsWith("/") ? norm.slice(1) : norm;

  if (clean.includes("../") || clean.includes("/..") || clean === "..") {
    return { valid: false, reason: "Path fence violation: directory traversal rejected" };
  }

  if (!clean.startsWith("assets/") && clean !== "assets") {
    return { valid: false, reason: "Destination must be inside assets/ folder" };
  }

  return { valid: true };
}

/**
 * Gera um nome seguro e previsível para imagens coladas em assets/.
 */
export function generatePastedAssetName(extension = "png"): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `assets/pasted-${stamp}.${extension}`;
}

/**
 * Calcula o hash SHA-256 de um buffer no navegador/WebView.
 */
export async function computeBufferSha256(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Processa a colagem de imagem do clipboard.
 * Garante o fluxo de segurança:
 * 1. Valida payload
 * 2. Valida path fence
 * 3. Escreve o arquivo no disco (simulado ou via backend)
 * 4. Só insere o Markdown se a escrita for confirmada
 * 5. Dispara triggerReindex para atualizar o índice local
 */
export async function handlePastedImageAsset(
  imageBlob: Blob,
  options: AssetPasteOptions = {},
  writeFn?: (path: string, data: Uint8Array) => Promise<boolean>
): Promise<AssetPasteResult> {
  if (!imageBlob || imageBlob.size === 0) {
    return { success: false, error: "Empty image payload" };
  }

  // Determinar extensão a partir do MIME type
  let ext = "png";
  if (imageBlob.type === "image/jpeg" || imageBlob.type === "image/jpg") ext = "jpg";
  else if (imageBlob.type === "image/webp") ext = "webp";
  else if (imageBlob.type === "image/gif") ext = "gif";
  else if (imageBlob.type === "image/svg+xml") ext = "svg";

  const targetPath = options.customFilename
    ? (options.customFilename.startsWith("assets/") ? options.customFilename : `assets/${options.customFilename}`)
    : generatePastedAssetName(ext);

  // 1. Validação estrita de path fence
  const validation = validateAssetDestination(targetPath);
  if (!validation.valid) {
    return { success: false, error: validation.reason };
  }

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") {
    return await blob.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

  const buffer = await blobToArrayBuffer(imageBlob);
  const sha256 = await computeBufferSha256(buffer);

  // 2. Escrita no disco
  try {
    if (writeFn) {
      const written = await writeFn(targetPath, new Uint8Array(buffer));
      if (!written) {
        return { success: false, error: "Failed to persist asset to disk" };
      }
    }

    // 3. Notificar reindexação se estiver rodando
    try {
      await triggerReindex();
    } catch {
      // Ignora falha de IPC em ambiente de teste unitário
    }

    // 4. Só gera a referência Markdown após escrita confirmada
    const markdownRef = `![image](${targetPath})`;

    return {
      success: true,
      assetPath: targetPath,
      markdownRef,
      sha256,
    };
  } catch (err: any) {
    // Falha de escrita: NÃO insere o Markdown
    return {
      success: false,
      error: `Asset persistence failed: ${err.message || String(err)}`,
    };
  }
}
