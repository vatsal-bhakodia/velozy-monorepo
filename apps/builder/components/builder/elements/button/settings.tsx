import { useNode } from "@craftjs/core";
import { ButtonVariant, ButtonSize } from "./types";

export const ButtonSettings = () => {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({
    props: node.data.props,
  }));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Button Text
        </label>
        <input
          type="text"
          value={props.text || ""}
          onChange={(e) =>
            setProp((props: { text?: string }) => (props.text = e.target.value))
          }
          className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-white"
          placeholder="Button text"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Variant
        </label>
        <select
          value={props.variant || "primary"}
          onChange={(e) =>
            setProp(
              (props: { variant?: ButtonVariant }) =>
                (props.variant = e.target.value as ButtonVariant),
            )
          }
          className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-white"
        >
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
          <option value="outline">Outline</option>
          <option value="ghost">Ghost</option>
          <option value="destructive">Destructive</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Size
        </label>
        <select
          value={props.size || "md"}
          onChange={(e) =>
            setProp(
              (props: { size?: ButtonSize }) =>
                (props.size = e.target.value as ButtonSize),
            )
          }
          className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-white"
        >
          <option value="sm">Small</option>
          <option value="md">Medium</option>
          <option value="lg">Large</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Link URL (optional)
        </label>
        <input
          type="url"
          value={props.href || ""}
          onChange={(e) =>
            setProp((props: { href?: string }) => (props.href = e.target.value))
          }
          className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-white"
          placeholder="https://example.com"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={props.disabled || false}
            onChange={(e) =>
              setProp(
                (props: { disabled?: boolean }) =>
                  (props.disabled = e.target.checked),
              )
            }
            className="rounded border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-blue-600"
          />
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Disabled
          </span>
        </label>
      </div>

      <div className="space-y-2">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={props.loading || false}
            onChange={(e) =>
              setProp(
                (props: { loading?: boolean }) =>
                  (props.loading = e.target.checked),
              )
            }
            className="rounded border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-blue-600"
          />
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Loading
          </span>
        </label>
      </div>
    </div>
  );
};
