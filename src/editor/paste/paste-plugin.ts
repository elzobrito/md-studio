import { EditorView } from "@codemirror/view";
import { htmlToMarkdown } from "./html-to-md";
import { settingsStore } from "../../state/settings";
import { handleTabularPaste } from "../tableDataPaste";

export const smartPasteExtension = EditorView.domEventHandlers({
  paste(event, view) {
    // If smartPaste is turned off in settings, let default paste happen
    if (!settingsStore.getState().smartPaste) {
      return false;
    }

    const clipboardData = event.clipboardData;
    if (!clipboardData) return false;

    // Check if plain text contains tabular data (TSV / CSV)
    const plainText = clipboardData.getData("text/plain");
    if (plainText && handleTabularPaste(plainText, view)) {
      event.preventDefault();
      return true;
    }

    // Check if there is HTML content in clipboard
    const html = clipboardData.getData("text/html");
    if (!html || !html.trim()) {
      return false;
    }

    // Convert HTML to Markdown
    const markdown = htmlToMarkdown(html);
    if (!markdown) {
      return false;
    }

    event.preventDefault();

    const { from, to } = view.state.selection.main;
    view.dispatch({
      changes: { from, to, insert: markdown },
      selection: { anchor: from + markdown.length },
    });

    return true;
  },
});
