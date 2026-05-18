import * as React from "react";

import { cn } from "@/lib/utils";

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-md border border-orange-100 bg-white px-3 text-sm font-medium text-slate-950 shadow-sm outline-none transition focus:border-[#f47920] focus:ring-2 focus:ring-[#f47920]/20 dark:border-[#242424] dark:bg-[#090909] dark:text-white dark:focus:border-[#f47920] dark:focus:ring-[#f47920]/25",
        className,
      )}
      {...props}
    />
  );
}
