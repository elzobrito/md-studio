/** Resolve relative asset paths against document directory (frontend policy only). */
export function resolveAssetPath(documentPath: string, assetHref: string): string {
  if (/^(https?:|data:|blob:)/i.test(assetHref)) return assetHref;
  const base = documentPath.includes("/") ? documentPath.slice(0, documentPath.lastIndexOf("/") + 1) : "";
  const parts = (base + assetHref).split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (!p || p === ".") continue;
    if (p === "..") out.pop();
    else out.push(p);
  }
  return out.join("/");
}
