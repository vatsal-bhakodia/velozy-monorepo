import { useNode } from "@craftjs/core";

// Available HTML tags for text elements
const TEXT_TAGS = [
  { value: "p", label: "Paragraph" },
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
  { value: "h4", label: "Heading 4" },
  { value: "h5", label: "Heading 5" },
  { value: "h6", label: "Heading 6" },
  { value: "span", label: "Span" },
  { value: "blockquote", label: "Blockquote" },
  { value: "pre", label: "Preformatted" },
];

export const TextSettings = () => {
  const { actions, tag } = useNode((node) => ({
    tag: node.data.props.tag || "p",
  }));

  const handleTagChange = (newTag: string) => {
    actions.setProp((props: { tag: string }) => {
      props.tag = newTag;
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs text-neutral-500 dark:text-neutral-400">
          Text Type
        </label>
        <select
          value={tag}
          onChange={(e) => handleTagChange(e.target.value)}
          className="w-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300 text-sm rounded border border-neutral-200 dark:border-neutral-700 focus:outline-none cursor-pointer p-2"
        >
          {TEXT_TAGS.map((tag) => (
            <option key={tag.value} value={tag.value}>
              {tag.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
