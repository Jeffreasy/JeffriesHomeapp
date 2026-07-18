import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

export const surfaceVariants = cva("min-w-0 border", {
  variants: {
    tone: {
      default:
        "border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-surface)]",
      elevated:
        "border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-overlay)]",
      subtle: "border-[var(--color-border)] bg-[var(--color-surface-muted)]",
      accent:
        "border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)]",
      info: "border-[var(--color-info-border)] bg-[var(--color-info-subtle)]",
      success:
        "border-[var(--color-success-border)] bg-[var(--color-success-subtle)]",
      warning:
        "border-[var(--color-warning-border)] bg-[var(--color-warning-subtle)]",
      danger:
        "border-[var(--color-danger-border)] bg-[var(--color-danger-subtle)]",
    },
    radius: {
      sm: "rounded-lg",
      md: "rounded-xl",
      lg: "rounded-2xl",
    },
    padding: {
      none: "",
      xs: "p-2.5 sm:p-3",
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
  extends ComponentPropsWithRef<"div">,
    VariantProps<typeof surfaceVariants> {}

export function Surface({ className, tone, radius, padding, ...props }: SurfaceProps) {
  return (
    <div className={cn(surfaceVariants({ tone, radius, padding }), className)} {...props} />
  );
}
