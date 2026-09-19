import type { WatchEvent } from "../contracts/types";

type Handler = (ev: WatchEvent) => void;
const handlers = new Set<Handler>();

export function onWorkspaceEvent(handler: Handler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function emitWorkspaceEvent(ev: WatchEvent): void {
  for (const h of handlers) h(ev);
}
