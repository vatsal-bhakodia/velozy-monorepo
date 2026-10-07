"use client";

import { KeyboardEvent, useState } from "react";
import { useEditor, useNode } from "@craftjs/core";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, WandSparkles } from "lucide-react";
import { refreshTailwind } from "@/components/builder/canvas";

const AiRevise = () => {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { node, actions } = useNode((current) => ({ node: current }));
  const { query } = useEditor();

  const submit = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isLoading) return;

    setIsLoading(true);

    try {
      const parent = node.data.parent
        ? query.node(node.data.parent).get()
        : null;
      let theme: unknown;
      try {
        const storedTheme = window.localStorage.getItem("selectedThemeConfig");
        theme = storedTheme ? JSON.parse(storedTheme) : undefined;
      } catch {
        theme = undefined;
      }

      const response = await fetch("/api/generate/component-revision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          component: {
            type: node.data.displayName || "Component",
            props: node.data.props,
          },
          pageContext: {
            theme,
            parentType: parent?.data.displayName,
            parentProps: parent?.data.props,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not revise this component");
      }

      actions.setProp((props: Record<string, unknown>) => {
        Object.assign(props, data.props);
      });
      refreshTailwind();
      setPrompt("");
    } catch (error) {
      console.error("AI component revision failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="relative">
      <div className="flex-1 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <WandSparkles className="h-4 w-4 text-cyan-400" />
            <Label className="text-xs">AI Edit</Label>
          </div>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs">
            Use AI to modify this element's content
          </p>
        </div>

        {/* Textarea with space for floating buttons */}
        <div className="relative">
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Describe changes you want to make (⌘+Enter to submit)"
            className="min-h-[100px] resize-none rounded-lg p-3 text-sm 
              border focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0
              bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 
              focus:border-neutral-500 dark:focus:border-neutral-600 pr-8"
          />

          {/* Floating buttons */}
          <div className="absolute bottom-2 right-2">
            <Button
              onClick={submit}
              disabled={!prompt.trim() || isLoading}
              variant="secondary"
              size="sm"
              className="h-8 w-8 p-0  dark:bg-neutral-700 hover:text-cyan-400 rounded-full"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiRevise;
