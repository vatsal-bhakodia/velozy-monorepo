export function adminUrl(path = "/") {
  const base = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:5173";
  return new URL(path, base).toString();
}
