"use client";

import { type ReactNode } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleMinus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneClasses, type Tone } from "./SettingsUtils";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { MetricCard as UiMetricCard } from "@/components/ui/MetricCard";
import { Surface } from "@/components/ui/Surface";
import { SurfaceHeader } from "@/components/ui/SurfaceHeader";
import type { UiTone } from "@/lib/ui/tones";

export function SectionHeader({
  icon: Icon,
  label,
  title,
  sub,
  action,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <SurfaceHeader
      icon={<Icon size={16} className="text-[var(--color-warning)]" />}
      eyebrow={label}
      title={title}
      meta={sub}
      action={action}
    />
  );
}

export function StatusMetric({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  tone: Tone;
}) {
  const classes = toneClasses[tone];

  return (
    <Surface tone={tone === "neutral" ? "subtle" : tone} radius="sm" padding="sm" className="min-h-24 sm:min-h-32">
      <Icon size={15} className={classes.icon} aria-hidden="true" />
      <p className="mt-2 line-clamp-1 text-xs font-semibold uppercase text-[var(--color-text-muted)] sm:mt-4">{label}</p>
      <p className={cn("mt-1 truncate text-base font-bold", classes.text)}>{value}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-4 text-[var(--color-text-muted)]">{sub}</p>
    </Surface>
  );
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  meta,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  meta: string;
  tone: Tone;
}) {
  return (
    <UiMetricCard
      icon={Icon}
      label={label}
      value={value}
      description={meta}
      tone={tone}
      iconPosition="leading"
    />
  );
}

export function StatusRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: Tone;
}) {
  const classes = toneClasses[tone];

  return (
    <Surface tone="subtle" radius="sm" padding="sm" className="flex items-start gap-3">
      <Icon size={15} className={cn("mt-0.5 shrink-0", classes.icon)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[var(--color-text-muted)]">{label}</p>
        <p className="mt-0.5 line-clamp-2 break-words text-sm font-semibold leading-5 text-[var(--color-text)]">{value}</p>
      </div>
    </Surface>
  );
}

export type StatusPillTone = Extract<UiTone, "success" | "warning" | "neutral" | "danger">;

export function StatusPill({ ok, label, tone }: { ok: boolean; label: string; tone?: StatusPillTone }) {
  const resolvedTone: StatusPillTone = tone ?? (ok ? "success" : "danger");
  const Icon = resolvedTone === "success" ? CheckCircle2 : resolvedTone === "neutral" ? CircleMinus : AlertTriangle;

  return (
    <Badge tone={resolvedTone} size="md">
      <Icon size={13} aria-hidden="true" />
      <span className="truncate">{label}</span>
    </Badge>
  );
}

export function RouteTile({ href, label, meta, icon: Icon, tone }: { href: string; label: string; meta: string; icon: LucideIcon; tone: Tone }) {
  const classes = toneClasses[tone];

  return (
    <ButtonLink href={href} variant="secondary" fullWidth className="h-auto justify-start px-3 py-3 text-left">
      <Icon size={16} className={cn("shrink-0", classes.icon)} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[var(--color-text)]">{label}</span>
        <span className="mt-0.5 block truncate text-xs font-normal text-[var(--color-text-muted)]">{meta}</span>
      </span>
      <ArrowRight size={14} className="shrink-0 text-[var(--color-text-subtle)]" aria-hidden="true" />
    </ButtonLink>
  );
}

export function EmptyState({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return <FeedbackState icon={Icon} title={title} description="Er zijn nog geen items om te tonen." compact />;
}
