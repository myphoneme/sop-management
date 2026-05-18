import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "slate" | "emerald" | "amber" | "blue" | "rose" | "violet";
};

const tones = {
  slate: "border-slate-200 bg-slate-50 text-slate-700 dark:border-[#2a2a2a] dark:bg-[#121212] dark:text-[#9db2d0]",
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200",
  amber:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200",
  blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200",
  rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200",
  violet:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200",
};

export function Badge({ className, tone = "slate", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
