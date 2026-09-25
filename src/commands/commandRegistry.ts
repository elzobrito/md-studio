import { fuzzySearchCommands } from "../utils/fuzzy-search";

export interface CommandItem {
  id: string;
  title: string;
  category?: string;
  shortcut?: string;
  isEnabled: () => boolean;
  execute: () => void | Promise<void>;
}

export class CommandRegistry {
  private commands: Map<string, CommandItem> = new Map();

  public register(command: CommandItem): () => void {
    this.commands.set(command.id, command);
    return () => {
      this.commands.delete(command.id);
    };
  }

  public unregister(id: string): void {
    this.commands.delete(id);
  }

  public get(id: string): CommandItem | undefined {
    return this.commands.get(id);
  }

  public getAll(): CommandItem[] {
    return Array.from(this.commands.values());
  }

  public getEnabled(): CommandItem[] {
    return this.getAll().filter((cmd) => {
      try {
        return cmd.isEnabled();
      } catch {
        return false;
      }
    });
  }

  public search(query: string): CommandItem[] {
    const enabled = this.getEnabled();
    return fuzzySearchCommands(query, enabled);
  }

  public async execute(id: string): Promise<boolean> {
    const cmd = this.commands.get(id);
    if (!cmd) return false;

    // Comando desabilitado não roda
    if (!cmd.isEnabled()) {
      return false;
    }

    await cmd.execute();
    return true;
  }
}

export const commandRegistry = new CommandRegistry();

// Registros padrão de comandos essenciais do workspace
commandRegistry.register({
  id: "workspace.save",
  title: "Salvar documento atual",
  category: "Arquivo",
  shortcut: "Ctrl+S",
  isEnabled: () => true,
  execute: () => {
    window.dispatchEvent(new CustomEvent("md-command:save"));
  },
});

commandRegistry.register({
  id: "workspace.presentation",
  title: "Iniciar Modo Apresentação",
  category: "Visualização",
  shortcut: "F5",
  isEnabled: () => true,
  execute: () => {
    window.dispatchEvent(new CustomEvent("md-command:presentation"));
  },
});

commandRegistry.register({
  id: "workspace.zen",
  title: "Alternar Modo Zen",
  category: "Visualização",
  isEnabled: () => true,
  execute: () => {
    window.dispatchEvent(new CustomEvent("md-command:toggle-zen"));
  },
});

commandRegistry.register({
  id: "workspace.export-html",
  title: "Exportar para HTML",
  category: "Exportação",
  isEnabled: () => true,
  execute: () => {
    window.dispatchEvent(new CustomEvent("md-command:export-html"));
  },
});

commandRegistry.register({
  id: "workspace.export-epub",
  title: "Exportar para EPUB",
  category: "Exportação",
  isEnabled: () => true,
  execute: () => {
    window.dispatchEvent(new CustomEvent("md-command:export-epub"));
  },
});

commandRegistry.register({
  id: "workspace.quick-switcher",
  title: "Abrir Quick Switcher de Arquivos",
  category: "Navegação",
  shortcut: "Ctrl+P",
  isEnabled: () => true,
  execute: () => {
    window.dispatchEvent(new CustomEvent("md-command:open-quick-switcher"));
  },
});
