import { useNode } from "@craftjs/core";

export const ImageSettings = () => {
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
          Image URL
        </label>
        <input
          type="text"
          value={props.src || ""}
          onChange={(e) =>
            setProp((props: { src?: string }) => (props.src = e.target.value))
          }
          className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-white"
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Alt Text
        </label>
        <input
          type="text"
          value={props.alt || ""}
          onChange={(e) =>
            setProp((props: { alt?: string }) => (props.alt = e.target.value))
          }
          className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-white"
          placeholder="Image description"
        />
      </div>
    </div>
  );
};
