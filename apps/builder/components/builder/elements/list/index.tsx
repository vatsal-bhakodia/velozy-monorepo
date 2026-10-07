import React, { useEffect, useRef, useCallback } from "react";
import { useNode } from "@craftjs/core";
import { useKeyboardFormatting } from "@/hooks/use-keyboard-formatting";
import { List as ListIcon } from "lucide-react";
import ToolBar from "@/components/builder/toolbar";
import { ListSettings } from "./settings";

type ListTag = "ul" | "ol";

export const List = ({
  items = [""],
  tag = "ul",
  listStyleType = "disc",
  style = {},
  className,
}: {
  items?: string[];
  tag?: ListTag;
  listStyleType?: string;
  style?: React.CSSProperties;
  className?: string;
}) => {
  const {
    connectors: { connect, drag },
    actions,
    selected,
  } = useNode((node) => ({
    selected: node.events.selected,
  }));

  const ref = useRef<HTMLElement>(null);
  const preventStateUpdate = useRef(false);

  // Save changes to craft.js state
  const saveChanges = useCallback(() => {
    if (ref.current && !preventStateUpdate.current) {
      const listItems = ref.current.querySelectorAll("li");
      const newItems = Array.from(listItems)
        .map((li) => li.innerHTML.trim())
        .filter((item) => item);

      if (
        newItems.length > 0 &&
        JSON.stringify(newItems) !== JSON.stringify(items)
      ) {
        actions.setProp((props: { items: string[] }) => {
          props.items = newItems;
        });
      }
    }
  }, [actions, items]);

  const handleKeyDown = useKeyboardFormatting(saveChanges);

  // Initialize content when component mounts or when items change
  useEffect(() => {
    if (ref.current) {
      const currentItems = Array.from(ref.current.querySelectorAll("li")).map(
        (li) => li.innerHTML.trim(),
      );

      // Only update if the current content is different from items prop
      // and we're not currently editing (to avoid overwriting user input)
      if (
        (!selected && ref.current.children.length === 0) ||
        (currentItems.length === 0 && items.length > 0)
      ) {
        ref.current.innerHTML = items
          .map((item) => `<li>${item}</li>`)
          .join("");
      }
    }
  }, [items, selected]);

  const handleInput = useCallback((e: React.FormEvent<HTMLElement>) => {
    // Don't update state during typing to prevent cursor issues
    preventStateUpdate.current = true;

    // Ensure content is always wrapped in li elements
    if (ref.current) {
      const listItems = ref.current.querySelectorAll("li");

      // If there are no li elements but there is content, wrap it in li
      if (listItems.length === 0 && ref.current.textContent?.trim()) {
        const content = ref.current.innerHTML.trim();
        ref.current.innerHTML = `<li>${content}</li>`;

        // Move cursor to end of the new li element
        const newLi = ref.current.querySelector("li");
        if (newLi) {
          const range = document.createRange();
          const selection = window.getSelection();
          range.selectNodeContents(newLi);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }

      // If all li elements are empty, ensure at least one empty li exists
      const hasNonEmptyItems = Array.from(listItems).some((li) =>
        li.textContent?.trim(),
      );
      if (!hasNonEmptyItems && listItems.length === 0) {
        ref.current.innerHTML = "<li></li>";

        // Focus the new empty li
        const newLi = ref.current.querySelector("li");
        if (newLi) {
          const range = document.createRange();
          const selection = window.getSelection();
          range.setStart(newLi, 0);
          range.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }
    }

    setTimeout(() => {
      preventStateUpdate.current = false;
    }, 100);
  }, []);

  const handleBlur = useCallback(() => {
    preventStateUpdate.current = false;
    setTimeout(() => saveChanges(), 10);
  }, [saveChanges]);

  const handleKeyDownList = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === "Backspace") {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const currentLi =
            range.startContainer.nodeType === Node.TEXT_NODE
              ? range.startContainer.parentElement?.closest("li")
              : (range.startContainer as Element).closest("li");

          if (currentLi && ref.current) {
            const listItems = ref.current.querySelectorAll("li");

            const isOnlyItem = listItems.length === 1;
            const isEmpty = !currentLi.textContent?.trim();
            const isAtStart = range.startOffset === 0;

            if (isOnlyItem && isEmpty && isAtStart) {
              e.preventDefault(); // Prevent deletion of the last empty <li>
              return;
            }
          }
        }
      }

      // Call the original formatting handler
      handleKeyDown(e);
    },
    [handleKeyDown],
  );

  // Save changes when component loses selection
  useEffect(() => {
    if (!selected && ref.current) {
      setTimeout(() => saveChanges(), 10);
    }
  }, [selected, saveChanges]);

  // Combine styles
  const combinedStyle = {
    listStyleType,
    paddingLeft: "1.5rem",
    ...style,
  };

  const ListComponent = tag;

  return (
    <ListComponent
      style={combinedStyle}
      className={className}
      ref={(element: HTMLElement | null) => {
        if (element) {
          (ref as React.MutableRefObject<HTMLElement | null>).current = element;
          connect(drag(element));
        }
      }}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onBlur={handleBlur}
      onKeyDown={handleKeyDownList}
    />
  );
};

List.craft = {
  displayName: "List",
  related: {
    toolbar: ToolBar,
  },
  toolbarSections: ["typography", "colors", "spacing"],
  customToolbarSections: [
    {
      key: "listSettings",
      label: "List Settings",
      icon: ListIcon,
      component: <ListSettings />,
      priority: 1,
    },
  ],
};
