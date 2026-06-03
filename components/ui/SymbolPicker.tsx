"use client";

import { AppIcon, type SymbolTone } from "@/components/ui/AppIcon";
import { type AppIconName, type SymbolOption, resolveAppIconName } from "@/lib/symbols";
import { cn } from "@/lib/utils";

interface SymbolPickerProps {
  value?: string | null;
  options: ReadonlyArray<SymbolOption>;
  onChange: (value: AppIconName) => void;
  tone?: SymbolTone;
  fallback?: AppIconName;
  className?: string;
  gridClassName?: string;
}

export function SymbolPicker({
  value,
  options,
  onChange,
  tone = "amber",
  fallback = "note",
  className,
  gridClassName,
}: SymbolPickerProps) {
  const selected = resolveAppIconName(value, fallback);

  return (
    <div className={cn("rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-2", className)}>
      <div className={cn("grid grid-cols-3 gap-1.5 sm:grid-cols-5", gridClassName)}>
        {options.map((option) => {
          const active = selected === option.icon;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.icon)}
              className={cn(
                "flex min-h-[44px] min-w-0 items-center gap-2 rounded-lg border px-2 py-2 text-left text-xs font-semibold transition-colors",
                active
                  ? "border-current bg-white/[0.06] text-[var(--color-text)]"
                  : "border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]",
              )}
              aria-pressed={active}
              aria-label={`Symbool ${option.label}`}
              title={option.label}
            >
              <AppIcon name={option.icon} tone={tone} size="sm" framed active={active} className="h-8 w-8 rounded-lg" />
              <span className="min-w-0 truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
