"use client";

import { AppIcon, type AppIconTone } from "@/components/ui/AppIcon";
import { type AppIconName, type SymbolOption, resolveAppIconName } from "@/lib/symbols";
import { cn } from "@/lib/utils";

export interface SymbolPickerProps {
  value?: string | null;
  options: ReadonlyArray<SymbolOption>;
  onChange: (value: AppIconName) => void;
  tone?: AppIconTone;
  fallback?: AppIconName;
  className?: string;
  gridClassName?: string;
}

export function SymbolPicker({
  value,
  options,
  onChange,
  tone = "accent",
  fallback = "note",
  className,
  gridClassName,
}: SymbolPickerProps) {
  const selected = resolveAppIconName(value, fallback);

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-2",
        className,
      )}
    >
      <div className={cn("grid grid-cols-3 gap-1.5 sm:grid-cols-5", gridClassName)}>
        {options.map((option) => {
          const active = selected === option.icon;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.icon)}
              className={cn(
                "flex min-h-[var(--touch-target)] min-w-0 items-center gap-2 rounded-lg border px-2 py-2 text-left text-xs font-semibold transition-[background-color,border-color,color] duration-[var(--motion-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]",
                active
                  ? "border-[var(--color-border-strong)] bg-[var(--color-surface-hover)] text-[var(--color-text)]"
                  : "border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]",
              )}
              aria-pressed={active}
              aria-label={`Symbool ${option.label}`}
              title={option.label}
            >
              <AppIcon
                name={option.icon}
                tone={tone}
                size="sm"
                framed
                active={active}
                className="h-8 w-8 rounded-lg"
              />
              <span className="min-w-0 truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
