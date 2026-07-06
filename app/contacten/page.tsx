"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import {
  Building2,
  CalendarHeart,
  Check,
  Clock,
  GitMerge,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { AppIcon } from "@/components/ui/AppIcon";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useContacten, useContact, useLabels } from "@/hooks/useContacten";
import { contactenApi, type Contact, type ContactLabel } from "@/lib/api";
import { LABEL_COLOR_KEYS, labelChipClasses, labelDotClasses } from "@/lib/contacten/labelColors";

const RELATIONSHIP_TYPES = [
  { value: "family", label: "Familie" },
  { value: "friend", label: "Vriend" },
  { value: "colleague", label: "Collega" },
  { value: "business", label: "Zakelijk" },
] as const;

const RELATIONSHIP_LABEL: Record<string, string> = Object.fromEntries(
  RELATIONSHIP_TYPES.map((t) => [t.value, t.label]),
);

const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function formatDayMonth(month: number, day: number) {
  return `${day} ${MONTHS[Math.min(Math.max(month, 1), 12) - 1]}`;
}

function relationshipLabel(value: string) {
  return RELATIONSHIP_LABEL[value] ?? value;
}

type SortKey = "name" | "recent" | "added";

export default function ContactenPage() {
  const contacten = useContacten();
  const { contacts, isLoading, isError, refetch, create, update } = contacten;
  const { labels, bulkLabel } = useLabels();
  const { success, error: toastError } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [labelFilter, setLabelFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [groupByLabel, setGroupByLabel] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(60);
  const [formOpen, setFormOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [labelManagerOpen, setLabelManagerOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (typeFilter && !c.relationship_types.includes(typeFilter)) return false;
      if (labelFilter.length > 0) {
        const ids = new Set((c.labels ?? []).map((l) => l.id));
        // match-any: contact must carry at least one of the selected labels
        if (!labelFilter.some((id) => ids.has(id))) return false;
      }
      if (!q) return true;
      return (
        c.display_name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.notes ?? "").toLowerCase().includes(q) ||
        (c.labels ?? []).some((l) => l.name.toLowerCase().includes(q))
      );
    });
  }, [contacts, search, typeFilter, labelFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sortBy === "name") arr.sort((a, b) => a.display_name.localeCompare(b.display_name, "nl"));
    else if (sortBy === "recent") arr.sort((a, b) => (b.last_contacted_at ?? "").localeCompare(a.last_contacted_at ?? ""));
    else arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return arr;
  }, [filtered, sortBy]);

  // Reset the render window whenever the visible set changes (adjust-during-render;
  // no effect, so no set-state-in-effect lint).
  const windowSig = `${search}|${typeFilter}|${labelFilter.join(",")}|${sortBy}|${groupByLabel}`;
  const [prevWindowSig, setPrevWindowSig] = useState(windowSig);
  if (windowSig !== prevWindowSig) {
    setPrevWindowSig(windowSig);
    setVisibleCount(60);
  }

  const toggleLabelFilter = (id: string) =>
    setLabelFilter((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const toggleSelected = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const applyBulkLabel = async (labelId: string, remove: boolean) => {
    if (selected.size === 0) return;
    try {
      await bulkLabel.mutateAsync({ labelId, contactIds: [...selected], remove });
      success(remove ? "Label verwijderd van selectie" : "Label toegevoegd aan selectie");
      exitSelectMode();
    } catch {
      toastError("Bulk-actie mislukt.");
    }
  };

  // Group by label for the grouped view (a contact appears under each of its labels).
  const grouped = useMemo(() => {
    if (!groupByLabel) return null;
    const byLabel = new Map<string, { label: ContactLabel | null; items: Contact[] }>();
    const noLabel: Contact[] = [];
    for (const c of sorted) {
      if ((c.labels?.length ?? 0) === 0) {
        noLabel.push(c);
        continue;
      }
      for (const l of c.labels!) {
        const bucket = byLabel.get(l.id) ?? { label: l, items: [] };
        bucket.items.push(c);
        byLabel.set(l.id, bucket);
      }
    }
    const groups = [...byLabel.values()].sort((a, b) => (a.label?.name ?? "").localeCompare(b.label?.name ?? "", "nl"));
    if (noLabel.length > 0) groups.push({ label: null, items: noLabel });
    return groups;
  }, [groupByLabel, sorted]);

  const visible = groupByLabel ? sorted : sorted.slice(0, visibleCount);
  const hasMore = !groupByLabel && sorted.length > visibleCount;

  const openNew = () => {
    setEditContact(null);
    setFormOpen(true);
  };
  const openEdit = (c: Contact) => {
    setEditContact(c);
    setFormOpen(true);
  };

  return (
    <div className="text-slate-100">
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[#0a0a0f]/92 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <AppIcon name="relations" tone="amber" size="md" framed active />
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-white sm:text-lg">Contacten</h1>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {isLoading ? "laden…" : `${contacts.length} relatie${contacts.length === 1 ? "" : "s"}`}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setLabelManagerOpen(true)}
                aria-label="Labels beheren"
                className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-semibold text-slate-300 transition-colors hover:bg-[var(--color-surface-hover)]"
              >
                <Tag size={14} />
                <span className="hidden sm:inline">Labels</span>
              </button>
              <button
                type="button"
                onClick={openNew}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/12 px-3 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/18"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">Nieuw</span>
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3">
            <Search size={15} className="shrink-0 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Zoek op naam, e-mail of notitie…"
              aria-label="Zoek contacten"
              className="min-h-[40px] min-w-0 flex-1 bg-transparent text-base text-slate-100 outline-none placeholder:text-slate-600 sm:text-sm"
            />
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5 pb-0.5">
            <FilterChip label="Alle" active={typeFilter === null} onClick={() => setTypeFilter(null)} />
            {RELATIONSHIP_TYPES.map((t) => (
              <FilterChip
                key={t.value}
                label={t.label}
                active={typeFilter === t.value}
                onClick={() => setTypeFilter(typeFilter === t.value ? null : t.value)}
              />
            ))}
          </div>

          {labels.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pb-0.5">
              {labels.map((l) => {
                const active = labelFilter.includes(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => toggleLabelFilter(l.id)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-opacity ${labelChipClasses(
                      l.color,
                    )} ${active ? "ring-1 ring-white/40" : "opacity-70 hover:opacity-100"}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${labelDotClasses(l.color)}`} />
                    {l.name}
                  </button>
                );
              })}
              {labelFilter.length > 0 && (
                <button
                  type="button"
                  onClick={() => setLabelFilter([])}
                  className="rounded-full px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-300"
                >
                  wis labels
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5 pb-24 sm:px-6">
        {!isError && !isLoading && contacts.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="hidden sm:inline">Sorteer</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                aria-label="Sorteren"
                className="min-h-[34px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs text-slate-200 outline-none [color-scheme:dark]"
              >
                <option value="name">Naam (A-Z)</option>
                <option value="recent">Laatst gesproken</option>
                <option value="added">Recent toegevoegd</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => setGroupByLabel((v) => !v)}
              aria-pressed={groupByLabel}
              className={`min-h-[34px] rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                groupByLabel
                  ? "border-amber-500/30 bg-amber-500/15 text-amber-200"
                  : "border-[var(--color-border)] text-slate-400 hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              Groepeer op label
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-slate-600">{sorted.length}</span>
              <button
                type="button"
                onClick={selectMode ? exitSelectMode : () => setSelectMode(true)}
                aria-pressed={selectMode}
                className={`min-h-[34px] rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                  selectMode
                    ? "border-amber-500/30 bg-amber-500/15 text-amber-200"
                    : "border-[var(--color-border)] text-slate-300 hover:bg-[var(--color-surface-hover)]"
                }`}
              >
                {selectMode ? "Klaar" : "Selecteren"}
              </button>
            </div>
          </div>
        )}

        {isError ? (
          <EmptyBox
            title="Contacten konden niet worden geladen"
            text="Er ging iets mis bij het ophalen."
            action={
              <button
                type="button"
                onClick={() => void refetch()}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[var(--color-surface-hover)]"
              >
                Opnieuw proberen
              </button>
            }
          />
        ) : isLoading ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-[var(--color-border)] bg-white/[0.03]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyBox
            title={contacts.length === 0 ? "Nog geen contacten" : "Geen resultaten"}
            text={contacts.length === 0 ? "Voeg je eerste relatie toe." : "Pas je zoekopdracht of filter aan."}
            action={
              contacts.length === 0 ? (
                <button
                  type="button"
                  onClick={openNew}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/12 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/18"
                >
                  <Plus size={14} /> Nieuw contact
                </button>
              ) : undefined
            }
          />
        ) : groupByLabel && grouped ? (
          <div className="space-y-5">
            {grouped.map((g) => (
              <div key={g.label?.id ?? "__none"}>
                <div className="mb-2 flex items-center gap-2">
                  {g.label ? (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${labelChipClasses(g.label.color)}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${labelDotClasses(g.label.color)}`} />
                      {g.label.name}
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Zonder label</span>
                  )}
                  <span className="text-[11px] text-slate-600">{g.items.length}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {g.items.map((c) => (
                    <ContactCard
                      key={c.id}
                      contact={c}
                      selectMode={selectMode}
                      selected={selected.has(c.id)}
                      onClick={() => (selectMode ? toggleSelected(c.id) : setDetailId(c.id))}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              {visible.map((c) => (
                <ContactCard
                  key={c.id}
                  contact={c}
                  selectMode={selectMode}
                  selected={selected.has(c.id)}
                  onClick={() => (selectMode ? toggleSelected(c.id) : setDetailId(c.id))}
                />
              ))}
            </div>
            {hasMore && <LoadMoreSentinel onVisible={() => setVisibleCount((c) => c + 60)} />}
          </>
        )}
      </main>

      {selectMode && selected.size > 0 && (
        <BulkBar count={selected.size} labels={labels} onApply={applyBulkLabel} onClear={() => setSelected(new Set())} />
      )}

      {formOpen && (
        <ContactFormModal
          contact={editContact}
          onClose={() => setFormOpen(false)}
          onSubmit={async (data) => {
            if (editContact) {
              await update.mutateAsync({ id: editContact.id, data });
            } else {
              await create.mutateAsync(data);
            }
            setFormOpen(false);
          }}
        />
      )}

      {detailId && (
        <ContactDetailModal
          id={detailId}
          mutations={contacten}
          labels={labels}
          onClose={() => setDetailId(null)}
          onEdit={(c) => {
            setDetailId(null);
            openEdit(c);
          }}
        />
      )}

      {labelManagerOpen && <LabelManagerModal onClose={() => setLabelManagerOpen(false)} />}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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
function LoadMoreSentinel({ onVisible }: { onVisible: () => void }) {
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

function BulkBar({
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

function ContactCard({
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
        {contact.relationship_types.slice(0, 2).map((t) => (
          <span key={t} className="rounded-md border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
            {relationshipLabel(t)}
          </span>
        ))}
      </span>
    </button>
  );
}

function EmptyBox({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
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

function ModalShell({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  const body = (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 cursor-pointer bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        data-app-modal="contact"
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl sm:max-w-lg sm:rounded-2xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3 sm:px-5">
          <h2 className="truncate text-base font-bold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-[var(--color-surface-hover)] hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5">{children}</div>
        {footer && (
          <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:px-5">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
  return typeof document === "undefined" ? body : createPortal(body, document.body);
}

// ─── Form modal (create / edit) ──────────────────────────────────────────────

function ContactFormModal({
  contact,
  onClose,
  onSubmit,
}: {
  contact: Contact | null;
  onClose: () => void;
  onSubmit: (data: {
    display_name: string;
    relationship_types: string[];
    email: string | null;
    phone: string | null;
    address: string | null;
    notes: string | null;
  }) => Promise<void>;
}) {
  const { error: toastError } = useToast();
  const [name, setName] = useState(contact?.display_name ?? "");
  const [types, setTypes] = useState<string[]>(contact?.relationship_types ?? []);
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [address, setAddress] = useState(contact?.address ?? "");
  const [notes, setNotes] = useState(contact?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const toggleType = (value: string) =>
    setTypes((cur) => (cur.includes(value) ? cur.filter((t) => t !== value) : [...cur, value]));

  const submit = async () => {
    if (!name.trim()) {
      toastError("Naam is verplicht.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        display_name: name.trim(),
        relationship_types: types,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });
    } catch {
      toastError("Opslaan mislukt.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={contact ? "Contact bewerken" : "Nieuw contact"}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] flex-1 rounded-xl border border-[var(--color-border)] text-sm font-semibold text-slate-400 transition-colors hover:bg-[var(--color-surface-hover)] hover:text-slate-200"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="min-h-[44px] flex-1 rounded-xl bg-amber-500 text-sm font-bold text-[var(--color-primary-foreground)] transition-colors hover:bg-amber-400 disabled:opacity-50"
          >
            {saving ? "Opslaan…" : contact ? "Opslaan" : "Aanmaken"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Naam *">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="bijv. Mama"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-base text-white outline-none placeholder:text-slate-600 focus:border-amber-500/50 sm:text-sm"
          />
        </Field>

        <Field label="Relatie-type">
          <div className="flex flex-wrap gap-1.5">
            {RELATIONSHIP_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => toggleType(t.value)}
                aria-pressed={types.includes(t.value)}
                className={`min-h-[38px] rounded-lg border px-3 text-xs font-semibold transition-colors ${
                  types.includes(t.value)
                    ? "border-amber-500/30 bg-amber-500/15 text-amber-200"
                    : "border-[var(--color-border)] text-slate-400 hover:bg-[var(--color-surface-hover)] hover:text-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="E-mail">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="optioneel"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-base text-white outline-none placeholder:text-slate-600 focus:border-amber-500/50 sm:text-sm"
            />
          </Field>
          <Field label="Telefoon">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="optioneel"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-base text-white outline-none placeholder:text-slate-600 focus:border-amber-500/50 sm:text-sm"
            />
          </Field>
        </div>

        <Field label="Adres">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="optioneel"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-base text-white outline-none placeholder:text-slate-600 focus:border-amber-500/50 sm:text-sm"
          />
        </Field>

        <Field label="Notities">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Wat is belangrijk om te onthouden?"
            className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-base text-white outline-none placeholder:text-slate-600 focus:border-amber-500/50 sm:text-sm"
          />
        </Field>
      </div>
    </ModalShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  );
}

// ─── Detail modal ────────────────────────────────────────────────────────────

type ContactMutations = ReturnType<typeof useContacten>;

function ContactDetailModal({
  id,
  mutations,
  labels,
  onClose,
  onEdit,
}: {
  id: string;
  mutations: ContactMutations;
  labels: ContactLabel[];
  onClose: () => void;
  onEdit: (c: Contact) => void;
}) {
  const { data: contact, isLoading } = useContact(id);
  const { success, error: toastError } = useToast();
  const { openConfirm } = useConfirm();
  const { remove, addDate, deleteDate, addFact, deleteFact } = mutations;

  const [newFact, setNewFact] = useState("");
  const [dateKind, setDateKind] = useState("birthday");
  const [dateDay, setDateDay] = useState("");
  const [dateMonth, setDateMonth] = useState("");
  const [dateYear, setDateYear] = useState("");

  const managed = contact?.source === "laventecare";

  const handleDelete = async () => {
    if (!contact) return;
    const ok = await openConfirm({
      title: "Contact verwijderen?",
      message: `${contact.display_name} en de bijbehorende datums en feiten worden permanent verwijderd.`,
      confirmLabel: "Verwijderen",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(contact.id);
      success("Contact verwijderd");
      onClose();
    } catch {
      toastError("Verwijderen mislukt.");
    }
  };

  const submitFact = async () => {
    if (!contact || !newFact.trim()) return;
    try {
      await addFact.mutateAsync({ contactId: contact.id, data: { fact: newFact.trim() } });
      setNewFact("");
    } catch {
      toastError("Feit toevoegen mislukt.");
    }
  };

  const submitDate = async () => {
    if (!contact) return;
    const month = Number(dateMonth);
    const day = Number(dateDay);
    if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
      toastError("Vul een geldige dag (1-31) en maand (1-12) in.");
      return;
    }
    try {
      await addDate.mutateAsync({
        contactId: contact.id,
        data: { kind: dateKind, month, day, year: dateYear ? Number(dateYear) : null, recurring: true },
      });
      setDateDay("");
      setDateMonth("");
      setDateYear("");
    } catch {
      toastError("Datum toevoegen mislukt.");
    }
  };

  return (
    <ModalShell title={contact?.display_name ?? "Contact"} onClose={onClose}>
      {isLoading || !contact ? (
        <div className="space-y-3">
          <div className="h-6 w-40 animate-pulse rounded bg-white/5" />
          <div className="h-20 animate-pulse rounded-lg bg-white/[0.03]" />
        </div>
      ) : (
        <div className="space-y-5">
          <RelationshipTypeEditor contact={contact} update={mutations.update} />

          <LabelsEditor contact={contact} labels={labels} assignLabel={mutations.assignLabel} removeLabel={mutations.removeLabel} />

          {(contact.email || contact.phone || contact.address) && (
            <div className="space-y-1 rounded-xl border border-[var(--color-border)] bg-white/[0.02] px-3 py-2 text-sm text-slate-300">
              {contact.email && <p className="truncate">{contact.email}</p>}
              {contact.phone && <p className="truncate">{contact.phone}</p>}
              {contact.address && <p className="truncate text-slate-400">{contact.address}</p>}
            </div>
          )}

          <ChannelsSection contact={contact} addChannel={mutations.addChannel} deleteChannel={mutations.deleteChannel} />

          <InteractionsSection contact={contact} addInteraction={mutations.addInteraction} deleteInteraction={mutations.deleteInteraction} />

          {contact.notes && (
            <div>
              <SectionLabel>Notities</SectionLabel>
              <p className="whitespace-pre-wrap rounded-xl border border-[var(--color-border)] bg-white/[0.02] px-3 py-2 text-sm text-slate-300">
                {contact.notes}
              </p>
            </div>
          )}

          {/* Important dates */}
          <div>
            <SectionLabel>Belangrijke datums</SectionLabel>
            <div className="space-y-1.5">
              {(contact.important_dates ?? []).map((d) => (
                <div key={d.id} className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white/[0.02] px-3 py-2">
                  <CalendarHeart size={14} className="shrink-0 text-amber-300/70" />
                  <span className="min-w-0 flex-1 text-sm text-slate-200">
                    {formatDayMonth(d.month, d.day)}
                    {d.year ? ` ${d.year}` : ""}
                    <span className="ml-1.5 text-xs text-slate-500">
                      {d.kind === "birthday" ? "verjaardag" : d.kind === "anniversary" ? "jubileum" : d.label || "datum"}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void deleteDate.mutateAsync({ contactId: contact.id, dateId: d.id })}
                    aria-label="Datum verwijderen"
                    className="shrink-0 rounded-md p-1 text-slate-500 hover:text-red-300"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <select
                value={dateKind}
                onChange={(e) => setDateKind(e.target.value)}
                aria-label="Soort datum"
                className="min-h-[38px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm text-slate-200 outline-none [color-scheme:dark]"
              >
                <option value="birthday">Verjaardag</option>
                <option value="anniversary">Jubileum</option>
                <option value="other">Anders</option>
              </select>
              <input
                type="number"
                inputMode="numeric"
                value={dateDay}
                onChange={(e) => setDateDay(e.target.value)}
                placeholder="dag"
                aria-label="Dag"
                className="min-h-[38px] w-16 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-base text-white outline-none placeholder:text-slate-600 sm:text-sm"
              />
              <input
                type="number"
                inputMode="numeric"
                value={dateMonth}
                onChange={(e) => setDateMonth(e.target.value)}
                placeholder="maand"
                aria-label="Maand"
                className="min-h-[38px] w-20 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-base text-white outline-none placeholder:text-slate-600 sm:text-sm"
              />
              <input
                type="number"
                inputMode="numeric"
                value={dateYear}
                onChange={(e) => setDateYear(e.target.value)}
                placeholder="jaar?"
                aria-label="Jaar (optioneel)"
                className="min-h-[38px] w-20 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-base text-white outline-none placeholder:text-slate-600 sm:text-sm"
              />
              <button
                type="button"
                onClick={() => void submitDate()}
                className="min-h-[38px] rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 text-xs font-semibold text-amber-300 hover:bg-amber-500/15"
              >
                Toevoegen
              </button>
            </div>
          </div>

          {/* Facts */}
          <div>
            <SectionLabel>Feiten om te onthouden</SectionLabel>
            <div className="space-y-1.5">
              {(contact.facts ?? []).map((f) => (
                <div key={f.id} className="flex items-start gap-2 rounded-lg border border-[var(--color-border)] bg-white/[0.02] px-3 py-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/70" />
                  <span className="min-w-0 flex-1 text-sm text-slate-200">{f.fact}</span>
                  <button
                    type="button"
                    onClick={() => void deleteFact.mutateAsync({ contactId: contact.id, factId: f.id })}
                    aria-label="Feit verwijderen"
                    className="shrink-0 rounded-md p-1 text-slate-500 hover:text-red-300"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <input
                type="text"
                value={newFact}
                onChange={(e) => setNewFact(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void submitFact();
                  }
                }}
                placeholder="bijv. houdt van hardlopen"
                aria-label="Nieuw feit"
                className="min-h-[38px] min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base text-white outline-none placeholder:text-slate-600 sm:text-sm"
              />
              <button
                type="button"
                onClick={() => void submitFact()}
                className="min-h-[38px] shrink-0 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 text-xs font-semibold text-amber-300 hover:bg-amber-500/15"
              >
                Toevoegen
              </button>
            </div>
          </div>

          <WhatsAppSection contactId={contact.id} />

          <div className="border-t border-[var(--color-border)] pt-4">
            {managed ? (
              <div className="flex items-start gap-2 rounded-xl border border-sky-500/20 bg-sky-500/[0.06] px-3 py-2.5 text-xs leading-relaxed text-sky-200/90">
                <Building2 size={15} className="mt-0.5 shrink-0 text-sky-300/80" />
                <span>
                  Dit contact komt uit <span className="font-semibold">LaventeCare</span>. Kerngegevens (naam, e-mail,
                  telefoon) beheer je daar — relatie-types, labels, datums, feiten, kanalen en interacties voeg je hier
                  lokaal toe.
                </span>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-red-500/20 px-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 size={16} /> Verwijderen
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(contact)}
                  className="min-h-[44px] flex-1 rounded-xl bg-amber-500 text-sm font-bold text-[var(--color-primary-foreground)] transition-colors hover:bg-amber-400"
                >
                  Bewerken
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </ModalShell>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{children}</p>;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "vandaag";
  if (days === 1) return "gisteren";
  if (days < 14) return `${days} dagen geleden`;
  if (days < 60) return `${Math.floor(days / 7)} weken geleden`;
  const months = Math.floor(days / 30);
  if (months < 24) return `${months} maanden geleden`;
  return `${Math.floor(days / 365)} jaar geleden`;
}

// ─── Detail sub-sections (editable on every contact, incl. LaventeCare) ───────

function RelationshipTypeEditor({ contact, update }: { contact: Contact; update: ContactMutations["update"] }) {
  const { error: toastError } = useToast();
  const toggle = async (value: string) => {
    const has = contact.relationship_types.includes(value);
    const next = has ? contact.relationship_types.filter((t) => t !== value) : [...contact.relationship_types, value];
    try {
      await update.mutateAsync({ id: contact.id, data: { relationship_types: next } });
    } catch {
      toastError("Bijwerken mislukt.");
    }
  };
  return (
    <div>
      <SectionLabel>Relatie-type</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {RELATIONSHIP_TYPES.map((t) => {
          const active = contact.relationship_types.includes(t.value);
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => void toggle(t.value)}
              aria-pressed={active}
              className={`min-h-[34px] rounded-lg border px-3 text-xs font-semibold transition-colors ${
                active
                  ? "border-amber-500/30 bg-amber-500/15 text-amber-200"
                  : "border-[var(--color-border)] text-slate-400 hover:bg-[var(--color-surface-hover)] hover:text-slate-200"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LabelsEditor({
  contact,
  labels,
  assignLabel,
  removeLabel,
}: {
  contact: Contact;
  labels: ContactLabel[];
  assignLabel: ContactMutations["assignLabel"];
  removeLabel: ContactMutations["removeLabel"];
}) {
  const { error: toastError } = useToast();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const assigned = contact.labels ?? [];
  const assignedIds = new Set(assigned.map((l) => l.id));
  const q = query.trim().toLowerCase();
  const suggestions = labels.filter((l) => !assignedIds.has(l.id) && (q === "" || l.name.toLowerCase().includes(q)));
  const exactExists =
    q !== "" && (labels.some((l) => l.name.toLowerCase() === q) || assigned.some((l) => l.name.toLowerCase() === q));

  const assignExisting = async (labelId: string) => {
    try {
      await assignLabel.mutateAsync({ contactId: contact.id, data: { label_id: labelId } });
      setQuery("");
    } catch {
      toastError("Label toevoegen mislukt.");
    }
  };
  const createAndAssign = async () => {
    const name = query.trim();
    if (!name) return;
    try {
      await assignLabel.mutateAsync({ contactId: contact.id, data: { name } });
      setQuery("");
    } catch {
      toastError("Label toevoegen mislukt.");
    }
  };
  const detach = async (labelId: string) => {
    try {
      await removeLabel.mutateAsync({ contactId: contact.id, labelId });
    } catch {
      toastError("Label verwijderen mislukt.");
    }
  };

  return (
    <div>
      <SectionLabel>Labels</SectionLabel>
      {assigned.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {assigned.map((l) => (
            <span
              key={l.id}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${labelChipClasses(l.color)}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${labelDotClasses(l.color)}`} />
              {l.name}
              <button
                type="button"
                onClick={() => void detach(l.id)}
                aria-label={`${l.name} verwijderen`}
                className="ml-0.5 opacity-70 hover:opacity-100"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!exactExists) void createAndAssign();
              else if (suggestions[0]) void assignExisting(suggestions[0].id);
            }
          }}
          placeholder="Label toevoegen of maken…"
          aria-label="Label toevoegen"
          className="min-h-[38px] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base text-white outline-none placeholder:text-slate-600 focus:border-amber-500/50 sm:text-sm"
        />
        {open && (suggestions.length > 0 || q !== "") && (
          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[#0d0d14] p-1 shadow-xl">
            {suggestions.map((l) => (
              <button
                key={l.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void assignExisting(l.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-200 hover:bg-white/5"
              >
                <span className={`h-2 w-2 rounded-full ${labelDotClasses(l.color)}`} />
                <span className="flex-1 truncate">{l.name}</span>
                {typeof l.contact_count === "number" && <span className="text-[10px] text-slate-600">{l.contact_count}</span>}
              </button>
            ))}
            {q !== "" && !exactExists && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void createAndAssign()}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-amber-300 hover:bg-amber-500/10"
              >
                <Plus size={13} /> Nieuw label &quot;{query.trim()}&quot;
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ChannelsSection({
  contact,
  addChannel,
  deleteChannel,
}: {
  contact: Contact;
  addChannel: ContactMutations["addChannel"];
  deleteChannel: ContactMutations["deleteChannel"];
}) {
  const { error: toastError } = useToast();
  const [kind, setKind] = useState("email");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const channels = contact.channels ?? [];

  const submit = async () => {
    if (!value.trim()) return;
    try {
      await addChannel.mutateAsync({
        contactId: contact.id,
        data: { kind, value: value.trim(), label: label.trim() || null },
      });
      setValue("");
      setLabel("");
    } catch {
      toastError("Kanaal toevoegen mislukt.");
    }
  };
  const remove = async (channelId: string) => {
    try {
      await deleteChannel.mutateAsync({ contactId: contact.id, channelId });
    } catch {
      toastError("Kanaal verwijderen mislukt.");
    }
  };

  return (
    <div>
      <SectionLabel>Extra contactgegevens</SectionLabel>
      {channels.length > 0 && (
        <div className="space-y-1.5">
          {channels.map((ch) => (
            <div
              key={ch.id}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white/[0.02] px-3 py-2"
            >
              {ch.kind === "phone" ? (
                <Phone size={13} className="shrink-0 text-emerald-300/70" />
              ) : ch.kind === "email" ? (
                <Mail size={13} className="shrink-0 text-sky-300/70" />
              ) : (
                <Tag size={13} className="shrink-0 text-slate-400" />
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{ch.value}</span>
              {ch.label && <span className="shrink-0 text-[11px] text-slate-500">{ch.label}</span>}
              <button
                type="button"
                onClick={() => void remove(ch.id)}
                aria-label="Kanaal verwijderen"
                className="shrink-0 rounded-md p-1 text-slate-500 hover:text-red-300"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          aria-label="Soort kanaal"
          className="min-h-[38px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm text-slate-200 outline-none [color-scheme:dark]"
        >
          <option value="email">E-mail</option>
          <option value="phone">Telefoon</option>
          <option value="other">Anders</option>
        </select>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="waarde"
          aria-label="Waarde"
          className="min-h-[38px] min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base text-white outline-none placeholder:text-slate-600 sm:text-sm"
        />
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="label?"
          aria-label="Kanaal-label"
          className="min-h-[38px] w-20 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-base text-white outline-none placeholder:text-slate-600 sm:text-sm"
        />
        <button
          type="button"
          onClick={() => void submit()}
          className="min-h-[38px] rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 text-xs font-semibold text-amber-300 hover:bg-amber-500/15"
        >
          Toevoegen
        </button>
      </div>
    </div>
  );
}

const INTERACTION_KINDS = [
  { value: "call", label: "Gebeld" },
  { value: "meeting", label: "Afspraak" },
  { value: "message", label: "Bericht" },
  { value: "email", label: "E-mail" },
  { value: "note", label: "Notitie" },
] as const;

function interactionKindLabel(v: string) {
  return INTERACTION_KINDS.find((k) => k.value === v)?.label ?? v;
}

function InteractionsSection({
  contact,
  addInteraction,
  deleteInteraction,
}: {
  contact: Contact;
  addInteraction: ContactMutations["addInteraction"];
  deleteInteraction: ContactMutations["deleteInteraction"];
}) {
  const { error: toastError } = useToast();
  const [kind, setKind] = useState("call");
  const [summary, setSummary] = useState("");
  const interactions = contact.interactions ?? [];

  const submit = async () => {
    try {
      await addInteraction.mutateAsync({ contactId: contact.id, data: { kind, summary: summary.trim() || null } });
      setSummary("");
    } catch {
      toastError("Contactmoment loggen mislukt.");
    }
  };
  const remove = async (interactionId: string) => {
    try {
      await deleteInteraction.mutateAsync({ contactId: contact.id, interactionId });
    } catch {
      toastError("Verwijderen mislukt.");
    }
  };

  return (
    <div>
      <SectionLabel>Contactmomenten</SectionLabel>
      {contact.last_contacted_at && (
        <p className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
          <Clock size={12} /> Laatst gesproken {formatRelative(contact.last_contacted_at)}
        </p>
      )}
      {interactions.length > 0 && (
        <div className="space-y-1.5">
          {interactions.map((it) => (
            <div
              key={it.id}
              className="flex items-start gap-2 rounded-lg border border-[var(--color-border)] bg-white/[0.02] px-3 py-2"
            >
              <span className="mt-0.5 shrink-0 rounded-md border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                {interactionKindLabel(it.kind)}
              </span>
              <span className="min-w-0 flex-1 text-sm text-slate-200">
                {it.summary || <span className="text-slate-500">geen notitie</span>}
                <span className="ml-1.5 text-[11px] text-slate-600">{formatRelative(it.occurred_at)}</span>
              </span>
              <button
                type="button"
                onClick={() => void remove(it.id)}
                aria-label="Contactmoment verwijderen"
                className="shrink-0 rounded-md p-1 text-slate-500 hover:text-red-300"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          aria-label="Soort contact"
          className="min-h-[38px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm text-slate-200 outline-none [color-scheme:dark]"
        >
          {INTERACTION_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder="korte notitie (optioneel)"
          aria-label="Notitie"
          className="min-h-[38px] min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base text-white outline-none placeholder:text-slate-600 sm:text-sm"
        />
        <button
          type="button"
          onClick={() => void submit()}
          className="min-h-[38px] rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/15"
        >
          Log
        </button>
      </div>
    </div>
  );
}

// ─── Label catalog manager ───────────────────────────────────────────────────

function ColorDot({ color, onClick }: { color: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Kleur kiezen"
      className={`h-6 w-6 shrink-0 rounded-full border border-white/20 ${labelDotClasses(color)}`}
    />
  );
}

function PalettePicker({ onPick }: { onPick: (c: string) => void }) {
  return (
    <div className="absolute left-0 top-8 z-30 grid w-44 grid-cols-5 gap-1.5 rounded-lg border border-[var(--color-border)] bg-[#0d0d14] p-2 shadow-xl">
      {LABEL_COLOR_KEYS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          aria-label={c}
          className={`h-6 w-6 rounded-full border border-white/10 ${labelDotClasses(c)} hover:ring-2 hover:ring-white/40`}
        />
      ))}
    </div>
  );
}

function LabelManagerModal({ onClose }: { onClose: () => void }) {
  const { labels, isLoading, createLabel, updateLabel, deleteLabel, mergeLabel } = useLabels();
  const { success, error: toastError } = useToast();
  const { openConfirm } = useConfirm();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>("slate");
  const [colorEditId, setColorEditId] = useState<string | null>(null);
  const [mergeFrom, setMergeFrom] = useState<ContactLabel | null>(null);

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await createLabel.mutateAsync({ name, color: newColor });
      setNewName("");
    } catch {
      toastError("Label maken mislukt.");
    }
  };
  const rename = async (l: ContactLabel, name: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === l.name) return;
    try {
      await updateLabel.mutateAsync({ labelId: l.id, data: { name: trimmed } });
    } catch {
      toastError("Hernoemen mislukt (bestaat de naam al?).");
    }
  };
  const recolor = async (l: ContactLabel, color: string) => {
    setColorEditId(null);
    try {
      await updateLabel.mutateAsync({ labelId: l.id, data: { color } });
    } catch {
      toastError("Kleur wijzigen mislukt.");
    }
  };
  const del = async (l: ContactLabel) => {
    const ok = await openConfirm({
      title: `Label "${l.name}" verwijderen?`,
      message: "Het label wordt van alle contacten losgekoppeld.",
      confirmLabel: "Verwijderen",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteLabel.mutateAsync(l.id);
      success("Label verwijderd");
    } catch {
      toastError("Verwijderen mislukt.");
    }
  };
  const doMerge = async (into: ContactLabel) => {
    if (!mergeFrom || mergeFrom.id === into.id) {
      setMergeFrom(null);
      return;
    }
    const ok = await openConfirm({
      title: "Labels samenvoegen?",
      message: `Alle contacten met "${mergeFrom.name}" krijgen "${into.name}"; "${mergeFrom.name}" wordt verwijderd.`,
      confirmLabel: "Samenvoegen",
    });
    if (!ok) {
      setMergeFrom(null);
      return;
    }
    try {
      await mergeLabel.mutateAsync({ labelId: mergeFrom.id, into: into.id });
      success("Labels samengevoegd");
    } catch {
      toastError("Samenvoegen mislukt.");
    } finally {
      setMergeFrom(null);
    }
  };

  return (
    <ModalShell title="Labels beheren" onClose={onClose}>
      <div className="space-y-4">
        <div className="relative flex flex-wrap items-center gap-1.5">
          <div className="relative">
            <ColorDot color={newColor} onClick={() => setColorEditId(colorEditId === "__new" ? null : "__new")} />
            {colorEditId === "__new" && (
              <PalettePicker
                onPick={(c) => {
                  setNewColor(c);
                  setColorEditId(null);
                }}
              />
            )}
          </div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void create();
              }
            }}
            placeholder="Nieuw label…"
            aria-label="Nieuw label"
            className="min-h-[38px] min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base text-white outline-none placeholder:text-slate-600 focus:border-amber-500/50 sm:text-sm"
          />
          <button
            type="button"
            onClick={() => void create()}
            className="min-h-[38px] rounded-lg bg-amber-500 px-3 text-sm font-bold text-[var(--color-primary-foreground)] hover:bg-amber-400"
          >
            Maak
          </button>
        </div>

        {mergeFrom && (
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Kies hieronder waarmee je <span className="font-semibold">{mergeFrom.name}</span> wilt samenvoegen.{" "}
            <button type="button" onClick={() => setMergeFrom(null)} className="underline">
              annuleren
            </button>
          </div>
        )}

        {isLoading ? (
          <p className="text-xs text-slate-500">laden…</p>
        ) : labels.length === 0 ? (
          <p className="text-sm text-slate-500">Nog geen labels. Maak er hierboven een aan.</p>
        ) : (
          <div className="space-y-1.5">
            {labels.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white/[0.02] px-2.5 py-2"
              >
                <div className="relative">
                  <ColorDot color={l.color} onClick={() => setColorEditId(colorEditId === l.id ? null : l.id)} />
                  {colorEditId === l.id && <PalettePicker onPick={(c) => void recolor(l, c)} />}
                </div>
                <input
                  key={`${l.id}:${l.name}`}
                  defaultValue={l.name}
                  onBlur={(e) => void rename(l, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  aria-label="Labelnaam"
                  className="min-h-[34px] min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-sm text-slate-100 outline-none hover:border-[var(--color-border)] focus:border-amber-500/40"
                />
                <span className="shrink-0 text-[11px] text-slate-600">{l.contact_count ?? 0}</span>
                {mergeFrom ? (
                  mergeFrom.id !== l.id && (
                    <button
                      type="button"
                      onClick={() => void doMerge(l)}
                      className="shrink-0 rounded-md border border-amber-500/25 px-2 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/10"
                    >
                      → hierheen
                    </button>
                  )
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setMergeFrom(l)}
                      aria-label="Samenvoegen met…"
                      className="shrink-0 rounded-md p-1 text-slate-500 hover:text-amber-300"
                    >
                      <GitMerge size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void del(l)}
                      aria-label="Label verwijderen"
                      className="shrink-0 rounded-md p-1 text-slate-500 hover:text-red-300"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ModalShell>
  );
}

// ─── WhatsApp import ─────────────────────────────────────────────────────────

function WhatsAppSection({ contactId }: { contactId: string }) {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [importing, setImporting] = useState(false);

  const listQuery = useQuery({
    queryKey: ["contacten", "whatsapp", contactId],
    queryFn: () => contactenApi.whatsappList(userId, contactId),
    enabled: !!userId,
    staleTime: 15_000,
  });

  const conversations = listQuery.data?.conversations ?? [];
  const summaries = listQuery.data?.summaries ?? [];
  const summaryFor = (conversationId: string) => summaries.find((s) => s.conversation_id === conversationId)?.summary;

  const importFile = async (file: File) => {
    if (!userId) return;
    setImporting(true);
    try {
      const text = await file.text();
      const chatName = file.name.replace(/\.txt$/i, "").replace(/^whatsapp[- ]?chat[- ]?(met[- ])?/i, "").trim();
      await contactenApi.whatsappImport(userId, contactId, {
        chat_name: chatName || undefined,
        source_filename: file.name,
        text,
      });
      success("WhatsApp-gesprek geïmporteerd");
      queryClient.invalidateQueries({ queryKey: ["contacten", "whatsapp", contactId] });
      queryClient.invalidateQueries({ queryKey: ["contacten", "detail", contactId] });
    } catch {
      toastError("Import mislukt — is dit een geëxporteerd .txt-chatbestand?");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <SectionLabel>WhatsApp</SectionLabel>
      {conversations.length > 0 && (
        <div className="space-y-1.5">
          {conversations.map((c) => (
            <div key={c.id} className="rounded-lg border border-[var(--color-border)] bg-white/[0.02] px-3 py-2">
              <div className="flex items-center gap-2">
                <MessageCircle size={13} className="shrink-0 text-emerald-400/70" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200">{c.chat_name}</span>
                <span className="shrink-0 text-[11px] text-slate-500">{c.message_count} berichten</span>
              </div>
              {summaryFor(c.id) && <p className="mt-1 text-xs leading-relaxed text-slate-400">{summaryFor(c.id)}</p>}
            </div>
          ))}
        </div>
      )}
      <label className="mt-2 inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/15">
        <input
          type="file"
          accept=".txt,text/plain"
          className="hidden"
          disabled={importing}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importFile(file);
            e.target.value = "";
          }}
        />
        <MessageCircle size={13} />
        {importing ? "Importeren…" : "Importeer WhatsApp-export (.txt)"}
      </label>
      <p className="mt-1 text-[10px] leading-4 text-slate-600">
        Exporteer een chat in WhatsApp (zonder media) en kies het .txt-bestand. Alleen een samenvatting gaat naar de AI; de
        berichten blijven lokaal.
      </p>
    </div>
  );
}
