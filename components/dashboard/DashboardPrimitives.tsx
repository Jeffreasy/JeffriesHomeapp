"use client";

import type { ReactNode } from "react";
import { ChevronRight, ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { type Tone, toneClasses } from "./DashboardUtils";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.035)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-5 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeader({
  icon: Icon,
  label,
  title,
  href,
  actionLabel,
  compact,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  href?: string;
  actionLabel?: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${compact ? "mb-3" : "mb-4"}`}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)]">
          <Icon size={16} className="text-amber-300" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <h2 className="truncate text-base font-bold text-white">{title}</h2>
        </div>
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl px-2 text-xs font-semibold text-amber-300/80 transition-colors hover:bg-amber-500/10 hover:text-amber-200"
        >
          {actionLabel ?? "Open"}
          <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

export function MetricTile({
  href,
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  tone: Tone;
}) {
  const classes = toneClasses[tone];

  return (
    <Link href={href} className="group block min-w-0">
      <motion.div
        whileHover={{ y: -2 }}
        className={`min-h-[132px] rounded-2xl border ${classes.border} ${classes.surface} p-4 transition-colors group-hover:bg-[var(--color-surface-hover)]`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${classes.border} bg-black/10`}>
            <Icon size={18} className={classes.icon} />
          </div>
          <ArrowRight size={15} className="mt-1 text-slate-600 transition-colors group-hover:text-slate-300" />
        </div>
        <div className="mt-4 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-1 truncate text-lg font-bold text-white">{value}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{sub}</p>
        </div>
      </motion.div>
    </Link>
  );
}

export function RouteTile({
  href,
  icon: Icon,
  label,
  sub,
  tone,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  sub: string;
  tone: Tone;
}) {
  const classes = toneClasses[tone];

  return (
    <Link href={href} className="group block min-w-0">
      <div className="flex min-h-[86px] items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] p-3 transition-colors hover:bg-[var(--color-surface-hover)]">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${classes.border} ${classes.surface}`}>
          <Icon size={18} className={classes.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{label}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{sub}</p>
        </div>
        <ChevronRight size={15} className="shrink-0 text-slate-600 transition-colors group-hover:text-slate-300" />
      </div>
    </Link>
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
    <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.025)] px-3 py-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${classes.surface}`}>
        <Icon size={15} className={classes.icon} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] px-4 py-6 text-center">
      <Icon size={22} className="text-slate-600" />
      <p className="mt-3 text-sm font-semibold text-slate-300">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{text}</p>
    </div>
  );
}
