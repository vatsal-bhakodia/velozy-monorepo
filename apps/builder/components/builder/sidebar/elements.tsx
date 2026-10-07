"use client";

import { useEditor } from "@craftjs/core";
import { Card } from "@/components/ui/card";
import { Button as UIButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ELEMENTS } from "../elements";
import { useState } from "react";

export function ElementsPanel() {
  const { connectors } = useEditor();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredElements = ELEMENTS.filter((element) =>
    element.label.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-4 space-y-4 h-full flex flex-col">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search elements..."
          className="pl-9 rounded-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredElements.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          No elements found
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 overflow-y-auto pb-2">
          {filteredElements.map(({ icon, label, component }) => (
            <Card
              key={label.toLowerCase().replace(" ", "-")}
              className="p-4 cursor-move bg-background dark:bg-card border hover:bg-accent/50 transition-colors"
              ref={(ref) => {
                if (ref) connectors.create(ref, component);
              }}
            >
              <UIButton
                variant="secondary"
                className="w-full h-full flex flex-col items-center justify-center gap-2"
              >
                {icon}
                <span className="text-xs">{label}</span>
              </UIButton>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
