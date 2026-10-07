export const generateNameFromLabel = (label: string): string => {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "") // Remove special characters
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .replace(/^_+|_+$/g, "") || // Remove leading/trailing underscores
    "field"
  );
};
