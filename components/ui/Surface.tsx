import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const surfaceVariants = cva("min-w-0 border", {
  variants: {
    tone: {
      default: "border-[var(--color-border)] bg-[var(--color-surface)]",
      elevated:
        "border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-2xl shadow-black/20",
      subtle: "border-[var(--color-border)] bg-[var(--color-surface-hover)]",
      danger: "border-rose-500/25 bg-rose-500/10",
    },
    radius: {
      md: "rounded-xl",
      lg: "rounded-2xl",
    },
    padding: {
      none: "",
      sm: "p-3",
      md: "p-4 sm:p-5",
      lg: "p-5 sm:p-6",
    },
  },
  defaultVariants: {
    tone: "default",
    radius: "lg",
    padding: "md",
  },
});

export interface SurfaceProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof surfaceVariants> {}

export function Surface({ className, tone, radius, padding, ...props }: SurfaceProps) {
  return (
    <div className={cn(surfaceVariants({ tone, radius, padding }), className)} {...props} />
  );
}
