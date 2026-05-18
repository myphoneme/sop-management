import * as React from "react";

import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-md border border-orange-100 bg-white px-3 py-3 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#f47920] focus:ring-2 focus:ring-[#f47920]/20 dark:border-[#242424] dark:bg-[#090909] dark:text-white dark:placeholder:text-[#6f7f98] dark:focus:border-[#f47920] dark:focus:ring-[#f47920]/25",
        className,
      )}
      {...props}
    />
  );
}
