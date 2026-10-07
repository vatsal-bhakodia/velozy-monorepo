import React, { useEffect, useRef } from "react";
import { useNode } from "@craftjs/core";

// List types
const LIST_TYPES = [
  { value: "ul", label: "Bullet List" },
  { value: "ol", label: "Numbered List" },
];

// List style types for unordered lists
const UL_STYLE_TYPES = [
  { value: "disc", label: "Disc" },
  { value: "circle", label: "Circle" },
  { value: "square", label: "Square" },
  { value: "none", label: "None" },
];

// List style types for ordered lists
const OL_STYLE_TYPES = [
  { value: "decimal", label: "Numbers (1, 2, 3)" },
  { value: "lower-roman", label: "Lowercase Roman (i, ii, iii)" },
  { value: "upper-roman", label: "Uppercase Roman (I, II, III)" },
  { value: "lower-alpha", label: "Lowercase Letters (a, b, c)" },
  { value: "upper-alpha", label: "Uppercase Letters (A, B, C)" },
  { value: "none", label: "None" },
];

export const ListSettings = () => {
  const { actions, tag, listStyleType } = useNode((node) => ({
    tag: node.data.props.tag || "ul",
    listStyleType: node.data.props.listStyleType || "disc",
  }));

  // Get reference to the List component's ref through a parent context or by finding it
  const listRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Find the list element in the DOM (this is a workaround)
    const listElement = document.querySelector(
      '[contenteditable="true"][style*="list-style-type"]',
    ) as HTMLElement;
    if (listElement) {
      listRef.current = listElement;
    }
  }, []);

  const handleTagChange = (newTag: string) => {
    // Save current content before changing tag
    if (listRef.current) {
      const listItems = listRef.current.querySelectorAll("li");
      const currentItems = Array.from(listItems)
        .map((li) => li.innerHTML.trim())
        .filter((item) => item);

      actions.setProp(
        (props: { tag: string; listStyleType: string; items: string[] }) => {
          props.tag = newTag;
          // Set appropriate default style for the new tag
          props.listStyleType = newTag === "ul" ? "disc" : "decimal";
          // Preserve current items
          if (currentItems.length > 0) {
            props.items = currentItems;
          }
        },
      );
    } else {
      actions.setProp((props: { tag: string; listStyleType: string }) => {
        props.tag = newTag;
        // Set appropriate default style for the new tag
        props.listStyleType = newTag === "ul" ? "disc" : "decimal";
      });
    }
  };

  const handleStyleTypeChange = (newStyleType: string) => {
    actions.setProp((props: { listStyleType: string }) => {
      props.listStyleType = newStyleType;
    });
  };

  const currentStyleTypes = tag === "ul" ? UL_STYLE_TYPES : OL_STYLE_TYPES;

  return (
    <div className="space-y-4">
      {/* List Type */}
      <div className="space-y-2">
        <label className="text-xs text-neutral-500 dark:text-neutral-400">
          List Type
        </label>
        <select
          value={tag}
          onChange={(e) => handleTagChange(e.target.value)}
          className="w-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300 text-sm rounded border border-neutral-200 dark:border-neutral-700 focus:outline-none cursor-pointer p-2"
        >
          {LIST_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* List Style Type */}
      <div className="space-y-2">
        <label className="text-xs text-neutral-500 dark:text-neutral-400">
          List Style
        </label>
        <select
          value={listStyleType}
          onChange={(e) => handleStyleTypeChange(e.target.value)}
          className="w-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300 text-sm rounded border border-neutral-200 dark:border-neutral-700 focus:outline-none cursor-pointer p-2"
        >
          {currentStyleTypes.map((style) => (
            <option key={style.value} value={style.value}>
              {style.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
