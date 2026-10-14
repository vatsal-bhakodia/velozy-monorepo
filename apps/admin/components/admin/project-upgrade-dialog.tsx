import { ArrowUpRight, Crown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const marketingUrl = (import.meta.env.VITE_MARKETING_URL ?? "http://localhost:3000").replace(/\/$/, "");

export function ProjectUpgradeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
            <Crown className="h-5 w-5" aria-hidden="true" />
          </div>
          <DialogTitle>Upgrade to add another project</DialogTitle>
          <DialogDescription>
            The Free plan includes one project. Choose a paid plan to unlock additional projects.
          </DialogDescription>
        </DialogHeader>
        <a
          href={`${marketingUrl}/pricing?reason=additional-project`}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Compare plans
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </DialogContent>
    </Dialog>
  );
}
