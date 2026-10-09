import { ExternalLink } from "lucide-react";

export function NavbarSettings() {
  return (
    <a
      href={`${process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:5173"}/settings/navigation`}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-300 dark:hover:bg-cyan-950/50"
    >
      <ExternalLink className="h-3.5 w-3.5" /> Configure navbar items
    </a>
  );
}
