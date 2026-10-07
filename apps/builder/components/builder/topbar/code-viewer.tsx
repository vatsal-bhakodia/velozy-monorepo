import { useState, useEffect, useCallback } from "react";
import { CopyBlock, dracula } from "react-code-blocks";
import { useEditor } from "@craftjs/core";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getHtmlOutput, getReactOutput } from "@/lib/code-generator";

interface CodeViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CodeView = ({ open, onOpenChange }: CodeViewProps) => {
  const { query } = useEditor();
  const [activeTab, setActiveTab] = useState<"html" | "react">("html");
  const [output, setOutput] = useState<string>("");

  // Generate code based on active tab
  const generateCode = useCallback(() => {
    try {
      if (activeTab === "html") {
        const code = getHtmlOutput("canvas");
        setOutput(code || "<!-- No HTML content available -->");
      } else {
        const { importString, output } = getReactOutput(query.getNodes());
        setOutput(
          `${importString}\n\n${output || "// No React code generated"}`,
        );
      }
    } catch (error) {
      console.error("Error generating code:", error);
      setOutput(`/* Error generating ${activeTab} code */`);
    }
  }, [activeTab, query]);

  // Handle tab changes
  const handleTabChange = (value: string) => {
    if (value === "html" || value === "react") {
      setActiveTab(value);
    }
  };

  // Regenerate code when tab changes or drawer opens
  useEffect(() => {
    if (open) {
      generateCode();
    }
  }, [activeTab, open, generateCode]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80vh]">
        <div className="p-4">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="html">HTML</TabsTrigger>
              <TabsTrigger value="react">React</TabsTrigger>
            </TabsList>
            <div className="mt-4 rounded-lg border overflow-hidden">
              <TabsContent value="html" className="m-0">
                <CodeBlock codeString={output} />
              </TabsContent>
              <TabsContent value="react" className="m-0">
                <CodeBlock codeString={output} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

// Separate component for the actual code display
const CodeBlock = ({ codeString }: { codeString?: string }) => {
  const code = codeString ? codeString : "";

  return (
    <div className="rounded-md h-full border border-input">
      <CopyBlock
        customStyle={{ height: "65vh", overflow: "scroll" }}
        text={code}
        language={"typescript"}
        theme={dracula}
      />
    </div>
  );
};
