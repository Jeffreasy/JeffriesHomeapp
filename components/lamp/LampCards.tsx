"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Lightbulb, Search, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { FilterMode, Tone } from "./LampUtils";

export const toneClasses: Record<Tone, { icon: string; surface: string; border: string; text: string }> = {
  amber: {
    icon: "text-amber-300",
    surface: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-200",
  },
  blue: {
    icon: "text-sky-300",
    surface: "bg-sky-500/10",
    border: "border-sky-500/20",
    text: "text-sky-200",
  },
  green: {
    icon: "text-emerald-300",
    surface: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-200",
  },
  rose: {
    icon: "text-rose-300",
    surface: "bg-rose-500/10",
    border: "border-rose-500/20",
    text: "text-rose-200",
  },
  slate: {
    icon: "text-slate-300",
    surface: "bg-white/5",
    border: "border-white/10",
    text: "text-slate-200",
  },
};

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-white/8 bg-white/[0.035] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-5 ${className}`}
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
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <Icon size={16} className="text-amber-300" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <h2 className="truncate text-base font-bold text-white">{title}</h2>
        </div>
      </div>
      {sub && <span className="shrink-0 text-xs text-slate-500">{sub}</span>}
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
    <div className="min-h-[132px] min-w-0 bg-[#0f0f16]/95 p-4 sm:p-5">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${classes.border} ${classes.surface}`}>
        <Icon size={16} className={classes.icon} />
      </div>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-base font-bold ${classes.text}`}>{value}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{sub}</p>
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
    <div className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.025] px-3 py-3">
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

export function WarningPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-300" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-rose-200">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">{text}</p>
      </div>
    </div>
  );
}

export function LoadingGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.05 }}
          className="h-28 rounded-2xl border border-white/8 bg-white/[0.035] animate-pulse"
        />
      ))}
    </div>
  );
}

export function EmptyDevices() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
        <Lightbulb size={28} className="text-slate-600" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-300">Geen lampen gevonden</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        Registreer je eerste WiZ-lamp via instellingen om de bedienpagina te vullen.
      </p>
      <Link
        href="/settings"
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15"
      >
        Instellingen openen
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}

export function NoResults({ search, filter, onReset }: { search: string; filter: FilterMode; onReset: () => void }) {
  const hasFilter = search.trim().length > 0 || filter !== "all";

  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
      <Search size={28} className="text-slate-600" />
      <h3 className="mt-4 text-base font-semibold text-slate-300">Geen lampen in deze selectie</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {hasFilter
          ? "Pas je zoekterm of statusfilter aan om meer lampen te zien."
          : "Er zijn geen lampen die voldoen aan deze weergave."}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.07]"
      >
        Filters resetten
      </button>
    </div>
  );
}
