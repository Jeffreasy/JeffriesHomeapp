import { cva } from "class-variance-authority";

export const controlVariants = cva(
  "min-h-[var(--control-height)] w-full rounded-xl border bg-[var(--color-surface)] px-3 text-base text-[var(--color-text)] shadow-[var(--shadow-surface)] outline-none transition-[background-color,border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-standard)] placeholder:text-[var(--color-text-subtle)] hover:border-[var(--color-border-hover)] focus:border-[var(--color-primary-border)] focus:ring-2 focus:ring-[var(--color-primary-subtle)] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm",
  {
    variants: {
      invalid: {
        true: "border-[var(--color-danger-border)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger-subtle)]",
        false: "border-[var(--color-border)]",
      },
      density: {
        default: "",
        compact: "text-base sm:text-xs",
      },
    },
    defaultVariants: {
      invalid: false,
      density: "default",
    },
  },
);
