import { StateEffect, StateField, type Extension } from "@codemirror/state";
import { Decoration, EditorView, hoverTooltip, type DecorationSet, type Tooltip } from "@codemirror/view";
import { defaultSpellChecker, type SpellChecker } from "./spellChecker";

export interface SpellCheckConfig {
  enabled: boolean;
  language: "pt-BR" | "en-US";
  ignoreCodeBlocks: boolean;
}

export const DEFAULT_SPELL_CONFIG: SpellCheckConfig = {
  enabled: true,
  language: "pt-BR",
  ignoreCodeBlocks: true,
};

export interface SpellIssue {
  from: number;
  to: number;
  word: string;
  suggestions: string[];
}

export const setSpellIssues = StateEffect.define<SpellIssue[]>();

const spellErrorMark = Decoration.mark({
  class: "cm-spell-error",
  attributes: {
    style: "text-decoration: underline wavy #e06c75; text-underline-offset: 3px;",
  },
});

export const spellIssuesField = StateField.define<SpellIssue[]>({
  create() {
    return [];
  },
  update(issues, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setSpellIssues)) {
        return effect.value;
      }
    }
    return issues;
  },
});

export const spellDecorationsField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    const issues = tr.state.field(spellIssuesField, false);
    if (!issues || issues.length === 0) {
      return Decoration.none;
    }

    const ranges = issues.map((issue) => spellErrorMark.range(issue.from, issue.to));
    ranges.sort((a, b) => a.from - b.from || a.to - b.to);
    return Decoration.set(ranges, true);
  },
  provide: (f) => EditorView.decorations.from(f),
});

/**
 * Analisa o texto do documento e extrai palavras para verificação ortográfica,
 * ignorando deterministamente code fences, código inline, URLs e blocos KaTeX.
 */
