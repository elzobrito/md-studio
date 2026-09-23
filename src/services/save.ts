import { ipc } from "../lib/ipc";
import type { DocumentSnapshot, SaveResult } from "../contracts/types";
import { clearDraft, saveDraft } from "../lib/drafts/recovery";

export async function persistDocument(
  snapshot: DocumentSnapshot,
  content: string,
  workspaceRoot: string,
): Promise<SaveResult> {
  saveDraft(workspaceRoot, snapshot.relativePath, content);
  const result = await ipc.saveDocument({
    workspaceId: snapshot.workspaceId,
    relativePath: snapshot.relativePath,
    expectedHash: snapshot.contentHash,
    content,
  });
  if (result.ok) {
    clearDraft(workspaceRoot, snapshot.relativePath);
  }
  return result;
}
