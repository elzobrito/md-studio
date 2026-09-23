import type {
  PreviousUiState,
  PresentationSession,
  PresentationError,
} from './types';

/**
 * Captura uma fotografia imutável do estado editorial anterior à abertura dos slides.
 */
export function capturePreviousUiState(params: {
  viewMode: 'source' | 'preview' | 'split';
  leftOpen: boolean;
  rightOpen: boolean;
  cursorLine?: number;
  cursorCol?: number;
  editorScrollTop?: number;
  previewScrollTop?: number;
  focusedRegion?: string | null;
}): PreviousUiState {
  return {
    viewMode: params.viewMode,
    editorScrollTop: params.editorScrollTop ?? 0,
    previewScrollTop: params.previewScrollTop ?? 0,
    cursorFrom: params.cursorLine ?? 1,
    cursorTo: params.cursorCol ?? 1,
    leftSidebarVisible: params.leftOpen,
    rightSidebarVisible: params.rightOpen,
    focusedRegion: params.focusedRegion ?? null,
  };
}

/**
 * Tenta colocar a janela em fullscreen de modo resiliente e não-bloqueante.
 */
export async function requestPresentationFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  if (!document.fullscreenElement && document.documentElement?.requestFullscreen) {
    try {
      await document.documentElement.requestFullscreen();
      return true;
    } catch {
      // Permissões negadas ou ambiente headless: fallback silencioso
      return false;
    }
  }
  return false;
}

/**
 * Sai do fullscreen caso a janela esteja atualmente nesse estado.
 */
export async function exitPresentationFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  if (document.fullscreenElement && document.exitFullscreen) {
    try {
      await document.exitFullscreen();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Gerenciador de ciclo de vida da sessão de apresentação.
 */
export class PresentationSessionManager {
  private session: PresentationSession = {
    status: 'idle',
    documentId: null,
    sourceRevision: 0,
    currentSlide: 0,
    totalSlides: 0,
    previousUiState: null,
    error: null,
  };

  public getSession(): PresentationSession {
    return { ...this.session };
  }

  public start(documentId: string, previousState: PreviousUiState): void {
    this.session = {
      status: 'preparing',
      documentId,
      sourceRevision: this.session.sourceRevision + 1,
      currentSlide: 0,
      totalSlides: 0,
      previousUiState: previousState,
      error: null,
    };
  }

  public setReady(totalSlides: number): void {
    this.session.status = 'presenting';
    this.session.totalSlides = totalSlides;
  }

  public setCurrentSlide(index: number): void {
    this.session.currentSlide = index;
  }

  public setError(error: PresentationError): void {
    this.session.status = 'error';
    this.session.error = error;
  }

  public close(): PreviousUiState | null {
    const prevState = this.session.previousUiState;
    this.session = {
      status: 'idle',
      documentId: null,
      sourceRevision: this.session.sourceRevision,
      currentSlide: 0,
      totalSlides: 0,
      previousUiState: null,
      error: null,
    };
    return prevState;
  }
}
