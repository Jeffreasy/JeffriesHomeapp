"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Building2, Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { MobileActionDock } from "@/components/ui/MobileActionDock";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import type { Contact, ContactLabel } from "@/lib/api";
import { labelChipClasses, labelColorStyle, labelDotClasses } from "@/lib/contacten/labelColors";
import { relationshipLabel } from "@/lib/contacten/contact-display";
export function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Button
      size="sm"
      variant={active ? "primary" : "secondary"}
      onClick={onClick}
      aria-pressed={active}
      className="rounded-full"
    >
      {label}
    </Button>
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
    <MobileActionDock
      label="Bulkacties voor geselecteerde contacten"
      className="flex-wrap px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] md:fixed md:inset-x-6 md:bottom-6 md:right-auto md:top-auto md:mt-0"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2">
        <span className="whitespace-nowrap text-sm font-semibold text-[var(--color-text)]">{count} geselecteerd</span>
        <Select
          density="compact"
          value={labelId}
          onChange={(e) => setLabelId(e.target.value)}
          aria-label="Label kiezen"
          className="min-w-40 flex-1 sm:max-w-xs"
        >
          <option value="">Kies label…</option>
          {labels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
        <Button size="sm" variant="primary" disabled={!labelId} onClick={() => labelId && onApply(labelId, false)}>
          Toevoegen
        </Button>
        <Button size="sm" disabled={!labelId} onClick={() => labelId && onApply(labelId, true)}>
          Verwijderen
        </Button>
        <Button size="sm" variant="ghost" onClick={onClear}>
          Wis
        </Button>
      </div>
    </MobileActionDock>
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
    <Button
      onClick={onClick}
      aria-pressed={selectMode ? selected : undefined}
      variant={selected ? "primary" : "secondary"}
      fullWidth
      className="h-auto min-h-16 justify-start gap-3 px-3 py-2.5 text-left"
    >
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] text-sm font-bold uppercase text-[var(--color-primary-hover)]">
        {contact.display_name.trim().charAt(0) || "?"}
        {selectMode && (
          <span
            className={`absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border ${
              selected
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "border-[var(--color-border-strong)] bg-[var(--color-background)] text-transparent"
            }`}
          >
            <Check size={10} strokeWidth={3} />
          </span>
        )}
        {contact.source === "laventecare" && (
          <span
            title="Beheerd in LaventeCare"
            className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-[var(--color-background)] bg-[var(--color-info-subtle)] text-[var(--color-text)]"
          >
            <Building2 size={9} />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[var(--color-text)]">{contact.display_name}</span>
        {sub && <span className="mt-0.5 block truncate text-xs text-[var(--color-text-subtle)]">{sub}</span>}
        {orgLine && (
          <span className="mt-0.5 flex items-center gap-1 text-micro text-[var(--color-info)]">
            <Building2 size={10} className="shrink-0" />
            <span className="truncate">{orgLine}</span>
          </span>
        )}
        {(contact.labels?.length ?? 0) > 0 && (
          <span className="mt-1 flex flex-wrap gap-1">
            {contact.labels!.slice(0, 3).map((l) => (
              <span
                key={l.id}
                style={labelColorStyle(l.color)}
                className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-micro font-semibold ${labelChipClasses()}`}
              >
                <span className={`h-1 w-1 rounded-full ${labelDotClasses()}`} />
                {l.name}
              </span>
            ))}
            {contact.labels!.length > 3 && (
              <span className="text-micro font-semibold text-[var(--color-text-subtle)]">+{contact.labels!.length - 3}</span>
            )}
          </span>
        )}
      </span>
      <span className="flex shrink-0 flex-wrap justify-end gap-1">
        {(contact.relationship_types ?? []).slice(0, 2).map((t) => (
          <Badge key={t} size="sm" className="min-h-0 px-1.5 py-1 text-micro">
            {relationshipLabel(t)}
          </Badge>
        ))}
      </span>
    </Button>
  );
}

export function EmptyBox({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <FeedbackState title={title} description={text} action={action} />;
}

// ─── Modal shell ─────────────────────────────────────────────────────────────

export function ModalShell({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={title}
      maxWidth="lg"
      tone="surface"
      dataAppModal="contact"
      contentClassName="overflow-x-hidden px-4 py-4 sm:px-5"
      footer={footer}
      footerClassName="px-4 sm:px-5"
    >
      {children}
    </Modal>
  );
}
