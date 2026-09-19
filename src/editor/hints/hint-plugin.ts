import { hoverTooltip, type Tooltip } from "@codemirror/view";
import { matchHintAtPosition } from "./markdown-hints";
import { settingsStore } from "../../state/settings";
import "../../styles/hints.css";

export const markdownHintExtension = hoverTooltip(
  (view, pos) => {
    if (!settingsStore.getState().markdownHints) {
      return null;
    }

    const line = view.state.doc.lineAt(pos);
    const col = pos - line.from;
    const match = matchHintAtPosition(line.text, col, line.from);

    if (!match) return null;

    return {
      pos: match.from,
      end: match.to,
      above: true,
      create() {
        const dom = document.createElement("div");
        dom.className = "md-hint-tooltip visible";
        dom.textContent = match.message;
        return { dom };
      },
    } as Tooltip;
  },
  {
    hoverTime: 600,
  }
);
