const STORAGE_KEY = "md-studio.ui-state";

export interface UIState {
  leftPanelVisible: boolean;
  rightPanelVisible: boolean;
}

type Listener = () => void;

class UIStore {
  private state: UIState = {
    leftPanelVisible: true,
    rightPanelVisible: true,
  };
  private listeners: Set<Listener> = new Set();

  constructor() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.leftPanelVisible === "boolean") {
          this.state.leftPanelVisible = parsed.leftPanelVisible;
        }
        if (typeof parsed.rightPanelVisible === "boolean") {
          this.state.rightPanelVisible = parsed.rightPanelVisible;
        }
      }
    } catch {
      /* ignore */
    }
  }

  public getState(): UIState {
    return { ...this.state };
  }

  public toggleLeft() {
    this.state.leftPanelVisible = !this.state.leftPanelVisible;
    this.persist();
  }

  public toggleRight() {
    this.state.rightPanelVisible = !this.state.rightPanelVisible;
    this.persist();
  }

  public setLeft(visible: boolean) {
    if (this.state.leftPanelVisible === visible) return;
    this.state.leftPanelVisible = visible;
    this.persist();
  }

  public setRight(visible: boolean) {
    if (this.state.rightPanelVisible === visible) return;
    this.state.rightPanelVisible = visible;
    this.persist();
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* ignore */
    }
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

export const uiStore = new UIStore();
