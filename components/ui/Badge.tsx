import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border font-semibold leading-none",
  {
    variants: {
      tone: {
        neutral:
          "border-[var(--color-border)] bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]",
        accent:
          "border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]",
        info: "border-[var(--color-info-border)] bg-[var(--color-info-subtle)] text-[var(--color-info)]",
        success:
          "border-[var(--color-success-border)] bg-[var(--color-success-subtle)] text-[var(--color-success)]",
        warning:
          "border-[var(--color-warning-border)] bg-[var(--color-warning-subtle)] text-[var(--color-warning)]",
        danger:
          "border-[var(--color-danger-border)] bg-[var(--color-danger-subtle)] text-[var(--color-danger)]",
      },
      size: {
        sm: "min-h-6 px-2 text-micro",
        md: "min-h-7 px-2.5 text-xs",
      },
    },
    defaultVariants: {
      tone: "neutral",
      size: "md",
    },
  },
);

export interface BadgeProps
  extends ComponentPropsWithRef<"span">,
    VariantProps<typeof badgeVariants> {}

export function Badge({ tone, size, className, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}
