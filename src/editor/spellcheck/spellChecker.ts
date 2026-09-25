export interface SpellChecker {
  checkWord(word: string, lang: "pt-BR" | "en-US"): boolean;
  getSuggestions(word: string, lang: "pt-BR" | "en-US", maxCount?: number): string[];
  addToUserDictionary(word: string): void;
  ignoreWord(word: string): void;
  isIgnored(word: string): boolean;
  isAvailable(): boolean;
}

// Vocabulário essencial pt-BR (amostra representativa para testes e uso offline)
const BASE_PT_BR = new Set([
  "o", "a", "os", "as", "um", "uma", "uns", "umas", "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas",
  "por", "para", "com", "sem", "sobre", "sob", "entre", "ate", "até", "como", "quando", "onde", "porque", "porquê",
  "que", "se", "mas", "mais", "e", "ou", "nem", "tambem", "também", "ja", "já", "ainda", "assim", "entao", "então",
  "muito", "pouco", "tudo", "nada", "todo", "toda", "todos", "todas", "outro", "outra", "outros", "outras",
  "este", "esta", "estes", "estas", "esse", "essa", "esses", "essas", "aquele", "aquela", "aqueles", "aquelas",
  "isto", "isso", "aquilo", "meu", "minha", "meus", "minhas", "seu", "sua", "seus", "suas", "nosso", "nossa",
  "eu", "tu", "ele", "ela", "nos", "nós", "vos", "vós", "eles", "elas", "voce", "você", "voces", "vocês",
  "ser", "estar", "ter", "haver", "fazer", "ir", "vir", "ver", "dar", "saber", "poder", "dizer", "falar",
  "escrever", "ler", "criar", "editar", "salvar", "abrir", "fechar", "buscar", "pesquisar", "documento",
  "arquivo", "texto", "nota", "notas", "titulo", "título", "subtitulo", "subtítulo", "paragrafo", "parágrafo",
  "secao", "seção", "secoes", "seções", "capitulo", "capítulo", "indice", "índice", "referencia", "referência",
  "link", "links", "imagem", "imagens", "tabela", "tabelas", "codigo", "código", "bloco", "blocos",
  "editor", "estúdio", "estudio", "projeto", "sistema", "usuario", "usuário", "versao", "versão",
  "correto", "correta", "errado", "errada", "palavra", "palavras", "ortografia", "qualidade", "escrita",
  "teste", "testes", "exemplo", "exemplos", "guia", "manual", "ajuda", "novo", "nova", "novos", "novas",
  "bom", "boa", "bons", "boas", "grande", "pequeno", "alto", "baixo", "facil", "fácil", "dificil", "difícil",
  "rapido", "rápido", "lento", "seguro", "segura", "local", "locais", "rede", "linha", "linhas",
]);

// Vocabulário essencial en-US
const BASE_EN_US = new Set([
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on", "with", "he",
  "as", "you", "do", "at", "this", "but", "his", "by", "from", "they", "we", "say", "her", "she", "or",
  "an", "will", "my", "one", "all", "would", "there", "their", "what", "so", "up", "out", "if", "about",
  "who", "get", "which", "go", "me", "when", "make", "can", "like", "time", "no", "just", "him", "know",
  "take", "people", "into", "year", "your", "good", "some", "could", "them", "see", "other", "than", "then",
  "now", "look", "only", "come", "its", "over", "think", "also", "back", "after", "use", "two", "how",
  "our", "work", "first", "well", "way", "even", "new", "want", "because", "any", "these", "give", "day",
  "most", "us", "markdown", "editor", "document", "file", "text", "note", "title", "heading", "table",
  "code", "link", "image", "asset", "system", "user", "test", "guide", "quality", "writing", "spell", "check",
]);

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

export class LocalSpellChecker implements SpellChecker {
  private userDictionary: Set<string> = new Set();
  private ignoredWords: Set<string> = new Set();
  private isReady = true;

  constructor() {
    this.loadPersistence();
  }

  private loadPersistence() {
    try {
      if (typeof localStorage !== "undefined") {
        const rawDict = localStorage.getItem("md-studio-user-dictionary");
        if (rawDict) {
          const list = JSON.parse(rawDict);
          if (Array.isArray(list)) {
            this.userDictionary = new Set(list.map((w) => w.toLowerCase()));
          }
        }
        const rawIgnore = localStorage.getItem("md-studio-ignored-words");
        if (rawIgnore) {
          const list = JSON.parse(rawIgnore);
          if (Array.isArray(list)) {
            this.ignoredWords = new Set(list.map((w) => w.toLowerCase()));
          }
        }
      }
    } catch {
      // Fallback gracioso: dicionário pessoal vazio se storage estiver corrompido
      this.userDictionary = new Set();
      this.ignoredWords = new Set();
    }
  }

  private savePersistence() {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("md-studio-user-dictionary", JSON.stringify(Array.from(this.userDictionary)));
        localStorage.setItem("md-studio-ignored-words", JSON.stringify(Array.from(this.ignoredWords)));
      }
    } catch {
      // Ignore
    }
  }

  public isAvailable(): boolean {
    return this.isReady;
  }

  public checkWord(word: string, lang: "pt-BR" | "en-US"): boolean {
    if (!this.isReady) return true; // Se engine indisponível, não bloqueia e considera válido

    const clean = word.trim().toLowerCase();
    if (!clean || clean.length <= 1 || /^\d+$/.test(clean)) {
      return true;
    }

    if (this.ignoredWords.has(clean) || this.userDictionary.has(clean)) {
      return true;
    }

    const dict = lang === "pt-BR" ? BASE_PT_BR : BASE_EN_US;
    return dict.has(clean);
  }

  public getSuggestions(word: string, lang: "pt-BR" | "en-US", maxCount = 5): string[] {
    if (!this.isReady) return [];
    const clean = word.trim().toLowerCase();
    const dict = lang === "pt-BR" ? BASE_PT_BR : BASE_EN_US;
    const candidates: Array<{ word: string; distance: number }> = [];

    // Combinar dicionário base + pessoal
    const combined = new Set([...dict, ...this.userDictionary]);

    for (const entry of combined) {
      if (Math.abs(entry.length - clean.length) <= 2) {
        const dist = levenshteinDistance(clean, entry);
        if (dist <= 2) {
          candidates.push({ word: entry, distance: dist });
        }
      }
    }

    candidates.sort((a, b) => a.distance - b.distance || a.word.localeCompare(b.word));
    return candidates.slice(0, maxCount).map((c) => c.word);
  }

  public addToUserDictionary(word: string): void {
    const clean = word.trim().toLowerCase();
    if (clean) {
      this.userDictionary.add(clean);
      this.savePersistence();
    }
  }

  public ignoreWord(word: string): void {
    const clean = word.trim().toLowerCase();
    if (clean) {
      this.ignoredWords.add(clean);
      this.savePersistence();
    }
  }

  public isIgnored(word: string): boolean {
    return this.ignoredWords.has(word.trim().toLowerCase());
  }
}

export const defaultSpellChecker = new LocalSpellChecker();
