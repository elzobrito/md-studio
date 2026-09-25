import { describe, expect, it } from "vitest";
import {
  getKnownFormatters,
  getFormatterCapabilitiesSnapshot,
  getFormatterForLanguage,
} from "../../src/services/formatter/capabilities";
import { formatCode } from "../../src/services/formatter";

describe("Formatter Capabilities: registry consultável do hub existente (MD-V03-021)", () => {
  it("getKnownFormatters retorna catálogo completo de formatadores web e CLI", () => {
    const formatters = getKnownFormatters();
    expect(formatters.length).toBeGreaterThanOrEqual(7);

    const prettier = formatters.find((f) => f.id === "prettier");
    expect(prettier).toBeDefined();
    expect(prettier?.runtime).toBe("web");
    expect(prettier?.available).toBe(true);
    expect(prettier?.languages).toContain("typescript");
    expect(prettier?.languages).toContain("json");
    expect(prettier?.languages).toContain("markdown");

    const rustfmt = formatters.find((f) => f.id === "rustfmt");
    expect(rustfmt).toBeDefined();
    expect(rustfmt?.runtime).toBe("cli");
    expect(rustfmt?.binary).toBe("rustfmt");
    expect(rustfmt?.languages).toContain("rust");

    const ruff = formatters.find((f) => f.id === "ruff");
    expect(ruff).toBeDefined();
    expect(ruff?.runtime).toBe("cli");
    expect(ruff?.languages).toContain("python");
  });

  it("getFormatterCapabilitiesSnapshot gera snapshot estruturado com disponibilidade local", async () => {
    const snapshot = await getFormatterCapabilitiesSnapshot({ probeCli: false });
    expect(snapshot.timestamp).toBeGreaterThan(0);
    expect(snapshot.formatters.length).toBeGreaterThanOrEqual(7);
    expect(snapshot.supportedLanguages.length).toBeGreaterThan(10);

    // Prettier está sempre disponível (web runtime embutido)
    const prettier = snapshot.formatters.find((f) => f.id === "prettier");
    expect(prettier?.available).toBe(true);

    // Formatter CLI ausente não quebra o snapshot (é estado do snapshot)
    const rustfmt = snapshot.formatters.find((f) => f.id === "rustfmt");
    expect(rustfmt).toBeDefined();
    expect(typeof rustfmt?.available).toBe("boolean");
  });

  it("getFormatterForLanguage resolve o formatador correto para diferentes linguagens", () => {
    const tsFormatter = getFormatterForLanguage("typescript");
    expect(tsFormatter?.id).toBe("prettier");

    const pyFormatter = getFormatterForLanguage("py");
    expect(pyFormatter?.id).toBe("ruff");

    const rustFormatter = getFormatterForLanguage("rs");
    expect(rustFormatter?.id).toBe("rustfmt");

    const unknownFormatter = getFormatterForLanguage("unknown-lang");
    expect(unknownFormatter).toBeNull();
  });

  it("formatCode continua o caminho de execução padrão e preserva código sem erro global", async () => {
    // Formatação web (Prettier)
    const webRes = await formatCode("json", '{"a":1}');
    expect(webRes.formatted).toBe(true);
    expect(webRes.formatter).toBe("prettier");
    expect(webRes.code.trim()).toBe('{ "a": 1 }');

    // Linguagem sem formatador disponível preserva código original
    const unsupportedRes = await formatCode("unknown_xyz", "some code");
    expect(unsupportedRes.formatted).toBe(false);
    expect(unsupportedRes.code).toBe("some code");
  });
});
