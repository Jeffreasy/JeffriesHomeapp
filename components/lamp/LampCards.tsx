"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Lightbulb,
  Search,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { FilterMode } from "./LampUtils";
import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "glass min-w-0 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] sm:p-5",
        className,
      )}
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
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <Icon size={16} className="text-amber-300" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            {label}
          </p>
          <h2 className="truncate text-base font-bold text-white">{title}</h2>
        </div>
      </div>
      {sub && <span className="shrink-0 text-xs text-[var(--color-text-muted)]">{sub}</span>}
    </div>
  );
}

export function WarningPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-300" aria-hidden="true" />
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
          className="h-28 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function EmptyDevices() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-hover)]">
        <Lightbulb size={28} className="text-[var(--color-text-subtle)]" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-300">Geen lampen gevonden</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--color-text-muted)]">
        Registreer je eerste WiZ-lamp via instellingen om de bedienpagina te vullen.
      </p>
      <Link
        href="/settings"
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15"
      >
        Instellingen openen
        <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </div>
  );
}

export function NoResults({
  search,
  filter,
  onReset,
}: {
  search: string;
  filter: FilterMode;
  onReset: () => void;
}) {
  const hasFilter = search.trim().length > 0 || filter !== "all";

  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-10 text-center">
      <Search size={28} className="text-[var(--color-text-subtle)]" aria-hidden="true" />
      <h2 className="mt-4 text-base font-semibold text-slate-300">
        Geen lampen in deze selectie
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--color-text-muted)]">
        {hasFilter
          ? "Pas je zoekterm of statusfilter aan om meer lampen te zien."
          : "Er zijn geen lampen die voldoen aan deze weergave."}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-slate-300 transition-colors hover:bg-[var(--color-surface-hover)]"
      >
        Filters resetten
      </button>
    </div>
  );
}
