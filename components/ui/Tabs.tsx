"use client";

import { useState, type ComponentPropsWithRef, type KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
  disabled?: boolean;
}

export function tabId(idPrefix: string, id: string) {
  return idPrefix + "-tab-" + id;
}

export function tabPanelId(idPrefix: string, id: string) {
  return idPrefix + "-panel-" + id;
}

export const tabPanelFocusClasses =
  "rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]";

export function tabPanelAttributes(idPrefix: string, id: string) {
  return {
    id: tabPanelId(idPrefix, id),
    role: "tabpanel" as const,
    "aria-labelledby": tabId(idPrefix, id),
    tabIndex: 0,
  };
}

export interface TabPanelProps extends ComponentPropsWithRef<"div"> {
  idPrefix: string;
  value: string;
}

export function TabPanel({ idPrefix, value, className, ...props }: TabPanelProps) {
  return (
    <div
      {...props}
      {...tabPanelAttributes(idPrefix, value)}
      className={cn(tabPanelFocusClasses, className)}
    />
  );
}

const toneClasses = {
  accent: {
    active:
      "border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]",
    ring: "focus-visible:ring-[var(--color-primary)]",
    badge: "accent" as const,
  },
  info: {
    active:
      "border-[var(--color-info-border)] bg-[var(--color-info-subtle)] text-[var(--color-info)]",
    ring: "focus-visible:ring-[var(--color-info)]",
    badge: "info" as const,
  },
};

export interface TabsProps<T extends string> {
  items: ReadonlyArray<TabItem<T>>;
  value: T;
  onValueChange: (value: T) => void;
  idPrefix: string;
  ariaLabel: string;
  tone?: keyof typeof toneClasses;
  appearance?: "plain" | "contained";
  className?: string;
}

export function Tabs<T extends string>({
  items,
  value,
  onValueChange,
  idPrefix,
  ariaLabel,
  tone = "accent",
  appearance = "plain",
  className,
}: TabsProps<T>) {
  const [showLeftFade, setShowLeftFade] = useState(false);
  const currentTone = toneClasses[tone];

  const enabledItems = items.filter((item) => !item.disabled);
  const effectiveValue = enabledItems.some((item) => item.id === value)
    ? value
    : enabledItems[0]?.id;

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentId: T) => {
    const currentIndex = enabledItems.findIndex((item) => item.id === currentId);
    if (currentIndex < 0 || enabledItems.length === 0) return;

    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % enabledItems.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + enabledItems.length) % enabledItems.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = enabledItems.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = enabledItems[nextIndex];
    onValueChange(nextTab.id);
    document.getElementById(tabId(idPrefix, nextTab.id))?.focus();
  };

  return (
    <div className={cn("relative min-w-0", className)}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        aria-orientation="horizontal"
        onScroll={(event) => setShowLeftFade(event.currentTarget.scrollLeft > 4)}
        className={cn(
          "flex min-w-0 gap-1 overflow-x-auto scrollbar-none",
          appearance === "contained"
            ? "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1"
            : "pr-6",
        )}
      >
        {items.map(({ id, label, count, icon: Icon, disabled }) => {
          const selected = effectiveValue === id;
          return (
            <button
              key={id}
              id={tabId(idPrefix, id)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={tabPanelId(idPrefix, id)}
              tabIndex={selected ? 0 : -1}
              disabled={disabled}
              onClick={() => onValueChange(id)}
              onKeyDown={(event) => handleKeyDown(event, id)}
              className={cn(
                "inline-flex min-h-[var(--touch-target)] shrink-0 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-40",
                currentTone.ring,
                selected
                  ? currentTone.active
                  : "border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]",
              )}
            >
              {Icon ? <Icon size={14} aria-hidden="true" /> : null}
              <span>{label}</span>
              {typeof count === "number" ? (
                <Badge tone={selected ? currentTone.badge : "neutral"} size="sm">
                  {count}
                </Badge>
              ) : null}
            </button>
          );
        })}
      </div>
      {showLeftFade ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[var(--color-background)] to-transparent sm:hidden"
        />
      ) : null}
      {appearance === "plain" ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[var(--color-background)] to-transparent sm:hidden"
        />
      ) : null}
    </div>
  );
}
