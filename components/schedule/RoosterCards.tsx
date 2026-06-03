import { Calendar, RefreshCw, Upload, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { toneClasses, type Tone } from "./RoosterUtils";
import { cn } from "@/lib/utils";

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-black/40 border border-white/10 p-4 sm:p-5 min-w-0 ${className}`}
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
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
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

export function SectionTitle({
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
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <Icon size={16} className="text-amber-300" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <h2 className="truncate text-base font-bold text-white">{title}</h2>
        {sub && <p className="mt-0.5 truncate text-xs text-slate-500">{sub}</p>}
      </div>
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
    <div className="min-h-[112px] min-w-0 border-b border-r border-t border-l-2 border-white/5 bg-black/40 p-3 transition-all hover:bg-white/5 sm:min-h-[132px] sm:p-5"
         style={{ borderLeftColor: tone === "slate" ? "#94a3b8" : tone === "green" ? "#10b981" : tone === "amber" ? "#f59e0b" : tone === "rose" ? "#f43f5e" : tone === "indigo" ? "#6366f1" : "#3b82f6" }}>
      <div className={`flex h-8 w-8 items-center justify-center border ${classes.border} ${classes.surface}`}>
        <Icon size={14} className={classes.icon} />
      </div>
      <p className="mt-3 text-[8px] font-black uppercase tracking-widest text-slate-500 sm:mt-5 sm:text-[9px]">{label}</p>
      <p className={`mt-0.5 truncate text-base font-black tracking-tight sm:text-xl ${classes.text}`}>{value}</p>
      <p className="mt-1 line-clamp-2 text-[10px] font-bold uppercase leading-4 tracking-widest text-slate-500 sm:text-xs">{sub}</p>
    </div>
  );
}

export function MiniBreakdown({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="border border-white/10 bg-black/40 px-4 py-3 hover:bg-white/5 transition-colors">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 text-xl tracking-tight font-black text-white">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase font-bold tracking-widest text-slate-500">{sub}</p>
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
    <div className="flex items-center gap-4 border border-white/10 bg-black/40 px-4 py-3 hover:bg-white/5 transition-colors">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center border ${classes.border} ${classes.surface}`}>
        <Icon size={14} className={classes.icon} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-sm font-bold text-white tracking-tight">{value}</p>
      </div>
    </div>
  );
}

export function EmptyRoster({
  syncing,
  onSync,
  onUpload,
}: {
  syncing: boolean;
  onSync: () => void;
  onUpload: () => void;
}) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center min-w-0">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <Calendar size={28} className="text-slate-600" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-300">Rooster ophalen</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        Synchroniseer je dienstenrooster en persoonlijke agenda, of importeer een CSV-bestand.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onSync}
          disabled={syncing}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15 disabled:opacity-50"
        >
          <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
          Sync agenda
        </button>
        <button
          type="button"
          onClick={onUpload}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-slate-300 transition-colors hover:bg-[var(--color-surface-hover)]"
        >
          <Upload size={15} />
          CSV uploaden
        </button>
      </div>
    </div>
  );
}

export function EmptyInline({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-center min-w-0">
      <Icon size={22} className="text-slate-600" />
      <p className="mt-3 text-sm font-semibold text-slate-300">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{text}</p>
    </div>
  );
}
