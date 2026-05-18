"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneClasses, type Tone } from "./SettingsUtils";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-lg border border-[var(--color-border)] bg-white/[0.035] p-4 backdrop-blur-xl sm:p-5", className)}
    >
      {children}
    </motion.div>
  );
}

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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-white/[0.04]">
          <Icon size={16} className="text-amber-300" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
          <h2 className="truncate text-base font-bold text-white">{title}</h2>
          {sub && <p className="mt-0.5 truncate text-xs text-slate-500">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
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
    <div className="min-h-[128px] min-w-0 bg-[#0f0f16]/95 p-4">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", classes.border, classes.surface)}>
        <Icon size={16} className={classes.icon} />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className={cn("mt-1 truncate text-base font-bold", classes.text)}>{value}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{sub}</p>
    </div>
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
  const classes = toneClasses[tone];

  return (
    <div className={cn("rounded-lg border bg-white/[0.035] p-4", classes.border)}>
      <div className="flex items-start gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", classes.surface)}>
          <Icon size={18} className={classes.icon} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
          <p className={cn("mt-2 truncate text-2xl font-bold", classes.text)}>{value}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{meta}</p>
        </div>
      </div>
    </div>
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
    <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-white/[0.03] px-3 py-3">
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", classes.surface)}>
        <Icon size={15} className={classes.icon} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-slate-200">{value}</p>
      </div>
    </div>
  );
}

export function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border px-2 text-xs font-bold",
        ok
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
          : "border-rose-500/20 bg-rose-500/10 text-rose-200"
      )}
    >
      {ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
      {label}
    </span>
  );
}

export function RouteTile({ href, label, meta, icon: Icon, tone }: { href: string; label: string; meta: string; icon: LucideIcon; tone: Tone }) {
  const classes = toneClasses[tone];

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-white/[0.03] px-3 py-3 transition-colors hover:bg-white/[0.06]"
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", classes.surface)}>
        <Icon size={16} className={classes.icon} />
      </div>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-200">{label}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">{meta}</span>
      </span>
      <ArrowRight size={14} className="shrink-0 text-slate-600" />
    </Link>
  );
}

export function EmptyState({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-white/[0.02] px-4 py-8 text-center">
      <Icon size={28} className="mx-auto text-slate-700" />
      <p className="mt-3 text-sm font-semibold text-slate-400">{title}</p>
    </div>
  );
}
