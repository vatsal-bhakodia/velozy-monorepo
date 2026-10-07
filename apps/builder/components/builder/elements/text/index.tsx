import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNode } from "@craftjs/core";
import ToolBar from "@/components/builder/toolbar";
import { useKeyboardFormatting } from "@/hooks/use-keyboard-formatting";
import { TextSettings } from "./settings";

// Restrict tag prop to known HTML elements
type TextTag = keyof Pick<
  React.JSX.IntrinsicElements,
  "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span" | "blockquote" | "pre"
>;

export const Text = ({
  text,
  tag = "p",
  style = {},
  className,
}: {
  text: string;
  tag?: TextTag;
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
  const isComposing = useRef(false); // Track IME composition state
  const [localText, setLocalText] = useState(text);
  const lastSavedText = useRef(text);

  // Save changes to craft.js state
  const saveChanges = useCallback(() => {
    if (ref.current && !isComposing.current) {
      const newValue = ref.current.innerHTML || "";
      if (newValue !== lastSavedText.current) {
        setLocalText(newValue);
        lastSavedText.current = newValue;
        actions.setProp((props: { text: string }) => {
          props.text = newValue;
        });
      }
    }
  }, [actions]);

  // Handle keyboard shortcuts for formatting
  const handleKeyDown = useKeyboardFormatting(saveChanges);

  // Initialize content when component mounts or text prop changes externally
  useEffect(() => {
    if (ref.current && text !== lastSavedText.current) {
      ref.current.innerHTML = text;
      setLocalText(text);
      lastSavedText.current = text;
    }
  }, [text]);

  // Set initial content when ref is available
  useEffect(() => {
    if (ref.current && !ref.current.innerHTML) {
      ref.current.innerHTML = localText;
    }
  }, [localText]);

  const handleBlur = useCallback(() => {
    saveChanges();
  }, [saveChanges]);

  const handleCompositionStart = useCallback(() => {
    isComposing.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposing.current = false;
    saveChanges();
  }, [saveChanges]);

  // Save changes when component loses selection
  useEffect(() => {
    if (!selected && ref.current) {
      saveChanges();
    }
  }, [selected, saveChanges]);

  // Handle input changes in real-time
  const handleInput = useCallback(() => {
    if (ref.current && !isComposing.current) {
      const newValue = ref.current.innerHTML || "";
      setLocalText(newValue);
    }
  }, []);

  const TextComponent = tag;

  return (
    <TextComponent
      style={style}
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
      onKeyDown={handleKeyDown}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
    />
  );
};

Text.craft = {
  displayName: "Text",
  related: {
    toolbar: ToolBar,
  },
  toolbarSections: ["typography", "colors", "spacing"],
  customToolbarSections: [
    {
      key: "textSettings",
      label: "Text Settings",
      icon: "Type",
      component: <TextSettings />,
      priority: 1,
    },
  ],
};
