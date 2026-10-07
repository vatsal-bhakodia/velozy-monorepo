import React from "react";
import { useNode } from "@craftjs/core";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const IframeSettings = () => {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({
    props: node.data.props,
  }));

  return (
    <div className="space-y-4">
      {/* URL */}
      <div className="space-y-2">
        <Label>Source URL</Label>
        <Input
          type="url"
          value={props.src || ""}
          onChange={(e) =>
            setProp((props: any) => (props.src = e.target.value))
          }
          placeholder="https://example.com"
        />
      </div>

      {/* Loading */}
      <div className="space-y-2">
        <Label>Loading</Label>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="loading-eager"
              name="loading"
              checked={props.loading === "eager"}
              onChange={() =>
                setProp((props: any) => (props.loading = "eager"))
              }
            />
            <Label htmlFor="loading-eager">Eager</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="loading-lazy"
              name="loading"
              checked={props.loading === "lazy"}
              onChange={() => setProp((props: any) => (props.loading = "lazy"))}
            />
            <Label htmlFor="loading-lazy">Lazy</Label>
          </div>
        </div>
      </div>

      {/* Fullscreen */}
      <div className="flex items-center justify-between">
        <Label>Allow Fullscreen</Label>
        <Switch
          checked={props.allowFullScreen}
          onCheckedChange={(checked: boolean) =>
            setProp((props: any) => (props.allowFullScreen = checked))
          }
        />
      </div>
    </div>
  );
};
