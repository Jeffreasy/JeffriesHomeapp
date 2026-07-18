import { Calendar, RefreshCw, Upload, type LucideIcon } from "lucide-react";
import { toneClasses, type Tone } from "./RoosterUtils";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { Button } from "@/components/ui/Button";

/* Visuele unificatie (audit F14): het desktoprooster gebruikt dezelfde zachte
   huid als de compacte kaarten — rounded-xl, var(--color-border), subtiele
   surfaces en font-semibold i.p.v. brutalistische font-black caps. Layout
   ongewijzigd; alleen de skin. */


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
          <Icon size={16} className="text-[var(--color-primary-hover)]" />
        </div>
        <div className="min-w-0">
          <p className="text-micro font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{label}</p>
          <h2 className="truncate text-base font-bold text-[var(--color-text)]">{title}</h2>
        </div>
      </div>
      {sub && <span className="shrink-0 text-xs text-[var(--color-text-muted)]">{sub}</span>}
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
        <Icon size={16} className="text-[var(--color-primary-hover)]" />
      </div>
      <div className="min-w-0">
        <p className="text-micro font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{label}</p>
        <h2 className="truncate text-base font-bold text-[var(--color-text)]">{title}</h2>
        {sub && <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">{sub}</p>}
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
    <div className="relative min-h-[112px] min-w-0 border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 transition-colors hover:bg-[var(--color-surface-hover)] sm:min-h-[132px] sm:p-5">
      <span aria-hidden className={`absolute inset-y-0 left-0 w-0.5 bg-current ${classes.icon}`} />
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${classes.border} ${classes.surface}`}>
        <Icon size={14} className={classes.icon} />
      </div>
      <p className="mt-3 text-micro font-semibold uppercase tracking-wider text-[var(--color-text-muted)] sm:mt-5 sm:text-xs">{label}</p>
      <p className={`mt-0.5 truncate text-base font-bold tracking-tight sm:text-xl ${classes.text}`}>{value}</p>
      <p className="mt-1 line-clamp-2 text-micro font-medium leading-4 text-[var(--color-text-muted)] sm:text-xs">{sub}</p>
    </div>
  );
}

export function MiniBreakdown({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 hover:bg-[var(--color-surface-hover)] transition-colors">
      <p className="text-micro font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 text-xl tracking-tight font-bold text-[var(--color-text)]">{value}</p>
      <p className="mt-0.5 text-micro font-medium text-[var(--color-text-muted)]">{sub}</p>
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
    <div className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 hover:bg-[var(--color-surface-hover)] transition-colors">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${classes.border} ${classes.surface}`}>
        <Icon size={14} className={classes.icon} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-micro font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-[var(--color-text)] tracking-tight">{value}</p>
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
        <Calendar size={28} className="text-[var(--color-text-subtle)]" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-[var(--color-text)]">Rooster ophalen</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--color-text-muted)]">
        Synchroniseer je dienstenrooster en persoonlijke agenda, of importeer een CSV-bestand.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="primary"
          onClick={onSync}
          loading={syncing}
          loadingLabel="Synchroniseren…"
        >
          <RefreshCw size={15} />
          Sync agenda
        </Button>
        <Button variant="secondary" onClick={onUpload}>
          <Upload size={15} />
          CSV uploaden
        </Button>
      </div>
    </div>
  );
}

export function EmptyInline({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return <FeedbackState icon={Icon} title={title} description={text} compact />;
}
