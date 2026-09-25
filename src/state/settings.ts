export type ThemeMode = "light" | "dark" | "auto";
export type PreviewReadingWidth = "narrow" | "comfortable" | "wide" | "full";

export interface SettingsState {
  fontSize: number;
  fontFamily: string;
  zoom: number;
  lineHeight: number;
  theme: ThemeMode;
  previewFontSize: number;
  previewFontFamily: string;
  previewReadingWidth: PreviewReadingWidth;
  lineWrapping: boolean;
  lineNumbers: boolean;
  smartPaste: boolean;
  markdownHints: boolean;
  autoSave: boolean;
  autoSaveDelay: number;
  splitScrollSync: boolean;
}

const STORAGE_KEY = "md-studio-settings-v2";

export const FONT_FAMILY_OPTIONS = [
  {
    label: "JetBrains Mono / Fira Code (Padrão)",
    value: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Consolas, monospace",
  },
  {
    label: "Fira Code",
    value: "'Fira Code', Consolas, Monaco, monospace",
  },
  {
    label: "Cascadia Code",
    value: "'Cascadia Code', Menlo, Monaco, monospace",
  },
  {
    label: "Consolas",
    value: "Consolas, 'Courier New', monospace",
  },
  {
    label: "Sistema Monospace",
    value: "ui-monospace, monospace",
  },
];

