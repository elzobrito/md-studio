import { describe, expect, it, afterEach } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { insertMath, wrapMathBody } from "../../src/editor/formatting/math";

function makeView(doc: string, from: number, to: number): EditorView {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  return new EditorView({
    state: EditorState.create({
      doc,
      extensions: [markdown()],
      selection: { anchor: from, head: to },
    }),
    parent,
  });
}

describe("insertMath", () => {
  const views: EditorView[] = [];

  afterEach(() => {
    for (const view of views) {
      view.destroy();
      view.dom.parentElement?.remove();
    }
    views.length = 0;
  });

  it("wrapMathBody cobre github e latex, inline e display", () => {
    expect(wrapMathBody("x", "github", "inline")).toBe("$x$");
    expect(wrapMathBody("x", "github", "display")).toBe("$$x$$");
    expect(wrapMathBody("x", "latex", "inline")).toBe("\\(x\\)");
    expect(wrapMathBody("x", "latex", "display")).toBe("\\[x\\]");
  });

  it("sabor github inline envolve a seleção com cifrões simples", () => {
    const view = makeView("Hello World", 0, 5);
    views.push(view);
    insertMath(view, { flavor: "github", mode: "inline" });
    expect(view.state.doc.toString()).toBe("$Hello$ World");
  });

  it("sabor github display envolve a seleção com cifrões duplos", () => {
    const view = makeView("Hello World", 0, 5);
    views.push(view);
    insertMath(view, { flavor: "github", mode: "display" });
    expect(view.state.doc.toString()).toBe("$$Hello$$ World");
  });

  it("sabor latex inline usa \\( \\) e display usa \\[ \\]", () => {
    const inlineView = makeView("Hello World", 0, 5);
    views.push(inlineView);
    insertMath(inlineView, { flavor: "latex", mode: "inline" });
    expect(inlineView.state.doc.toString()).toBe("\\(Hello\\) World");

    const displayView = makeView("Hello World", 0, 5);
    views.push(displayView);
    insertMath(displayView, { flavor: "latex", mode: "display" });
    expect(displayView.state.doc.toString()).toBe("\\[Hello\\] World");
  });

  it("paleta insere frac, sqrt e símbolo grego no wrap ativo", () => {
    const frac = makeView("", 0, 0);
    views.push(frac);
    insertMath(frac, { flavor: "github", mode: "inline", body: "\\frac{a}{b}" });
    expect(frac.state.doc.toString()).toBe("$\\frac{a}{b}$");

    const sqrt = makeView("", 0, 0);
    views.push(sqrt);
    insertMath(sqrt, { flavor: "latex", mode: "display", body: "\\sqrt{x}" });
    expect(sqrt.state.doc.toString()).toBe("\\[\\sqrt{x}\\]");

    const alpha = makeView("", 0, 0);
    views.push(alpha);
    insertMath(alpha, { flavor: "github", mode: "inline", body: "\\alpha" });
    expect(alpha.state.doc.toString()).toBe("$\\alpha$");
  });
});
