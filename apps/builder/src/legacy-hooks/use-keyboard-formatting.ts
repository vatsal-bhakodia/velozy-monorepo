import { useCallback } from "react";

export function useKeyboardFormatting(saveChanges: () => void) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const selectedText = range.toString();

        if (!selectedText) return;

        let handled = false;

        try {
          switch (e.key.toLowerCase()) {
            case "b":
              e.preventDefault();
              const strong = document.createElement("strong");
              try {
                range.surroundContents(strong);
              } catch (err) {
                strong.textContent = selectedText;
                range.deleteContents();
                range.insertNode(strong);
              }
              handled = true;
              break;
            case "i":
              e.preventDefault();
              const em = document.createElement("em");
              try {
                range.surroundContents(em);
              } catch (err) {
                em.textContent = selectedText;
                range.deleteContents();
                range.insertNode(em);
              }
              handled = true;
              break;
            case "u":
              e.preventDefault();
              const u = document.createElement("u");
              try {
                range.surroundContents(u);
              } catch (err) {
                u.textContent = selectedText;
                range.deleteContents();
                range.insertNode(u);
              }
              handled = true;
              break;
            default:
              break;
          }

          if (handled) {
            selection.removeAllRanges();
            saveChanges();
          }
        } catch (error) {
          console.warn("Keyboard shortcut formatting error:", error);
        }
      }
    },
    [saveChanges],
  );

  return handleKeyDown;
}
