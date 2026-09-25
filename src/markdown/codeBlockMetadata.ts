export interface CodeBlockMetadata {
  lang: string;
  filename?: string;
  highlightLines: Set<number>;
  focusLines: Set<number>;
  showLineNumbers: boolean;
  tabTitle?: string;
  isDiff: boolean;
}

/**
 * Converte strings de intervalos numéricos (ex: "1,3-5,8") em um Set de números de linha.
 */
export function parseRangeString(rangeStr: string): Set<number> {
  const result = new Set<number>();
  if (!rangeStr) return result;

  const parts = rangeStr.split(",");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes("-")) {
      const [startStr, endStr] = trimmed.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          result.add(i);
        }
      }
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num)) {
        result.add(num);
      }
    }
  }

  return result;
}

/**
 * Extrai metadata declarativa do fence de blocos de código:
 * Exemplos:
 * ```ts filename="main.ts" {1,3-5} showLineNumbers
 * ```python:script.py focus={2-4}
 * ```rust [tab:Server]
 */
export function parseCodeBlockMetadata(metaString = "", rawLang = ""): CodeBlockMetadata {
  let lang = rawLang.trim();
  let filename: string | undefined;
  let tabTitle: string | undefined;
  let showLineNumbers = false;
  let highlightLines = new Set<number>();
  let focusLines = new Set<number>();

  // 1. Checar se a linguagem traz filename embutido (ex: python:main.py)
  if (lang.includes(":")) {
    const [l, fn] = lang.split(":", 2);
    lang = l.trim();
    filename = fn.trim();
  }

  const meta = metaString.trim();
  if (meta) {
    // 2. Extrair filename="..." ou filename=foo.ts
    const fnMatch = meta.match(/filename=["']([^"']+)["']/) || meta.match(/filename=([^\s]+)/);
    if (fnMatch) {
      filename = fnMatch[1];
    }

    // 3. Extrair abas: [tab:Título] ou [Título] ou tab="Título"
    const tabMatch =
      meta.match(/\[tab:([^\]]+)\]/) ||
      meta.match(/\[([^\]]+)\]/) ||
      meta.match(/tab=["']([^"']+)["']/);
    if (tabMatch) {
      tabTitle = tabMatch[1].trim();
    }

    // 4. Extrair line numbers
    if (meta.includes("showLineNumbers") || meta.includes("lines")) {
      showLineNumbers = true;
    }

    // 5. Extrair highlight ranges {1,3-5} ou highlight={1,3-5}
    const hlMatch = meta.match(/\{([0-9,\s-]+)\}/) || meta.match(/highlight=\{([0-9,\s-]+)\}/);
    if (hlMatch) {
      highlightLines = parseRangeString(hlMatch[1]);
    }

    // 6. Extrair focus ranges focus={2-4}
    const focusMatch = meta.match(/focus=\{([0-9,\s-]+)\}/);
    if (focusMatch) {
      focusLines = parseRangeString(focusMatch[1]);
    }
  }

  return {
    lang,
    filename,
    highlightLines,
    focusLines,
    showLineNumbers,
    tabTitle,
    isDiff: lang.toLowerCase() === "diff",
  };
}

/**
 * Cria transformer do Shiki para decorar nós de pre e linhas com metadados do fence.
 */
export function shikiAdvancedCodeBlockTransformer() {
  return {
    name: "shiki-advanced-code-blocks",
    pre(this: any, node: any) {
      const rawMeta = this.options?.meta?.__raw || "";
      const lang = this.options?.lang || "";
      const parsed = parseCodeBlockMetadata(rawMeta, lang);

      node.properties = node.properties || {};
      node.properties["data-language"] = parsed.lang || "text";

      if (parsed.filename) {
        node.properties["data-filename"] = parsed.filename;
      }
      if (parsed.tabTitle) {
        node.properties["data-tab-title"] = parsed.tabTitle;
      }
      if (parsed.showLineNumbers) {
        node.properties["data-line-numbers"] = "true";
      }
      if (parsed.highlightLines.size > 0) {
        node.properties["data-highlight-lines"] = Array.from(parsed.highlightLines).join(",");
      }
      if (parsed.focusLines.size > 0) {
        node.properties["data-focus-lines"] = Array.from(parsed.focusLines).join(",");
      }
    },
    line(this: any, node: any, line: number) {
      const rawMeta = this.options?.meta?.__raw || "";
      const parsed = parseCodeBlockMetadata(rawMeta);

      node.properties = node.properties || {};
      node.properties.className = node.properties.className || [];

      if (parsed.highlightLines.has(line)) {
        if (!node.properties.className.includes("line-highlight")) {
          node.properties.className.push("line-highlight");
        }
      }

      if (parsed.focusLines.size > 0) {
        if (parsed.focusLines.has(line)) {
          if (!node.properties.className.includes("line-focus")) {
            node.properties.className.push("line-focus");
          }
        } else {
          if (!node.properties.className.includes("line-dimmed")) {
            node.properties.className.push("line-dimmed");
          }
        }
      }
    },
  };
}

