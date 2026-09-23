/**
 * Tipos e contratos de dados para o Presentation Mode (Onda-PRES / v0.2.3)
 */

export type PresentationStatus =
  | 'idle'
  | 'preparing'
  | 'presenting'
  | 'closing'
  | 'error';

export interface PresentationWarning {
  code: string;
  slideIndex: number | null;
  message: string;
}

export interface PresentationError {
  code: string;
  message: string;
  recoverable: boolean;
}

export interface PresentationConfig {
  theme: 'auto' | 'light' | 'dark';
  transition: 'none' | 'fade' | 'slide';
  slideNumbers: boolean;
  controls: boolean;
  progress: boolean;
}

export interface PresentationMetadata {
  title: string | null;
  theme: 'auto' | 'light' | 'dark';
  transition: 'none' | 'fade' | 'slide';
  slideNumbers: boolean;
  controls: boolean;
  progress: boolean;
}

export interface RawSlideSegment {
  index: number;
  title: string | null;
  sourceStart: number;
  sourceEnd: number;
  markdown: string;
}

export interface PresentationSlide {
  id: string;
  index: number;
  title: string | null;
  sourceStart: number;
  sourceEnd: number;
  markdown: string;
  html?: string;
}

export interface PresentationModel {
  metadata: PresentationMetadata;
  slides: PresentationSlide[];
  warnings: PresentationWarning[];
}

export interface PresentationSource {
  documentId: string;
  markdown: string;
  workspaceRoot: string | null;
  relativePath: string | null;
}

export interface PreviousUiState {
  viewMode: 'source' | 'preview' | 'split';
  editorScrollTop: number;
  previewScrollTop: number;
  cursorFrom: number;
  cursorTo: number;
  leftSidebarVisible: boolean;
  rightSidebarVisible: boolean;
  focusedRegion: string | null;
}

export interface PresentationSession {
  status: PresentationStatus;
  documentId: string | null;
  sourceRevision: number;
  currentSlide: number;
  totalSlides: number;
  previousUiState: PreviousUiState | null;
  error: PresentationError | null;
}
