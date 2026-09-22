import { describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { CodeBlock } from "../../src/components/CodeBlock";
import { MarkdownViewer } from "../../src/components/MarkdownViewer";

// Configure React act environment
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

async function waitFor(fn: () => void | Promise<void>, timeout = 3000, interval = 50): Promise<void> {
  const start = Date.now();
  let lastError: unknown;
  while (Date.now() - start < timeout) {
    try {
      await fn();
      return;
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, interval));
    }
  }
  throw lastError;
}

describe("Code Formatting UI Integration", () => {
  it("renders CodeBlock with Formatar and Copiar buttons and handles formatting", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const onFormatted = vi.fn();

    await act(async () => {
      root.render(
        <CodeBlock
          code="const a=1;const b=2;"
          language="javascript"
          onFormatted={onFormatted}
        />
      );
    });

    const formatBtn = container.querySelector<HTMLButtonElement>(".code-block-action-format");
    const copyBtn = container.querySelector<HTMLButtonElement>(".code-block-action-copy");
    const langSpan = container.querySelector<HTMLSpanElement>(".code-block-lang");

    expect(formatBtn).not.toBeNull();
    expect(copyBtn).not.toBeNull();
    expect(langSpan?.textContent).toBe("javascript");

    // Click format
    await act(async () => {
      formatBtn?.click();
    });

    expect(onFormatted).toHaveBeenCalled();
    expect(onFormatted.mock.calls[0][0]).toBe("const a = 1;\nconst b = 2;\n");

    root.unmount();
    container.remove();
  });

  it("decorates preview pre.shiki with header actions in MarkdownViewer", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const markdown = `# Title\n\`\`\`javascript\nconst a=1;\n\`\`\``;
    const onChangeContent = vi.fn();

    await act(async () => {
      root.render(
        <MarkdownViewer
          content={markdown}
          relativePath="test.md"
          onChangeContent={onChangeContent}
        />
      );
    });

    // Wait until MarkdownViewer processes the markdown and decorates the pre.shiki
    await waitFor(() => {
      const codeContainer = container.querySelector(".code-block-container");
      expect(codeContainer).not.toBeNull();
    });

    const formatBtn = container.querySelector<HTMLButtonElement>(".code-block-action-format");
    const copyBtn = container.querySelector<HTMLButtonElement>(".code-block-action-copy");
    const langSpan = container.querySelector<HTMLSpanElement>(".code-block-lang");

    expect(formatBtn).not.toBeNull();
    expect(copyBtn).not.toBeNull();
    expect(langSpan?.textContent).toBe("javascript");

    // Click format
    await act(async () => {
      formatBtn?.click();
    });

    await waitFor(() => {
      expect(onChangeContent).toHaveBeenCalled();
    });

    const updatedContent = onChangeContent.mock.calls[0][0];
    expect(updatedContent).toContain("const a = 1;");

    root.unmount();
    container.remove();
  });
});
