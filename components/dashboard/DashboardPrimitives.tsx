"use client";

import type { ReactNode } from "react";
import { ChevronRight, AlertTriangle, RefreshCw, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { type Tone, toneClasses } from "./DashboardUtils";
import { AppIcon } from "@/components/ui/AppIcon";
import { buttonVariants } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { SurfaceHeader as CoreSurfaceHeader } from "@/components/ui/SurfaceHeader";
import { cn } from "@/lib/utils";
import type { AppIconName } from "@/lib/symbols";

type IconSource = LucideIcon | AppIconName;

function RenderIcon({
  icon,
  size,
  className,
}: {
  icon: IconSource;
  size: number;
  className?: string;
}) {
  if (typeof icon === "string") {
    return <AppIcon name={icon} size={size <= 15 ? "sm" : "md"} iconClassName={className} />;
  }

  const Icon = icon;
  return <Icon size={size} className={className} />;
}

export function Panel({
  children,
  className,
  padding = "md",
}: {
  children: ReactNode;
  className?: string;
  padding?: "none" | "md";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-w-0"
    >
      <Surface
        padding={padding}
        className={cn(
          "rounded-xl bg-[rgba(255,255,255,0.035)] shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:rounded-2xl",
          className,
        )}
      >
        {children}
      </Surface>
    </motion.div>
  );
}

export function SectionHeader({
  icon,
  label,
  title,
  href,
  actionLabel,
  compact,
}: {
  icon: IconSource;
  label: string;
  title: string;
  href?: string;
  actionLabel?: string;
  compact?: boolean;
}) {
  const action = href ? (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "shrink-0 gap-1 text-amber-300/80 hover:bg-amber-500/10 hover:text-amber-200",
      )}
    >
      {actionLabel ?? "Open"}
      <ChevronRight size={14} aria-hidden="true" />
    </Link>
  ) : undefined;

  return (
    <CoreSurfaceHeader
      icon={<RenderIcon icon={icon} size={16} className="text-amber-300" />}
      eyebrow={label}
      title={title}
      action={action}
      compact={compact}
    />
  );
}

// (MetricTile is verwijderd — H2: de home-metrics dupliceerden de
// OverviewPanel-cellen, die nu zelf klikbare links zijn.)

export function RouteTile({
  href,
  icon,
  label,
  sub,
  tone,
}: {
  href: string;
  icon: IconSource;
  label: string;
  sub: string;
  tone: Tone;
}) {
  const classes = toneClasses[tone];

  return (
    <Link href={href} className="group block min-w-0">
      <div className="flex min-h-[86px] items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] p-3 transition-colors hover:bg-[var(--color-surface-hover)] sm:rounded-2xl">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border sm:h-11 sm:w-11 ${classes.border} ${classes.surface}`}>
          <RenderIcon icon={icon} size={18} className={classes.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{label}</p>
          <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">{sub}</p>
        </div>
        <ChevronRight size={15} className="shrink-0 text-[var(--color-text-subtle)] transition-colors group-hover:text-slate-300" />
      </div>
    </Link>
  );
}

export function StatusRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: IconSource;
  label: string;
  value: string;
  tone: Tone;
}) {
  const classes = toneClasses[tone];

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.025)] px-3 py-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${classes.surface}`}>
        <RenderIcon icon={icon} size={15} className={classes.icon} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, text }: { icon: IconSource; title: string; text: string }) {
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] px-4 py-6 text-center">
      <RenderIcon icon={icon} size={22} className="text-[var(--color-text-subtle)]" />
      <p className="mt-3 text-sm font-semibold text-slate-300">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--color-text-muted)]">{text}</p>
    </div>
  );
}

/**
 * ErrorState — shown when a data load FAILS, so it is visually distinct from an
 * empty result (a failed fetch must never look like "no data"). Offers a retry.
 */
export function ErrorState({
  title = "Kon niet laden",
  text = "Er ging iets mis bij het ophalen van deze gegevens. Probeer het opnieuw.",
  onRetry,
}: {
  title?: string;
  text?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-red-500/30 bg-red-500/5 px-4 py-6 text-center"
    >
      <AlertTriangle size={22} className="text-red-400" aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold text-slate-200">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">{text}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-[var(--color-surface-hover)]"
        >
          <RefreshCw size={13} aria-hidden="true" />
          Opnieuw proberen
        </button>
      )}
    </div>
  );
}
