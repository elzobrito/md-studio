import type { IpcErrorCode } from "../../contracts/types";

export function formatIpcError(code: IpcErrorCode | string, message: string): string {
  return `[${code}] ${message}`;
}
