import { Check } from "lucide-react";
import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<ComponentPropsWithRef<"input">, "type"> {
  label?: ReactNode;
  description?: ReactNode;
}

export function Checkbox({
  label,
  description,
  className,
  disabled,
  id,
  "aria-describedby": externalDescription,
  "aria-labelledby": externalLabelledBy,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const labelId = label ? inputId + "-label" : undefined;
  const descriptionId = description ? inputId + "-description" : undefined;
  const describedBy = [externalDescription, descriptionId]
    .filter(Boolean)
    .join(" ") || undefined;
  const labelledBy = [externalLabelledBy, labelId]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <label
      className={cn(
        "flex min-h-[var(--touch-target)] items-start gap-3 rounded-xl px-2 py-2 text-sm text-[var(--color-text)]",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-[var(--color-surface-hover)]",
        className,
      )}
    >
      <input
        {...props}
        id={inputId}
        type="checkbox"
        disabled={disabled}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-transparent transition-colors peer-checked:border-[var(--color-primary-border)] peer-checked:bg-[var(--color-primary)] peer-checked:text-[var(--color-primary-foreground)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-primary)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--color-background)]"
      >
        <Check size={14} strokeWidth={3} />
      </span>
      {label || description ? (
        <span className="min-w-0">
          {label ? <span id={labelId} className="block font-medium">{label}</span> : null}
          {description ? (
            <span id={descriptionId} className="mt-0.5 block text-xs leading-5 text-[var(--color-text-muted)]">
              {description}
            </span>
          ) : null}
        </span>
      ) : null}
    </label>
  );
}
