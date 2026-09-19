import { ipc } from "../lib/ipc";
import type { DocumentSnapshot, SaveResult } from "../contracts/types";
import { clearDraft, saveDraft } from "../lib/drafts/recovery";

export async function persistDocument(
  snapshot: DocumentSnapshot,
  content: string,
): Promise<SaveResult> {
  saveDraft(snapshot.workspaceId, snapshot.relativePath, content);
  const result = await ipc.saveDocument({
    workspaceId: snapshot.workspaceId,
    relativePath: snapshot.relativePath,
    expectedHash: snapshot.contentHash,
    content,
  });
  if (result.ok) {
    clearDraft(snapshot.workspaceId, snapshot.relativePath);
  }
  return result;
}
