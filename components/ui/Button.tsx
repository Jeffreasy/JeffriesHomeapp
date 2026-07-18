import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex min-h-[var(--control-height)] items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-[background-color,border-color,color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-standard)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border-[var(--color-primary-border)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]",
        secondary:
          "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-hover)]",
        ghost:
          "border-transparent bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]",
        info:
          "border-[var(--color-info-border)] bg-[var(--color-info-subtle)] text-[var(--color-info)] hover:bg-[var(--color-info-border)]",
        success:
          "border-[var(--color-success-border)] bg-[var(--color-success-subtle)] text-[var(--color-success)] hover:bg-[var(--color-success-border)]",
        successSolid:
          "border-[var(--color-success-border)] bg-[var(--color-success)] text-[var(--color-solid-foreground-dark)] hover:bg-[var(--color-success-solid-hover)]",
        infoSolid:
          "border-[var(--color-info-border)] bg-[var(--color-info)] text-[var(--color-solid-foreground-dark)] hover:bg-[var(--color-info-solid-hover)]",
        warning:
          "border-[var(--color-warning-border)] bg-[var(--color-warning-subtle)] text-[var(--color-warning)] hover:bg-[var(--color-warning-border)]",
        danger:
          "border-[var(--color-danger-border)] bg-[var(--color-danger-subtle)] text-[var(--color-danger)] hover:bg-[var(--color-danger-border)]",
      },
      size: {
        sm: "rounded-lg px-3 text-xs",
        md: "px-4",
        icon: "h-[var(--touch-target)] w-[var(--touch-target)] px-0",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
      fullWidth: false,
    },
  },
);

export interface ButtonProps
  extends ComponentPropsWithRef<"button">,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  loadingLabel?: string;
}

export function Button({
  className,
  variant,
  size,
  fullWidth,
  loading = false,
  loadingLabel = "Bezig…",
  disabled,
  children,
  type = "button",
  "aria-busy": ariaBusy,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled || loading}
      {...props}
      aria-busy={loading || ariaBusy || undefined}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
        />
      ) : null}
      {loading ? loadingLabel : children}
    </button>
  );
}
