import { useNode } from "@craftjs/core";
import { NavbarVariant } from "./types";
import { ExternalLink } from "lucide-react";

const variants: Array<{
  value: NavbarVariant;
  label: string;
  description: string;
}> = [
  {
    value: "classic",
    label: "Classic",
    description: "Clean header with a subtle divider",
  },
  {
    value: "centered",
    label: "Centered",
    description: "Brand at the center, links around it",
  },
  {
    value: "floating",
    label: "Floating",
    description: "Soft rounded container with depth",
  },
  {
    value: "glass",
    label: "Glass",
    description: "Translucent surface with blur",
  },
  {
    value: "minimal",
    label: "Minimal",
    description: "Quiet, borderless navigation",
  },
  { value: "split", label: "Split", description: "Links left, action right" },
];

function VariantPreview({ variant }: { variant: NavbarVariant }) {
  const isGlass = variant === "glass";
  const isFloating = variant === "floating";
  const isCentered = variant === "centered";
  const isSplit = variant === "split";
  return (
    <div
      className={`relative mb-2 h-11 overflow-hidden rounded-md border border-neutral-200 bg-white/90 p-2 dark:border-neutral-700 dark:bg-neutral-900 ${isFloating ? "mx-1 shadow-md" : ""} ${isGlass ? "bg-white/50 shadow-sm backdrop-blur" : ""}`}
    >
      <div
        className={`flex h-full items-center gap-1.5 ${isCentered ? "justify-center" : "justify-between"}`}
      >
        {!isCentered && <span className="h-2 w-7 rounded-sm bg-cyan-500/80" />}
        <div
          className={`flex items-center gap-1 ${isCentered ? "w-full justify-center" : "flex-1 justify-center"}`}
        >
          <span className="h-1.5 w-5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
          <span className="h-1.5 w-6 rounded-full bg-neutral-300 dark:bg-neutral-600" />
          <span className="h-1.5 w-5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
        </div>
        {isSplit ? (
          <span className="h-4 w-9 rounded-full bg-cyan-400/80" />
        ) : (
          !isCentered && <span className="h-2 w-5 rounded-sm bg-cyan-500/50" />
        )}
      </div>
      {variant === "classic" && (
        <span className="absolute inset-x-0 bottom-0 h-px bg-neutral-200 dark:bg-neutral-700" />
      )}
      {variant === "minimal" && (
        <span className="absolute left-2 top-2 h-2 w-7 rounded-sm bg-cyan-500/80" />
      )}
    </div>
  );
}

export function NavbarSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({
    props: node.data.props as {
      variant?: NavbarVariant;
      showButton?: boolean;
      buttonText?: string;
      sticky?: boolean;
    },
  }));
  const update = (key: string, value: unknown) =>
    setProp((current: Record<string, unknown>) => {
      current[key] = value;
    });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        {variants.map((variant) => (
          <button
            key={variant.value}
            type="button"
            onClick={() => update("variant", variant.value)}
            className={`rounded-lg border p-2 text-left transition ${props.variant === variant.value ? "border-cyan-500 bg-cyan-50 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200" : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-cyan-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"}`}
          >
            <VariantPreview variant={variant.value} />
            <span className="block text-xs font-semibold">{variant.label}</span>
            <span className="mt-0.5 block text-[10px] leading-4 opacity-60">
              {variant.description}
            </span>
          </button>
        ))}
      </div>
      <label className="flex items-start gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
        <input
          type="checkbox"
          checked={props.sticky === true}
          onChange={(event) => update("sticky", event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded accent-cyan-500"
        />
        <span>
          <span className="block">Keep navbar visible</span>
          <span className="mt-0.5 block text-[11px] font-normal leading-4 text-neutral-500">
            Sticks to the top while visitors scroll.
          </span>
        </span>
      </label>
      <a
        href="/navigation"
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-300 dark:hover:bg-cyan-950/50"
      >
        <ExternalLink className="h-3.5 w-3.5" /> Configure links & logo in
        Navigation
      </a>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
          <input
            type="checkbox"
            checked={props.showButton !== false}
            onChange={(event) => update("showButton", event.target.checked)}
            className="h-4 w-4 rounded accent-cyan-500"
          />
          Show action button
        </label>
        {props.showButton !== false && (
          <input
            value={props.buttonText || "Get started"}
            onChange={(event) => update("buttonText", event.target.value)}
            className="w-full rounded-md border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            placeholder="Button label"
          />
        )}
      </div>
    </div>
  );
}
