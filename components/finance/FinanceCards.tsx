"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tone = "amber" | "green" | "rose" | "sky" | "indigo" | "slate";

export const toneClasses: Record<Tone, { border: string; surface: string; icon: string; text: string; glow: string }> = {
  amber: {
    border: "border-amber-500/25",
    surface: "bg-amber-500/10",
    icon: "text-amber-300",
    text: "text-amber-200",
    glow: "shadow-[0_0_0_1px_rgba(245,158,11,0.05)]",
  },
  green: {
    border: "border-emerald-500/20",
    surface: "bg-emerald-500/10",
    icon: "text-emerald-300",
    text: "text-emerald-200",
    glow: "shadow-[0_0_0_1px_rgba(16,185,129,0.04)]",
  },
  rose: {
    border: "border-rose-500/20",
    surface: "bg-rose-500/10",
    icon: "text-rose-300",
    text: "text-rose-200",
    glow: "shadow-[0_0_0_1px_rgba(244,63,94,0.04)]",
  },
  sky: {
    border: "border-sky-500/20",
    surface: "bg-sky-500/10",
    icon: "text-sky-300",
    text: "text-sky-200",
    glow: "shadow-[0_0_0_1px_rgba(14,165,233,0.04)]",
  },
  indigo: {
    border: "border-indigo-500/20",
    surface: "bg-indigo-500/10",
    icon: "text-indigo-300",
    text: "text-indigo-200",
    glow: "shadow-[0_0_0_1px_rgba(99,102,241,0.04)]",
  },
  slate: {
    border: "border-[var(--color-border)]",
    surface: "bg-white/[0.04]",
    icon: "text-slate-300",
    text: "text-slate-200",
    glow: "shadow-none",
  },
};

export function MetricCard({
  label,
  value,
  meta,
  icon: Icon,
  tone = "slate",
}: {
  label: string;
  value: string;
  meta: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  const toneClass = toneClasses[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "min-h-[116px] rounded-lg border bg-white/[0.035] p-4 transition-colors hover:bg-white/[0.055]",
        toneClass.border,
        toneClass.glow
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", toneClass.surface)}>
          <Icon size={19} className={toneClass.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className={cn("mt-2 truncate text-2xl font-bold leading-tight text-white", toneClass.text)}>
            {value}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{meta}</p>
        </div>
      </div>
    </motion.div>
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
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10">
          <Icon size={17} className="text-amber-300" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
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
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
        active
          ? "border-amber-500/35 bg-amber-500/15 text-amber-200"
          : "border-[var(--color-border)] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
      )}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

export function InsightRow({
  icon: Icon,
  label,
  value,
  tone = "slate",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: Tone;
}) {
  const toneClass = toneClasses[tone];

  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", toneClass.surface)}>
          <Icon size={15} className={toneClass.icon} />
        </div>
        <span className="truncate text-sm text-slate-400">{label}</span>
      </div>
      <span className={cn("shrink-0 text-sm font-semibold", toneClass.text)}>{value}</span>
    </div>
  );
}
