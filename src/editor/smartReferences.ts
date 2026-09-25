import type { WikiDocumentCandidate } from "./wiki/wiki-completion";

export interface SmartReferenceItem {
  label: string;
  detail: string;
  target: string;
  kind: "document" | "heading" | "asset";
}

export interface SmartReferenceResolution {
  target: string;
  status: "resolved" | "unresolved" | "ambiguous" | "insecure";
  path: string | null;
  anchor: string | null;
}

/**
 * Autocomplete local de arquivos, paths relativos, headings e assets.
 * Execução síncrona em memória (< 50ms).
 */
export function getSmartReferenceCandidates(
  documents: readonly WikiDocumentCandidate[],
  query: string,
  currentDocHeadings?: Array<{ depth: number; text: string; anchor: string }>
): SmartReferenceItem[] {
  const start = performance.now();
  const needle = query.trim().toLocaleLowerCase();
  const results: SmartReferenceItem[] = [];
  const seen = new Set<string>();

  // 1. Heading query: ex "#secao" ou "nota#secao"
  if (needle.includes("#")) {
    const parts = needle.split("#");
    const docQuery = parts[0].trim();
    const headingQuery = parts.slice(1).join("#").trim();

    // Se docQuery vazio, busca nos headings do documento atual
    if (!docQuery && currentDocHeadings) {
      for (const h of currentDocHeadings) {
        if (!headingQuery || h.text.toLowerCase().includes(headingQuery) || h.anchor.includes(headingQuery)) {
          results.push({
            label: `#${h.text}`,
            detail: `Âncora #${h.anchor}`,
            target: `#${h.anchor}`,
            kind: "heading",
          });
        }
      }
    } else {
      // Busca no documento alvo
      for (const doc of documents) {
        const norm = doc.path.replace(/\\/g, "/");
        const stem = norm.split("/").pop()?.replace(/\.md$/i, "") || norm;
        const docTarget = doc.title?.trim() || stem;

        if (docTarget.toLowerCase().includes(docQuery) || norm.toLowerCase().includes(docQuery)) {
          if (doc.headings) {
            for (const h of doc.headings) {
              if (!headingQuery || h.text.toLowerCase().includes(headingQuery) || h.anchor.includes(headingQuery)) {
                results.push({
                  label: `${docTarget}#${h.text}`,
                  detail: `${norm} #${h.anchor}`,
                  target: `${docTarget}#${h.text}`,
                  kind: "heading",
                });
              }
            }
          }
        }
      }
    }

    return results.slice(0, 15);
  }

  // 2. Document & Asset query
  for (const doc of documents) {
    const norm = doc.path.replace(/\\/g, "/");
    const stem = norm.split("/").pop()?.replace(/\.md$/i, "") || norm;
    const isAsset = norm.startsWith("assets/") || /\.(png|jpe?g|gif|svg|webp|pdf)$/i.test(norm);
    const target = isAsset ? norm : (doc.title?.trim() || stem);

    const key = target.toLowerCase();
    const matches = !needle || key.includes(needle) || norm.toLowerCase().includes(needle);

    if (matches && !seen.has(key)) {
      seen.add(key);
      results.push({
        label: target,
        detail: norm,
        target,
        kind: isAsset ? "asset" : "document",
      });
    }
  }

  results.sort((a, b) => a.label.localeCompare(b.label));

  const elapsed = performance.now() - start;
  if (elapsed > 50) {
    console.warn(`Smart reference completion exceeded 50ms budget: ${elapsed.toFixed(1)}ms`);
  }

  return results.slice(0, 15);
}

/**
 * Resolução determinística e segura de referências.
 * Rejeita qualquer tentativa de abertura fora do workspace ou URL remota.
 */
export function resolveSmartReference(
  rawTarget: string,
  documents: readonly WikiDocumentCandidate[]
): SmartReferenceResolution {
  const trimmed = rawTarget.trim();

  // 1. Proibição estrita: URLs remotas não abrem automaticamente
  if (/^(https?:|mailto:|ftp:|data:|blob:)/i.test(trimmed)) {
    return {
      target: trimmed,
      status: "insecure",
      path: null,
      anchor: null,
    };
  }

  // 2. Proibição estrita: Path traversal fora do workspace (fence)
  if (trimmed.includes("../") || trimmed.includes("..\\")) {
    return {
      target: trimmed,
      status: "insecure",
      path: null,
      anchor: null,
    };
  }

  // 3. Checar âncora de heading
  let docPart = trimmed;
  let anchorPart: string | null = null;
  if (trimmed.includes("#")) {
    const split = trimmed.split("#");
    docPart = split[0].trim();
    anchorPart = split.slice(1).join("#").trim();
  }

  // Se for apenas âncora local (#secao)
  if (!docPart && anchorPart) {
    return {
      target: trimmed,
      status: "resolved",
      path: null,
      anchor: anchorPart,
    };
  }

  const needle = docPart.toLowerCase();
  const needleWithMd = needle.endsWith(".md") ? needle : `${needle}.md`;

  const matches: string[] = [];

  for (const doc of documents) {
    const norm = doc.path.replace(/\\/g, "/").toLowerCase();
    const stem = norm.split("/").pop()?.replace(/\.md$/i, "") || norm;
    const title = doc.title?.trim().toLowerCase() || "";

    if (norm === needle || norm === needleWithMd || stem === needle || title === needle) {
      matches.push(doc.path);
    }
  }

  if (matches.length === 0) {
    return {
      target: trimmed,
      status: "unresolved",
      path: null,
      anchor: anchorPart,
    };
  }

  if (matches.length > 1) {
    return {
      target: trimmed,
      status: "ambiguous",
      path: matches[0],
      anchor: anchorPart,
    };
  }

  return {
    target: trimmed,
    status: "resolved",
    path: matches[0],
    anchor: anchorPart,
  };
}

/**
 * Validação de clique com Ctrl / Cmd para go-to determinístico.
 * Retorna o destino seguro se for único e local; null caso contrário.
 */
export function handleCtrlClickNavigation(
  target: string,
  documents: readonly WikiDocumentCandidate[]
): { path: string | null; anchor: string | null } | null {
  const resolution = resolveSmartReference(target, documents);

  // Apenas destino local único e válido é navegado
  if (resolution.status === "resolved") {
    return {
      path: resolution.path,
      anchor: resolution.anchor,
    };
  }

  return null;
}
