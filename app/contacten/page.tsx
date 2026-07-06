"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { Building2, CalendarHeart, MessageCircle, Plus, Search, Trash2, X } from "lucide-react";
import { AppIcon } from "@/components/ui/AppIcon";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useContacten, useContact } from "@/hooks/useContacten";
import { contactenApi, type Contact } from "@/lib/api";

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

export default function ContactenPage() {
  const { contacts, isLoading, isError, refetch, create, update, remove, addDate, deleteDate, addFact, deleteFact } =
    useContacten();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (typeFilter && !c.relationship_types.includes(typeFilter)) return false;
      if (!q) return true;
      return (
        c.display_name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.notes ?? "").toLowerCase().includes(q)
      );
    });
  }, [contacts, search, typeFilter]);

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
            <button
              type="button"
              onClick={openNew}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/12 px-3 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/18"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Nieuw</span>
            </button>
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
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
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
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {filtered.map((c) => (
              <ContactCard key={c.id} contact={c} onClick={() => setDetailId(c.id)} />
            ))}
          </div>
        )}
      </main>

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
          onClose={() => setDetailId(null)}
          onEdit={(c) => {
            setDetailId(null);
            openEdit(c);
          }}
          onDelete={remove}
          addDate={addDate}
          deleteDate={deleteDate}
          addFact={addFact}
          deleteFact={deleteFact}
        />
      )}
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

function ContactCard({ contact, onClick }: { contact: Contact; onClick: () => void }) {
  const sub = contact.email || contact.phone || (contact.notes ? contact.notes.split("\n")[0] : "");
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[64px] items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white/[0.02] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
    >
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-sm font-bold uppercase text-amber-200">
        {contact.display_name.trim().charAt(0) || "?"}
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

type Mutation<TVars> = { mutateAsync: (vars: TVars) => Promise<unknown> };

function ContactDetailModal({
  id,
  onClose,
  onEdit,
  onDelete,
  addDate,
  deleteDate,
  addFact,
  deleteFact,
}: {
  id: string;
  onClose: () => void;
  onEdit: (c: Contact) => void;
  onDelete: { mutateAsync: (id: string) => Promise<unknown> };
  addDate: Mutation<{ contactId: string; data: { kind: string; label?: string | null; month: number; day: number; year?: number | null; recurring?: boolean } }>;
  deleteDate: Mutation<{ contactId: string; dateId: string }>;
  addFact: Mutation<{ contactId: string; data: { fact: string; source?: string } }>;
  deleteFact: Mutation<{ contactId: string; factId: string }>;
}) {
  const { data: contact, isLoading } = useContact(id);
  const { success, error: toastError } = useToast();
  const { openConfirm } = useConfirm();

  const [newFact, setNewFact] = useState("");
  const [dateKind, setDateKind] = useState("birthday");
  const [dateDay, setDateDay] = useState("");
  const [dateMonth, setDateMonth] = useState("");
  const [dateYear, setDateYear] = useState("");

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
      await onDelete.mutateAsync(contact.id);
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
          <div className="flex flex-wrap items-center gap-1.5">
            {contact.relationship_types.length > 0 ? (
              contact.relationship_types.map((t) => (
                <span key={t} className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-200">
                  {relationshipLabel(t)}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500">Geen relatie-type</span>
            )}
          </div>

          {(contact.email || contact.phone || contact.address) && (
            <div className="space-y-1 rounded-xl border border-[var(--color-border)] bg-white/[0.02] px-3 py-2 text-sm text-slate-300">
              {contact.email && <p className="truncate">{contact.email}</p>}
              {contact.phone && <p className="truncate">{contact.phone}</p>}
              {contact.address && <p className="truncate text-slate-400">{contact.address}</p>}
            </div>
          )}

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
            {contact.source === "laventecare" ? (
              <div className="flex items-start gap-2 rounded-xl border border-sky-500/20 bg-sky-500/[0.06] px-3 py-2.5 text-xs leading-relaxed text-sky-200/90">
                <Building2 size={15} className="mt-0.5 shrink-0 text-sky-300/80" />
                <span>
                  Dit contact komt uit <span className="font-semibold">LaventeCare</span>. Kerngegevens (naam, e-mail,
                  telefoon) beheer je daar — datums, feiten en WhatsApp voeg je hier lokaal toe.
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
