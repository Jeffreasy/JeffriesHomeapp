"use client";

import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MetricCard as UiMetricCard } from "@/components/ui/MetricCard";
import { Surface } from "@/components/ui/Surface";
import { uiToneClasses, type UiTone } from "@/lib/ui/tones";
import { cn } from "@/lib/utils";

export type Tone = UiTone;

export const toneClasses = uiToneClasses;

export function MetricCard({
  label,
  value,
  meta,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  meta: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  return (
    <UiMetricCard
      icon={Icon}
      label={label}
      value={value}
      description={meta}
      tone={tone}
      iconPosition="leading"
      className="min-h-28"
    />
  );
}

export function SectionTitle({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Surface tone="accent" radius="sm" padding="none" className="flex h-10 w-10 shrink-0 items-center justify-center">
          <Icon size={17} className="text-[var(--color-primary)]" aria-hidden="true" />
        </Surface>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[var(--color-text)]">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function SegmentedButton({
  active,
  icon: Icon,
  children,
  onClick,
}: {
  active: boolean;
  icon?: LucideIcon;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      variant={active ? "primary" : "secondary"}
      size="sm"
      onClick={onClick}
      className="shrink-0"
      aria-pressed={active}
    >
      {Icon && <Icon size={15} aria-hidden="true" />}
      {children}
    </Button>
  );
}

export function InsightRow({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: Tone;
}) {
  const toneClass = toneClasses[tone];

  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", toneClass.surface)}>
          <Icon size={15} className={toneClass.icon} aria-hidden="true" />
        </div>
        <span className="truncate text-sm text-[var(--color-text-muted)]">{label}</span>
      </div>
      <span className={cn("shrink-0 text-sm font-semibold", toneClass.text)}>{value}</span>
    </div>
  );
}
