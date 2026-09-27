import type { GitFileStatus, GitStatusCode } from "../contracts/types";
import type { HealthIssue, HealthSeverity } from "./workspaceHealth";

export interface FileState {
  path: string;
  isDirty?: boolean;
  gitStatus?: GitStatusCode;
  isGitStaged?: boolean;
  healthSeverity?: HealthSeverity;
  healthIssueCount?: number;
  healthSummary?: string;
}

export interface BuildFileStateOptions {
  gitStatuses?: GitFileStatus[];
  healthIssues?: HealthIssue[];
  dirtyPaths?: Set<string> | string[];
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").trim().replace(/^\/+/, "");
}

/**
 * Agregador performático de estado de arquivos para a File Tree.
 * Constrói um mapa O(1) de FileState consolidando Git, Health e Dirty state.
 */
export function aggregateFileStates(options: BuildFileStateOptions): Map<string, FileState> {
  const map = new Map<string, FileState>();

  const getOrCreate = (normPath: string): FileState => {
    let state = map.get(normPath);
    if (!state) {
      state = { path: normPath };
      map.set(normPath, state);
    }
    return state;
  };

  // 1. Processar Git Status
  if (options.gitStatuses) {
    for (const gs of options.gitStatuses) {
      const norm = normalizePath(gs.path);
      const state = getOrCreate(norm);
      state.gitStatus = gs.status;
      state.isGitStaged = gs.isStaged;
    }
  }

  // 2. Processar Health Issues
  if (options.healthIssues) {
    const issuesByPath = new Map<string, HealthIssue[]>();
    for (const issue of options.healthIssues) {
      const norm = normalizePath(issue.path);
      if (!issuesByPath.has(norm)) issuesByPath.set(norm, []);
      issuesByPath.get(norm)!.push(issue);
    }

    for (const [norm, issues] of issuesByPath.entries()) {
      const state = getOrCreate(norm);
      state.healthIssueCount = issues.length;

      let maxSev: HealthSeverity = "info";
      for (const iss of issues) {
        if (iss.severity === "error") {
          maxSev = "error";
          break;
        } else if (iss.severity === "warning") {
          maxSev = "warning";
        }
      }

      state.healthSeverity = maxSev;
      const errorCount = issues.filter((i) => i.severity === "error").length;
      const warnCount = issues.filter((i) => i.severity === "warning").length;
      state.healthSummary = `${issues.length} problema(s)${errorCount > 0 ? ` (${errorCount} erro(s))` : warnCount > 0 ? ` (${warnCount} alerta(s))` : ""}`;
    }
  }

  // 3. Processar Dirty Paths
  if (options.dirtyPaths) {
    const dirtySet = options.dirtyPaths instanceof Set ? options.dirtyPaths : new Set(options.dirtyPaths);
    for (const dp of dirtySet) {
      const norm = normalizePath(dp);
      const state = getOrCreate(norm);
      state.isDirty = true;
    }
  }

  return map;
}

/**
 * Traduz o código de status Git para rótulo legível
 */
export function formatGitStatusLabel(status: GitStatusCode, staged?: boolean): string {
  const stagedPrefix = staged ? "[staged] " : "";
  switch (status) {
    case "M":
      return `${stagedPrefix}Modificado`;
    case "A":
      return `${stagedPrefix}Adicionado`;
    case "D":
      return `${stagedPrefix}Excluído`;
    case "R":
      return `${stagedPrefix}Renomeado`;
    default:
      return `${stagedPrefix}${status}`;
  }
}
