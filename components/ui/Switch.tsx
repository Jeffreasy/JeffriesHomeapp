"use client";

import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps
  extends Omit<
    ComponentPropsWithRef<"button">,
    "aria-checked" | "onChange" | "role" | "type"
  > {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  className,
  onClick,
  "aria-describedby": externalDescription,
  "aria-labelledby": externalLabelledBy,
  disabled,
  ...props
}: SwitchProps) {
  const id = useId();
  const labelId = id + "-label";
  const descriptionId = description ? id + "-description" : undefined;
  const describedBy = [externalDescription, descriptionId]
    .filter(Boolean)
    .join(" ") || undefined;
  const labelledBy = [externalLabelledBy, labelId]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <button
      {...props}
      type="button"
      role="switch"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-checked={checked}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onCheckedChange(!checked);
      }}
      className={cn(
        "flex min-h-[var(--touch-target)] w-full items-center justify-between gap-4 rounded-xl px-2 py-2 text-left transition-colors hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <span className="min-w-0">
        <span id={labelId} className="block text-sm font-medium text-[var(--color-text)]">{label}</span>
        {description ? (
          <span id={descriptionId} className="mt-0.5 block text-xs leading-5 text-[var(--color-text-muted)]">
            {description}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
          checked
            ? "border-[var(--color-primary-border)] bg-[var(--color-primary)]"
            : "border-[var(--color-border-strong)] bg-[var(--color-surface-active)]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4.5 w-4.5 rounded-full bg-[var(--color-text)] shadow-sm transition-transform duration-[var(--motion-fast)] motion-reduce:transition-none",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