/**
 * Organiza blocos de código com abas adjacentes (Code Groups) no DOM.
 * Alternar abas é puramente visual (display: none / block) sem re-parsear o documento.
 */
export function groupAdjacentCodeTabs(container: HTMLElement): void {
  const codeBlocks = Array.from(container.querySelectorAll<HTMLElement>(".code-block-container"));
  if (codeBlocks.length === 0) return;

  let currentGroup: HTMLElement[] = [];

  const flushGroup = () => {
    if (currentGroup.length <= 1) {
      currentGroup = [];
      return;
    }

    const groupWrapper = document.createElement("div");
    groupWrapper.className = "code-group-container";
    groupWrapper.style.margin = "16px 0";
    groupWrapper.style.border = "1px solid var(--border-color, #313244)";
    groupWrapper.style.borderRadius = "8px";
    groupWrapper.style.overflow = "hidden";

    const tabBar = document.createElement("div");
    tabBar.className = "code-group-tab-bar";
    tabBar.style.display = "flex";
    tabBar.style.gap = "4px";
    tabBar.style.padding = "4px 8px";
    tabBar.style.background = "var(--bg-subtle, #181825)";
    tabBar.style.borderBottom = "1px solid var(--border-color, #313244)";

    const blocksInGroup = [...currentGroup];

    currentGroup.forEach((block, idx) => {
      const tabTitle = block.getAttribute("data-tab-title") || `Tab ${idx + 1}`;
      const tabBtn = document.createElement("button");
      tabBtn.type = "button";
      tabBtn.className = `code-group-tab ${idx === 0 ? "active" : ""}`;
      tabBtn.textContent = tabTitle;
      tabBtn.style.padding = "4px 10px";
      tabBtn.style.fontSize = "12px";
      tabBtn.style.border = "none";
      tabBtn.style.borderRadius = "4px";
      tabBtn.style.cursor = "pointer";
      tabBtn.style.background = idx === 0 ? "var(--bg-active, #313244)" : "transparent";
      tabBtn.style.color = idx === 0 ? "var(--text-active, #89b4fa)" : "var(--text-muted, #a6adc8)";

      tabBtn.onclick = () => {
        // Alternar abas sem tocar no documento nem disparar eval
        tabBar.querySelectorAll<HTMLElement>(".code-group-tab").forEach((b) => {
          b.classList.remove("active");
          b.style.background = "transparent";
          b.style.color = "var(--text-muted, #a6adc8)";
        });
        tabBtn.classList.add("active");
        tabBtn.style.background = "var(--bg-active, #313244)";
        tabBtn.style.color = "var(--text-active, #89b4fa)";

        blocksInGroup.forEach((b, bIdx) => {
          b.style.display = bIdx === idx ? "block" : "none";
        });
      };

      tabBar.appendChild(tabBtn);

      // Configuração inicial de visibilidade
      block.style.display = idx === 0 ? "block" : "none";
      block.style.margin = "0";
      block.style.border = "none";
    });

    // Inserir wrapper antes do primeiro bloco
    const parent = currentGroup[0].parentNode;
    if (parent) {
      parent.insertBefore(groupWrapper, currentGroup[0]);
      groupWrapper.appendChild(tabBar);
      currentGroup.forEach((block) => groupWrapper.appendChild(block));
    }

    currentGroup = [];
  };

  for (const block of codeBlocks) {
    const tabTitle = block.getAttribute("data-tab-title");
    if (tabTitle) {
      currentGroup.push(block);
    } else {
      flushGroup();
    }
  }
  flushGroup();
}
