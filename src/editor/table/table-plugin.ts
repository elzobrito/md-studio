import { keymap } from "@codemirror/view";
import {
  isInTable,
  moveToNextCell,
  moveToPrevCell,
  moveToNextRow,
} from "./table-helpers";

export const tableKeymap = keymap.of([
  {
    key: "Tab",
    run: (view) => {
      if (isInTable(view)) {
        moveToNextCell(view);
        return true;
      }
      return false;
    },
  },
  {
    key: "Shift-Tab",
    run: (view) => {
      if (isInTable(view)) {
        moveToPrevCell(view);
        return true;
      }
      return false;
    },
  },
  {
    key: "Enter",
    run: (view) => {
      if (isInTable(view)) {
        moveToNextRow(view);
        return true;
      }
      return false;
    },
  },
]);
