export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i],
      next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows[0].map((value) => value.trim());
  return rows
    .slice(1)
    .map((values) =>
      headers.reduce<Record<string, string>>(
        (result, header, index) => ({
          ...result,
          [header]: (values[index] ?? "").trim(),
        }),
        {},
      ),
    );
}
export function parseJsonValue(value: string) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
export function csv(headers: string[], rows: unknown[][]) {
  return `\ufeff${[headers, ...rows].map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n")}`;
}
