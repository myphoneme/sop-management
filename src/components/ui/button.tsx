import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f47920]/35 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-[#f47920] text-white shadow-sm hover:bg-[#cf5f0d] dark:bg-[#f47920] dark:text-white dark:hover:bg-[#ff8a32]",
        secondary:
          "border border-orange-200 bg-white text-slate-950 hover:bg-orange-50 dark:border-[#2a2a2a] dark:bg-[#101010] dark:text-white dark:hover:border-[#f47920]/45 dark:hover:bg-[#17110c]",
        ghost:
          "text-slate-700 hover:bg-orange-50 hover:text-[#cf5f0d] dark:text-[#86a0c4] dark:hover:bg-[#17110c] dark:hover:text-white",
        danger:
          "bg-rose-600 text-white shadow-sm hover:bg-rose-700",
        accent:
          "bg-[#f47920] text-white shadow-sm hover:bg-[#cf5f0d]",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-10 px-4",
        lg: "h-12 px-5",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
