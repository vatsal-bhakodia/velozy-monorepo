import { ChevronLeft } from "lucide-react";
import Link from "@/components/router-link";

export function SettingsBackLink() {
  return (
    <Link
      href="/settings"
      className="inline-flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
    >
      <ChevronLeft className="h-4 w-4" />
      Settings
    </Link>
  );
}
