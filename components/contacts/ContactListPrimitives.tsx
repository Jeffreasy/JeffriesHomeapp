"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Building2, Check } from "lucide-react";
import { AppIcon } from "@/components/ui/AppIcon";
import { Modal } from "@/components/ui/Modal";
import type { Contact, ContactLabel } from "@/lib/api";
import { labelChipClasses, labelDotClasses } from "@/lib/contacten/labelColors";
import { relationshipLabel } from "@/lib/contacten/contact-display";
export function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        active
          ? "border-amber-500/30 bg-amber-500/15 text-amber-200"
          : "border-[var(--color-border)] text-slate-400 hover:bg-[var(--color-surface-hover)] hover:text-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

// Auto-loads the next window when scrolled near the bottom (dependency-free
// virtualization-lite; the parent only mounts the first N cards).
export function LoadMoreSentinel({ onVisible }: { onVisible: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onVisible();
      },
      { rootMargin: "300px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [onVisible]);
  return <div ref={ref} className="h-8" aria-hidden />;
}

export function BulkBar({
  count,
  labels,
  onApply,
  onClear,
}: {
  count: number;
  labels: ContactLabel[];
  onApply: (labelId: string, remove: boolean) => void;
  onClear: () => void;
}) {
  const [labelId, setLabelId] = useState("");
  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] border-t border-[var(--color-border)] bg-[#0a0a0f]/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-white">{count} geselecteerd</span>
        <select
          value={labelId}
          onChange={(e) => setLabelId(e.target.value)}
          aria-label="Label kiezen"
          className="min-h-[38px] min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm text-slate-200 outline-none [color-scheme:dark] sm:max-w-xs"
        >
          <option value="">Kies label…</option>
          {labels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!labelId}
          onClick={() => labelId && onApply(labelId, false)}
          className="min-h-[38px] rounded-lg border border-amber-500/25 bg-amber-500/12 px-3 text-xs font-semibold text-amber-300 hover:bg-amber-500/18 disabled:opacity-40"
        >
          Toevoegen
        </button>
        <button
          type="button"
          disabled={!labelId}
          onClick={() => labelId && onApply(labelId, true)}
          className="min-h-[38px] rounded-lg border border-[var(--color-border)] px-3 text-xs font-semibold text-slate-300 hover:bg-[var(--color-surface-hover)] disabled:opacity-40"
        >
          Verwijderen
        </button>
        <button
          type="button"
          onClick={onClear}
          className="min-h-[38px] rounded-lg px-3 text-xs font-semibold text-slate-500 hover:text-slate-300"
        >
          Wis
        </button>
      </div>
    </div>
  );
}

export function ContactCard({
  contact,
  onClick,
  selectMode = false,
  selected = false,
}: {
  contact: Contact;
  onClick: () => void;
  selectMode?: boolean;
  selected?: boolean;
}) {
  const sub = contact.email || contact.phone || (contact.notes ? contact.notes.split("\n")[0] : "");
  const orgNames = (contact.organizations ?? [])
    .map((o) => o.organization_name)
    .filter((n): n is string => !!n);
  const orgLine =
    orgNames.length > 0
      ? orgNames.slice(0, 2).join(", ") + (orgNames.length > 2 ? ` +${orgNames.length - 2}` : "")
      : "";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selectMode ? selected : undefined}
      className={`flex min-h-[64px] items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
        selected
          ? "border-amber-500/50 bg-amber-500/[0.07]"
          : "border-[var(--color-border)] bg-white/[0.02] hover:bg-white/[0.04]"
      }`}
    >
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-sm font-bold uppercase text-amber-200">
        {contact.display_name.trim().charAt(0) || "?"}
        {selectMode && (
          <span
            className={`absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border ${
              selected ? "border-amber-400 bg-amber-500 text-black" : "border-slate-500 bg-[#0a0a0f] text-transparent"
            }`}
          >
            <Check size={10} strokeWidth={3} />
          </span>
        )}
        {contact.source === "laventecare" && (
          <span
            title="Beheerd in LaventeCare"
            className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-[#0a0a0f] bg-sky-500/90 text-white"
          >
            <Building2 size={9} />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white">{contact.display_name}</span>
        {sub && <span className="mt-0.5 block truncate text-xs text-slate-500">{sub}</span>}
        {orgLine && (
          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-sky-300/70">
            <Building2 size={10} className="shrink-0" />
            <span className="truncate">{orgLine}</span>
          </span>
        )}
        {(contact.labels?.length ?? 0) > 0 && (
          <span className="mt-1 flex flex-wrap gap-1">
            {contact.labels!.slice(0, 3).map((l) => (
              <span
                key={l.id}
                className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${labelChipClasses(l.color)}`}
              >
                <span className={`h-1 w-1 rounded-full ${labelDotClasses(l.color)}`} />
                {l.name}
              </span>
            ))}
            {contact.labels!.length > 3 && (
              <span className="text-[10px] font-semibold text-slate-500">+{contact.labels!.length - 3}</span>
            )}
          </span>
        )}
      </span>
      <span className="flex shrink-0 flex-wrap justify-end gap-1">
        {(contact.relationship_types ?? []).slice(0, 2).map((t) => (
          <span key={t} className="rounded-md border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
            {relationshipLabel(t)}
          </span>
        ))}
      </span>
    </button>
  );
}

export function EmptyBox({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-12 text-center">
      <AppIcon name="relations" tone="slate" size="lg" />
      <div>
        <p className="text-sm font-semibold text-slate-300">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{text}</p>
      </div>
      {action}
    </div>
  );
}

// ─── Modal shell ─────────────────────────────────────────────────────────────

export function ModalShell({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={title}
      maxWidth="lg"
      theme="surface"
      dataAppModal="contact"
      contentClassName="overflow-x-hidden px-4 py-4 sm:px-5"
      footer={footer}
      footerClassName="px-4 sm:px-5"
    >
      {children}
    </Modal>
  );
}
