import { isWebLanguage } from "./web";
import { formatCode } from "./index";
import { normalizeLanguage } from "../../markdown/code";

export type FormatterRuntime = "web" | "cli";

export interface FormatterCapability {
  id: string;
  name: string;
  runtime: FormatterRuntime;
  languages: string[];
  available: boolean;
  binary?: string;
  version?: string;
  description?: string;
}

export interface FormatterCapabilitiesSnapshot {
  timestamp: number;
  formatters: FormatterCapability[];
  supportedLanguages: string[];
}

/**
 * Catálogo canônico de formatadores suportados pelo hub do MD Studio.
 * Prettier executa em runtime Web no frontend.
 * Os demais executam em runtime CLI nativo via Tauri.
 */
export const KNOWN_FORMATTERS: FormatterCapability[] = [
  {
    id: "prettier",
    name: "Prettier",
    runtime: "web",
    languages: [
      "javascript", "js", "jsx",
      "typescript", "ts", "tsx",
      "json", "json5",
      "html", "vue",
      "css", "scss", "less",
      "yaml", "yml",
      "markdown", "md",
    ],
    available: true,
    description: "Formatador integrado para linguagens web (execução direta no frontend)",
  },
  {
    id: "rustfmt",
    name: "Rustfmt",
    runtime: "cli",
    binary: "rustfmt",
    languages: ["rust", "rs"],
    available: false,
    description: "Formatador padrão da linguagem Rust",
  },
  {
    id: "ruff",
    name: "Ruff",
    runtime: "cli",
    binary: "ruff",
    languages: ["python", "py"],
    available: false,
    description: "Formatador e linter ultrarrápido para Python",
  },
  {
    id: "gofmt",
    name: "gofmt",
    runtime: "cli",
    binary: "gofmt",
    languages: ["go", "golang"],
    available: false,
    description: "Formatador oficial da linguagem Go",
  },
  {
    id: "clang-format",
    name: "clang-format",
    runtime: "cli",
    binary: "clang-format",
    languages: ["c", "h", "cpp", "cxx", "cc", "c++", "hpp", "hxx", "csharp", "cs", "proto", "protobuf"],
    available: false,
    description: "Formatador LLVM para C, C++, C# e Protocol Buffers",
  },
  {
    id: "google-java-format",
    name: "google-java-format",
    runtime: "cli",
    binary: "google-java-format",
    languages: ["java"],
    available: false,
    description: "Formatador oficial Google para código Java",
  },
  {
    id: "php-cs-fixer",
    name: "PHP-CS-Fixer",
    runtime: "cli",
    binary: "php-cs-fixer",
    languages: ["php"],
    available: false,
    description: "Formatador e consertador de padrões de código PHP",
  },
  {
    id: "dart",
    name: "Dart Format",
    runtime: "cli",
    binary: "dart",
    languages: ["dart"],
    available: false,
    description: "Formatador integrado da ferramenta Dart/Flutter",
  },
];

/**
 * Obtém a lista estática de formatadores conhecidos.
 */
export function getKnownFormatters(): FormatterCapability[] {
  return KNOWN_FORMATTERS.map((f) => ({ ...f, languages: [...f.languages] }));
}

/**
 * Gera um snapshot consultável das capacidades dos formatadores locais.
 * - Detecta localmente a disponibilidade sem instalar nada, sem rede e sem download.
 * - Ferramentas ausentes ficam marcadas com available: false no snapshot.
 */
export async function getFormatterCapabilitiesSnapshot(
  options: { probeCli?: boolean } = { probeCli: true }
): Promise<FormatterCapabilitiesSnapshot> {
  const formatters = getKnownFormatters();
  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  if (options.probeCli && isTauri) {
    // Sondar disponibilidade local dos CLIs de forma segura sem travar o editor
    await Promise.all(
      formatters
        .filter((f) => f.runtime === "cli")
        .map(async (f) => {
          try {
            const probeLang = f.languages[0];
            const res = await formatCode(probeLang, "/* probe */");
            // Se o retorno não for <tool>-missing e não for unsupported, está presente
            if (res.formatter && !res.formatter.endsWith("-missing") && res.formatter !== "unsupported") {
              f.available = true;
            } else {
              f.available = false;
            }
          } catch {
            f.available = false;
          }
        })
    );
  }

  const supportedLanguagesSet = new Set<string>();
  for (const f of formatters) {
    for (const lang of f.languages) {
      supportedLanguagesSet.add(lang);
    }
  }

  return {
    timestamp: Date.now(),
    formatters,
    supportedLanguages: Array.from(supportedLanguagesSet).sort(),
  };
}

/**
 * Encontra a capacidade de formatação para uma linguagem específica.
 */
export function getFormatterForLanguage(
  language: string,
  snapshot?: FormatterCapabilitiesSnapshot
): FormatterCapability | null {
  const norm = normalizeLanguage(language).toLowerCase().trim();
  const formatters = snapshot ? snapshot.formatters : KNOWN_FORMATTERS;

  for (const f of formatters) {
    if (f.languages.some((l) => l.toLowerCase() === norm)) {
      return f;
    }
  }
  return null;
}