export function scanSpellIssues(
  content: string,
  config: SpellCheckConfig,
  checker: SpellChecker = defaultSpellChecker
): SpellIssue[] {
  if (!config.enabled || !checker.isAvailable()) {
    return [];
  }

  const issues: SpellIssue[] = [];
  const lines = content.split("\n");
  let inCodeBlock = false;
  let inMathBlock = false;
  let currentOffset = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // 1. Detectar Code Fences
    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      inCodeBlock = !inCodeBlock;
      currentOffset += line.length + 1;
      continue;
    }

    if (inCodeBlock && config.ignoreCodeBlocks) {
      currentOffset += line.length + 1;
      continue;
    }

    // 2. Detectar Math Blocks ($$)
    if (trimmed.startsWith("$$")) {
      if (trimmed.length > 2 && trimmed.endsWith("$$")) {
        // inline math block
      } else {
        inMathBlock = !inMathBlock;
      }
      currentOffset += line.length + 1;
      continue;
    }

    if (inMathBlock) {
      currentOffset += line.length + 1;
      continue;
    }

    // 3. Processar palavras na linha
    // Regex para extrair palavras preservando posições e ignorando URLs/código inline
    const wordRegex = /[a-zA-ZÀ-ÿ]+/g;
    let match: RegExpExecArray | null;

    while ((match = wordRegex.exec(line)) !== null) {
      const word = match[0];
      const startCol = match.index;
      const endCol = startCol + word.length;

      // Ignorar se estiver dentro de código inline `...`
      const beforeInLine = line.slice(0, startCol);
      const backtickCount = (beforeInLine.match(/`/g) || []).length;
      if (backtickCount % 2 === 1) {
        continue;
      }

      // Ignorar se fizer parte de uma URL (ex: http://, https://)
      const surrounding = line.slice(Math.max(0, startCol - 8), endCol + 8);
      if (surrounding.includes("http://") || surrounding.includes("https://") || surrounding.includes("mailto:")) {
        continue;
      }

      if (!checker.checkWord(word, config.language)) {
        const suggestions = checker.getSuggestions(word, config.language, 4);
        issues.push({
          from: currentOffset + startCol,
          to: currentOffset + endCol,
          word,
          suggestions,
        });
      }
    }

    currentOffset += line.length + 1;
  }

  return issues;
}

/**
 * Tooltip com sugestões de correção, ignorar e adicionar ao dicionário.
 */
export function createSpellTooltip(checker: SpellChecker = defaultSpellChecker): Extension {
  return hoverTooltip((view, pos) => {
    const issues = view.state.field(spellIssuesField, false);
    if (!issues || issues.length === 0) return null;

    const issue = issues.find((i) => pos >= i.from && pos <= i.to);
    if (!issue) return null;

    return {
      pos: issue.from,
      end: issue.to,
      above: true,
      create() {
        const dom = document.createElement("div");
        dom.className = "cm-spell-tooltip";
        dom.style.padding = "6px 8px";
        dom.style.fontSize = "12px";
        dom.style.background = "#282c34";
        dom.style.color = "#abb2bf";
        dom.style.border = "1px solid #4b5263";
        dom.style.borderRadius = "4px";
        dom.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";

        const title = document.createElement("div");
        title.style.fontWeight = "bold";
        title.style.marginBottom = "4px";
        title.textContent = `Ortografia: "${issue.word}"`;
        dom.appendChild(title);

        if (issue.suggestions.length > 0) {
          const sugLabel = document.createElement("div");
          sugLabel.textContent = "Sugestões:";
          dom.appendChild(sugLabel);

          for (const s of issue.suggestions) {
            const btn = document.createElement("button");
            btn.textContent = s;
            btn.style.margin = "2px 4px 2px 0";
            btn.style.padding = "2px 6px";
            btn.style.background = "#3e4451";
            btn.style.color = "#61afef";
            btn.style.border = "none";
            btn.style.borderRadius = "3px";
            btn.style.cursor = "pointer";
            btn.onclick = () => {
              view.dispatch({
                changes: { from: issue.from, to: issue.to, insert: s },
              });
            };
            dom.appendChild(btn);
          }
        }

        const actions = document.createElement("div");
        actions.style.marginTop = "6px";
        actions.style.borderTop = "1px solid #3e4451";
        actions.style.paddingTop = "4px";

        const addBtn = document.createElement("button");
        addBtn.textContent = "Adicionar ao dicionário";
        addBtn.style.marginRight = "6px";
        addBtn.style.background = "transparent";
        addBtn.style.color = "#98c379";
        addBtn.style.border = "none";
        addBtn.style.cursor = "pointer";
        addBtn.onclick = () => {
          checker.addToUserDictionary(issue.word);
          // Atualizar issues excluindo a palavra adicionada
          const updated = issues.filter((x) => x.word.toLowerCase() !== issue.word.toLowerCase());
          view.dispatch({ effects: setSpellIssues.of(updated) });
        };
        actions.appendChild(addBtn);

        const ignoreBtn = document.createElement("button");
        ignoreBtn.textContent = "Ignorar";
        ignoreBtn.style.background = "transparent";
        ignoreBtn.style.color = "#e5c07b";
        ignoreBtn.style.border = "none";
        ignoreBtn.style.cursor = "pointer";
        ignoreBtn.onclick = () => {
          checker.ignoreWord(issue.word);
          const updated = issues.filter((x) => x.word.toLowerCase() !== issue.word.toLowerCase());
          view.dispatch({ effects: setSpellIssues.of(updated) });
        };
        actions.appendChild(ignoreBtn);

        dom.appendChild(actions);

        return { dom };
      },
    } as Tooltip;
  });
}

/**
 * Cria a extensão do CodeMirror para verificação ortográfica.
 */
export function createSpellExtension(
  config: SpellCheckConfig,
  checker: SpellChecker = defaultSpellChecker
): Extension[] {
  return [
    spellIssuesField,
    spellDecorationsField,
    createSpellTooltip(checker),
  ];
}
