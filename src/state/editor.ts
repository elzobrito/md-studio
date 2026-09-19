export type SaveStatus = 'saved' | 'modified' | 'saving' | 'error';

export interface EditorStateModel {
  saveStatus: SaveStatus;
  errorMessage?: string;
  cursorLine: number;
  cursorCol: number;
  wordCount: number;
}

type Listener = () => void;

class EditorStore {
  private status: SaveStatus = 'saved';
  private errorMessage: string | undefined = undefined;
  private cursorLine: number = 1;
  private cursorCol: number = 1;
  private wordCount: number = 0;
  private totalLines: number = 1;
  private goToLineHandler?: (line: number) => void;
  private listeners: Set<Listener> = new Set();

  public getSaveStatus(): SaveStatus {
    return this.status;
  }

  public getErrorMessage(): string | undefined {
    return this.errorMessage;
  }

  public getCursor(): { line: number; col: number } {
    return { line: this.cursorLine, col: this.cursorCol };
  }

  public getWordCount(): number {
    return this.wordCount;
  }

  public getTotalLines(): number {
    return this.totalLines;
  }

  public setSaveStatus(status: SaveStatus, errorMessage?: string) {
    this.status = status;
    this.errorMessage = errorMessage;
    this.notify();
  }

  public setCursor(line: number, col: number) {
    if (this.cursorLine === line && this.cursorCol === col) return;
    this.cursorLine = line;
    this.cursorCol = col;
    this.notify();
  }

  public setWordCount(count: number) {
    if (this.wordCount === count) return;
    this.wordCount = count;
    this.notify();
  }

  public setTotalLines(total: number) {
    if (this.totalLines === total) return;
    this.totalLines = total;
    this.notify();
  }

  public registerGoToLine(handler: (line: number) => void): () => void {
    this.goToLineHandler = handler;
    return () => {
      if (this.goToLineHandler === handler) {
        this.goToLineHandler = undefined;
      }
    };
  }

  public goToLine(line: number) {
    this.goToLineHandler?.(line);
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }
}

export const editorStore = new EditorStore();
