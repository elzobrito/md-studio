export interface RecentFile {
  path: string;
  name: string;
  folder: string;
  openedAt: number; // timestamp
}

const STORAGE_KEY = "md-studio.recent-files";
const MAX_RECENT = 20;

type Listener = () => void;

class RecentFilesStore {
  private items: RecentFile[] = [];
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.load();
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.items = JSON.parse(raw);
      }
    } catch {
      this.items = [];
    }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    } catch {
      /* ignore */
    }
    this.notify();
  }

  public getAll(): RecentFile[] {
    return [...this.items];
  }

  public add(path: string, customName?: string) {
    if (!path) return;
    const cleanPath = path.replace(/\\/g, "/");
    const parts = cleanPath.split("/");
    const name = customName || parts[parts.length - 1] || cleanPath;
    const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : "";

    // Remove duplicates
    this.items = this.items.filter((item) => item.path !== cleanPath);

    // Prepend new recent file
    this.items.unshift({
      path: cleanPath,
      name,
      folder,
      openedAt: Date.now(),
    });

    if (this.items.length > MAX_RECENT) {
      this.items = this.items.slice(0, MAX_RECENT);
    }

    this.persist();
  }

  public remove(path: string) {
    const cleanPath = path.replace(/\\/g, "/");
    this.items = this.items.filter((item) => item.path !== cleanPath);
    this.persist();
  }

  public clear() {
    this.items = [];
    this.persist();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }
}

export const recentFilesStore = new RecentFilesStore();
