import { describe, expect, it, vi } from "vitest";
import { CommandRegistry, type CommandItem } from "../../src/commands/commandRegistry";

describe("Command Palette & Registry (MD-V03-017)", () => {
  it("registers and searches commands via fuzzy matching", () => {
    const registry = new CommandRegistry();

    registry.register({
      id: "cmd.save",
      title: "Salvar Arquivo",
      category: "Arquivo",
      isEnabled: () => true,
      execute: vi.fn(),
    });

    registry.register({
      id: "cmd.zen",
      title: "Alternar Modo Zen",
      category: "Visualização",
      isEnabled: () => true,
      execute: vi.fn(),
    });

    const searchResults = registry.search("salv");
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].id).toBe("cmd.save");

    const zenResults = registry.search("zen");
    expect(zenResults).toHaveLength(1);
    expect(zenResults[0].id).toBe("cmd.zen");
  });

  it("does NOT execute a disabled command", async () => {
    const registry = new CommandRegistry();
    const executeFn = vi.fn();

    registry.register({
      id: "cmd.disabled",
      title: "Ação Indisponível",
      isEnabled: () => false,
      execute: executeFn,
    });

    const executed = await registry.execute("cmd.disabled");
    expect(executed).toBe(false);
    expect(executeFn).not.toHaveBeenCalled();
  });

  it("filters out disabled commands from search and getEnabled", () => {
    const registry = new CommandRegistry();

    registry.register({
      id: "cmd.active",
      title: "Comando Ativo",
      isEnabled: () => true,
      execute: vi.fn(),
    });

    registry.register({
      id: "cmd.inactive",
      title: "Comando Inativo",
      isEnabled: () => false,
      execute: vi.fn(),
    });

    const enabled = registry.getEnabled();
    expect(enabled).toHaveLength(1);
    expect(enabled[0].id).toBe("cmd.active");

    const search = registry.search("comando");
    expect(search).toHaveLength(1);
    expect(search[0].id).toBe("cmd.active");
  });

  it("unregisters command cleanly", () => {
    const registry = new CommandRegistry();
    const unreg = registry.register({
      id: "cmd.temp",
      title: "Temporário",
      isEnabled: () => true,
      execute: vi.fn(),
    });

    expect(registry.get("cmd.temp")).toBeDefined();
    unreg();
    expect(registry.get("cmd.temp")).toBeUndefined();
  });
});