export const PREVIEW_FONT_FAMILY_OPTIONS = [
  {
    label: "Inter / Sans-serif (Padrão)",
    value: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  {
    label: "Serif (Georgia / Times)",
    value: "Georgia, Cambria, 'Times New Roman', Times, serif",
  },
  {
    label: "Monospace",
    value: "'JetBrains Mono', Consolas, Monaco, monospace",
  },
  {
    label: "Sistema",
    value: "system-ui, sans-serif",
  },
];

export const PREVIEW_READING_WIDTH_OPTIONS: {
  label: string;
  value: PreviewReadingWidth;
  description: string;
}[] = [
  {
    label: "Estreita (760px)",
    value: "narrow",
    description: "Linhas curtas ideais para leitura contínua e foco editorial",
  },
  {
    label: "Confortável (920px)",
    value: "comfortable",
    description: "Equilíbrio padrão para documentação técnica e artigos",
  },
  {
    label: "Ampla (1100px)",
    value: "wide",
    description: "Espaço ampliado para dados, tabelas e código largo",
  },
  {
    label: "Total (100%)",
    value: "full",
    description: "Sem restrição editorial de largura (aproveitamento total)",
  },
];

export const DEFAULT_SETTINGS: SettingsState = {
  fontSize: 14,
  fontFamily: FONT_FAMILY_OPTIONS[0].value,
  zoom: 100,
  lineHeight: 1.5,
  theme: "dark",
  previewFontSize: 16,
  previewFontFamily: PREVIEW_FONT_FAMILY_OPTIONS[0].value,
  previewReadingWidth: "comfortable",
  lineWrapping: true,
  lineNumbers: true,
  smartPaste: true,
  markdownHints: true,
  autoSave: true,
  autoSaveDelay: 1500,
  splitScrollSync: true,
};


type Listener = () => void;

class SettingsStore {
  private state: SettingsState = DEFAULT_SETTINGS;
  private showInternalFiles = false;
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.load();
    this.applyToDOM();
  }

  public getState(): SettingsState {
    return this.state;
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SettingsState>;
        const validWidths: PreviewReadingWidth[] = ["narrow", "comfortable", "wide", "full"];
        const readingWidth = validWidths.includes(parsed.previewReadingWidth as PreviewReadingWidth)
          ? (parsed.previewReadingWidth as PreviewReadingWidth)
          : "comfortable";
        this.state = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          previewReadingWidth: readingWidth,
          splitScrollSync: typeof parsed.splitScrollSync === "boolean" ? parsed.splitScrollSync : true,
        };
      }
    } catch {
      this.state = DEFAULT_SETTINGS;
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* ignore */
    }
  }

  public applyToDOM() {
    if (typeof document === "undefined") return;
    const docEl = document.documentElement;

    docEl.style.setProperty("--editor-font-size", `${this.state.fontSize}px`);
    docEl.style.setProperty("--editor-font-family", this.state.fontFamily);
    docEl.style.setProperty("--editor-line-height", `${this.state.lineHeight}`);

    // Preview typography and reading width
    docEl.style.setProperty("--preview-font-size", `${this.state.previewFontSize}px`);
    docEl.style.setProperty("--preview-font-family", this.state.previewFontFamily);
    const widthMap: Record<PreviewReadingWidth, string> = {
      narrow: "760px",
      comfortable: "920px",
      wide: "1100px",
      full: "none",
    };
    docEl.style.setProperty(
      "--preview-reading-width",
      widthMap[this.state.previewReadingWidth] || "920px"
    );
    docEl.setAttribute("data-reading-width", this.state.previewReadingWidth);

    // Zoom
    (docEl.style as unknown as { zoom: string }).zoom = `${this.state.zoom}%`;

    // Theme class
    docEl.classList.remove("theme-light", "theme-dark", "theme-auto");
    docEl.classList.add(`theme-${this.state.theme}`);
  }

  public setPreviewReadingWidth(previewReadingWidth: PreviewReadingWidth) {
    const valid: PreviewReadingWidth[] = ["narrow", "comfortable", "wide", "full"];
    const safeWidth = valid.includes(previewReadingWidth) ? previewReadingWidth : "comfortable";
    if (this.state.previewReadingWidth === safeWidth) return;
    this.state = { ...this.state, previewReadingWidth: safeWidth };
    this.save();
    this.applyToDOM();
    this.notify();
  }

  public setPreviewFontSize(previewFontSize: number) {
    const clamped = Math.max(12, Math.min(32, previewFontSize));
    if (this.state.previewFontSize === clamped) return;
    this.state = { ...this.state, previewFontSize: clamped };
    this.save();
    this.applyToDOM();
    this.notify();
  }

  public setPreviewFontFamily(previewFontFamily: string) {
    if (this.state.previewFontFamily === previewFontFamily) return;
    this.state = { ...this.state, previewFontFamily };
    this.save();
    this.applyToDOM();
    this.notify();
  }

  public setLineWrapping(lineWrapping: boolean) {
    if (this.state.lineWrapping === lineWrapping) return;
    this.state = { ...this.state, lineWrapping };
    this.save();
    this.notify();
  }

  public setLineNumbers(lineNumbers: boolean) {
    if (this.state.lineNumbers === lineNumbers) return;
    this.state = { ...this.state, lineNumbers };
    this.save();
    this.notify();
  }

  public setSmartPaste(smartPaste: boolean) {
    if (this.state.smartPaste === smartPaste) return;
    this.state = { ...this.state, smartPaste };
    this.save();
    this.notify();
  }

  public setMarkdownHints(markdownHints: boolean) {
    if (this.state.markdownHints === markdownHints) return;
    this.state = { ...this.state, markdownHints };
    this.save();
    this.notify();
  }

  public setSplitScrollSync(splitScrollSync: boolean) {
    if (this.state.splitScrollSync === splitScrollSync) return;
    this.state = { ...this.state, splitScrollSync };
    this.save();
    this.notify();
  }

  public setAutoSave(autoSave: boolean) {
    if (this.state.autoSave === autoSave) return;
    this.state = { ...this.state, autoSave };
    this.save();
    this.notify();
  }

  public setAutoSaveDelay(autoSaveDelay: number) {
    const clamped = Math.max(500, Math.min(10000, autoSaveDelay));
    if (this.state.autoSaveDelay === clamped) return;
    this.state = { ...this.state, autoSaveDelay: clamped };
    this.save();
    this.notify();
  }

  public setFontSize(fontSize: number) {
    const clamped = Math.max(10, Math.min(28, fontSize));
    if (this.state.fontSize === clamped) return;
    this.state = { ...this.state, fontSize: clamped };
    this.save();
    this.applyToDOM();
    this.notify();
  }

  public setFontFamily(fontFamily: string) {
    if (this.state.fontFamily === fontFamily) return;
    this.state = { ...this.state, fontFamily };
    this.save();
    this.applyToDOM();
    this.notify();
  }

  public getShowInternalFiles(): boolean {
    return this.showInternalFiles;
  }

  public setShowInternalFiles(showInternalFiles: boolean) {
    if (this.showInternalFiles === showInternalFiles) return;
    this.showInternalFiles = showInternalFiles;
    this.notify();
  }

  public setZoom(zoom: number) {
    const clamped = Math.max(70, Math.min(160, zoom));
    if (this.state.zoom === clamped) return;
    this.state = { ...this.state, zoom: clamped };
    this.save();
    this.applyToDOM();
    this.notify();
  }

  public zoomIn() {
    this.setZoom(this.state.zoom + 10);
  }

  public zoomOut() {
    this.setZoom(this.state.zoom - 10);
  }

  public resetZoom() {
    this.setZoom(100);
  }

  public setLineHeight(lineHeight: number) {
    const clamped = Math.max(1.1, Math.min(2.2, lineHeight));
    if (this.state.lineHeight === clamped) return;
    this.state = { ...this.state, lineHeight: clamped };
    this.save();
    this.applyToDOM();
    this.notify();
  }

  public setTheme(theme: ThemeMode) {
    if (this.state.theme === theme) return;
    this.state = { ...this.state, theme };
    this.save();
    this.applyToDOM();
    this.notify();
  }

  public resetToDefaults() {
    this.state = { ...DEFAULT_SETTINGS };
    this.save();
    this.applyToDOM();
    this.notify();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }
}

export const settingsStore = new SettingsStore();
