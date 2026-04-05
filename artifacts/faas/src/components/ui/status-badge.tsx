import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: "PASS" | "WARNING" | "FAIL" | string | null | undefined;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (!status) return null;
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider",
        status === "PASS" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
        status === "WARNING" && "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20",
        status === "FAIL" && "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20",
        className
      )}
    >
      {status}
    </span>
  );
}
