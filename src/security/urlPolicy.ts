const BLOCKED = /^(javascript:|vbscript:|file:|data:text\/html)/i;

export function isRemoteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function allowUrl(url: string, opts: { allowRemote?: boolean } = {}): boolean {
  if (BLOCKED.test(url)) return false;
  if (url.startsWith("#")) return true;
  if (url.startsWith("/") || url.startsWith("./") || url.startsWith("../")) return true;
  if (isRemoteUrl(url)) return !!opts.allowRemote;
  if (url.startsWith("data:image/")) return true;
  if (url.startsWith("mailto:")) return true;
  return false;
}
