"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import {
  Archive,
  Building2,
  CalendarHeart,
  ChevronRight,
  Clock,
  GitMerge,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Star,
  StickyNote,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { AppIcon } from "@/components/ui/AppIcon";
import {
  AppPageHeader,
  AppPageShell,
  PageToolbar,
} from "@/components/layout/AppPageShell";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button, buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FormField } from "@/components/ui/FormField";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { ResponsiveActions } from "@/components/ui/ResponsiveActions";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";
import { Textarea } from "@/components/ui/Textarea";

import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useContacten, useContact, useLabels } from "@/hooks/useContacten";
import { useContactNotes } from "@/hooks/useContactNotes";
import type { NoteRecord } from "@/hooks/useNotes";
import { usePrivacy } from "@/hooks/usePrivacy";
import { contactenApi, laventecareApi, DuplicateContactError, type Contact, type ContactLabel } from "@/lib/api";
import { LABEL_COLOR_KEYS, labelChipClasses, labelColorStyle, labelDotClasses } from "@/lib/contacten/labelColors";
import { laventeCareQueryKeys } from "@/lib/laventecare/query-keys";
import { formatDayMonth, RELATIONSHIP_TYPES } from "@/lib/contacten/contact-display";
import {
  BulkBar,
  ContactCard,
  EmptyBox,
  FilterChip,
  LoadMoreSentinel,
  ModalShell,
} from "@/components/contacts/ContactListPrimitives";

type SortKey = "name" | "recent" | "added";

export default function ContactenPage() {
  const [showArchived, setShowArchived] = useState(false);
  const contacten = useContacten({ includeArchived: showArchived });
  const { contacts, isLoading, isError, refetch, create, update } = contacten;
  const { labels, bulkLabel } = useLabels();
  const { success, error: toastError } = useToast();
  const { openConfirm } = useConfirm();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [labelFilter, setLabelFilter] = useState<string[]>([]);
  const [labelMatchAll, setLabelMatchAll] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [groupByLabel, setGroupByLabel] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(60);
  const [formOpen, setFormOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [labelManagerOpen, setLabelManagerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Contextbadges uit Notities landen op /contacten?contact=<id>. Client-side
  // lezen houdt deze interactieve pagina build-safe zonder extra Suspense-laag.
  useEffect(() => {
    const syncDetailFromUrl = () => {
      const contactId = new URLSearchParams(window.location.search).get("contact")?.trim() || null;
      setDetailId(contactId);
    };
    const timer = window.setTimeout(syncDetailFromUrl, 0);
    window.addEventListener("popstate", syncDetailFromUrl);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("popstate", syncDetailFromUrl);
    };
  }, []);

  const closeDetail = useCallback(() => {
    setDetailId(null);
    const url = new URL(window.location.href);
    if (!url.searchParams.has("contact")) return;
    url.searchParams.delete("contact");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (typeFilter && !(c.relationship_types ?? []).includes(typeFilter)) return false;
      if (labelFilter.length > 0) {
        const ids = new Set((c.labels ?? []).map((l) => l.id));
        const ok = labelMatchAll ? labelFilter.every((id) => ids.has(id)) : labelFilter.some((id) => ids.has(id));
        if (!ok) return false;
      }
      if (!q) return true;
      return (
        c.display_name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.notes ?? "").toLowerCase().includes(q) ||
        (c.labels ?? []).some((l) => l.name.toLowerCase().includes(q))
      );
    });
  }, [contacts, search, typeFilter, labelFilter, labelMatchAll]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sortBy === "name") arr.sort((a, b) => a.display_name.localeCompare(b.display_name, "nl"));
    else if (sortBy === "recent") arr.sort((a, b) => (b.last_contacted_at ?? "").localeCompare(a.last_contacted_at ?? ""));
    else arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return arr;
  }, [filtered, sortBy]);

  // Reset the render window whenever the visible set changes (adjust-during-render;
  // no effect, so no set-state-in-effect lint).
  const windowSig = `${search}|${typeFilter}|${labelFilter.join(",")}|${labelMatchAll}|${sortBy}|${groupByLabel}|${showArchived}`;
  const [prevWindowSig, setPrevWindowSig] = useState(windowSig);
  if (windowSig !== prevWindowSig) {
    setPrevWindowSig(windowSig);
    setVisibleCount(60);
  }

  // Drop label-filter ids whose label was deleted or merged away (else the filter
  // silently matches zero contacts with no visible chip to clear).
  if (labels.length > 0 && labelFilter.some((id) => !labels.some((l) => l.id === id))) {
    setLabelFilter((cur) => cur.filter((id) => labels.some((l) => l.id === id)));
  }

  // Bulk actions only ever touch contacts currently in view — a narrowed filter
  // must not silently (un)tag now-hidden contacts the user selected earlier.
  const filteredIds = useMemo(() => new Set(filtered.map((c) => c.id)), [filtered]);
  const effectiveSelected = useMemo(
    () => [...selected].filter((id) => filteredIds.has(id)),
    [selected, filteredIds],
  );

  // Stable identity so the sentinel's IntersectionObserver isn't town down and
  // re-created (re-firing on the still-visible sentinel) on every render.
  const loadMore = useCallback(() => setVisibleCount((c) => c + 60), []);

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
    if (effectiveSelected.length === 0) return;
    try {
      await bulkLabel.mutateAsync({ labelId, contactIds: effectiveSelected, remove });
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

  const activeFilterCount =
    (typeFilter ? 1 : 0) +
    labelFilter.length +
    (showArchived ? 1 : 0) +
    (groupByLabel ? 1 : 0) +
    (sortBy === "name" ? 0 : 1);

  const clearContactFilters = () => {
    setTypeFilter(null);
    setLabelFilter([]);
    setLabelMatchAll(false);
    setShowArchived(false);
    setGroupByLabel(false);
    setSortBy("name");
  };

  return (
    <AppPageShell width="narrow" className="text-[var(--color-text)]">
      <AppPageHeader
        className="!flex-row !items-start !justify-between gap-3"
        leading={<AppIcon name="relations" tone="accent" size="md" framed active />}
        title="Contacten"
        description={
          isLoading
            ? "Relaties laden…"
            : `${contacts.length} relatie${contacts.length === 1 ? "" : "s"} in je persoonlijke netwerk`
        }
        actions={
          <ResponsiveActions
            primary={
              <Button variant="primary" onClick={openNew}>
                <Plus size={16} aria-hidden="true" />
                Nieuw
              </Button>
            }
            secondary={
              <Button onClick={() => setLabelManagerOpen(true)}>
                <Tag size={16} aria-hidden="true" />
                Labels beheren
              </Button>
            }
          />
        }
      />

      <PageToolbar
        label="Contacten zoeken en beheren"
        className="mt-4"
        trailing={
          <>
            <span className="hidden text-xs text-[var(--color-text-muted)] sm:inline" aria-live="polite">
              {sorted.length} zichtbaar
            </span>
            {!isError && !isLoading && contacts.length > 0 ? (
              <Button
                variant={selectMode ? "primary" : "secondary"}
                onClick={selectMode ? exitSelectMode : () => setSelectMode(true)}
                aria-pressed={selectMode}
              >
                {selectMode ? "Klaar" : "Selecteren"}
              </Button>
            ) : null}
            <Button
              onClick={() => setFiltersOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={filtersOpen}
              className="relative"
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--color-warning-subtle)] px-1.5 py-0.5 text-micro font-bold text-[var(--color-primary-foreground)]">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
          </>
        }
      >
        <SearchField
          label="Zoek contacten"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onClear={() => setSearch("")}
          placeholder="Zoek op naam, e-mail of notitie…"
          wrapperClassName="w-full min-w-56"
        />
      </PageToolbar>

      <section className="mt-4">
        {isError ? (
          <EmptyBox
            title="Contacten konden niet worden geladen"
            text="Er ging iets mis bij het ophalen."
            action={
              <Button
                type="button"
                onClick={() => void refetch()}
                size="sm"
              >
                Opnieuw proberen
              </Button>
            }
          />
        ) : isLoading ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 border border-[var(--color-border)]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyBox
            title={contacts.length === 0 ? "Nog geen contacten" : "Geen resultaten"}
            text={contacts.length === 0 ? "Voeg je eerste relatie toe." : "Pas je zoekopdracht of filter aan."}
            action={
              contacts.length === 0 ? (
                <Button
                  type="button"
                  onClick={openNew}
                  variant="primary" size="sm"
                >
                  <Plus size={14} /> Nieuw contact
                </Button>
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
                      style={labelColorStyle(g.label.color)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-micro font-semibold ${labelChipClasses()}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${labelDotClasses()}`} />
                      {g.label.name}
                    </span>
                  ) : (
                    <span className="text-micro font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">Zonder label</span>
                  )}
                  <span className="text-micro text-[var(--color-text-subtle)]">{g.items.length}</span>
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
            {hasMore && <LoadMoreSentinel onVisible={loadMore} />}
          </>
        )}
      </section>

      <BottomSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Contacten filteren"
        closeLabel="Filters sluiten"
        contentClassName="p-5"
      >
        <div className="space-y-6">
          <section aria-labelledby="contact-filter-relationship">
            <div className="flex items-center justify-between gap-3">
              <h2 id="contact-filter-relationship" className="text-sm font-semibold text-[var(--color-text)]">
                Relatietype
              </h2>
              <span className="text-xs text-[var(--color-text-muted)]">
                {typeFilter ? "1 gekozen" : "Alle typen"}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <FilterChip label="Alle" active={typeFilter === null} onClick={() => setTypeFilter(null)} />
              {RELATIONSHIP_TYPES.map((type) => (
                <FilterChip
                  key={type.value}
                  label={type.label}
                  active={typeFilter === type.value}
                  onClick={() => setTypeFilter(typeFilter === type.value ? null : type.value)}
                />
              ))}
            </div>
          </section>

          {labels.length > 0 ? (
            <section aria-labelledby="contact-filter-labels">
              <div className="flex items-center justify-between gap-3">
                <h2 id="contact-filter-labels" className="text-sm font-semibold text-[var(--color-text)]">
                  Labels
                </h2>
                {labelFilter.length > 1 ? (
                  <Button
                    type="button"
                    onClick={() => setLabelMatchAll((value) => !value)}
                    aria-pressed={labelMatchAll}
                    className="inline-flex h-11 items-center rounded-xl border border-[var(--color-border)] px-3 text-xs font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)]"
                  >
                    {labelMatchAll ? "Match alle labels" : "Match één label"}
                  </Button>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {labels.map((label) => {
                  const active = labelFilter.includes(label.id);
                  return (
                    <Button
                      key={label.id}
                      type="button"
                      style={labelColorStyle(label.color)}
                      onClick={() => toggleLabelFilter(label.id)}
                      aria-pressed={active}
                      className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-opacity ${labelChipClasses()} ${active ? "ring-1 ring-[var(--color-border-strong)]" : "opacity-70 hover:opacity-100"}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${labelDotClasses()}`} aria-hidden="true" />
                      {label.name}
                    </Button>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section aria-labelledby="contact-filter-view">
            <h2 id="contact-filter-view" className="text-sm font-semibold text-[var(--color-text)]">
              Weergave
            </h2>
            <FormField id="contact-filter-sort" label="Sortering" className="mt-3">
              {(controlProps) => (
                <Select
                  {...controlProps}
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortKey)}
                >
                  <option value="name">Naam (A-Z)</option>
                  <option value="recent">Laatst gesproken</option>
                  <option value="added">Recent toegevoegd</option>
                </Select>
              )}
            </FormField>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                onClick={() => setGroupByLabel((value) => !value)}
                aria-pressed={groupByLabel}
                variant={groupByLabel ? "primary" : "secondary"}
              >
                Groepeer op label
              </Button>
              <Button
                type="button"
                onClick={() => setShowArchived((value) => !value)}
                aria-pressed={showArchived}
                variant={showArchived ? "primary" : "secondary"}
              >
                Inclusief gearchiveerd
              </Button>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-2 border-t border-[var(--color-border)] pt-4">
            <Button
              type="button"
              onClick={clearContactFilters}
              disabled={activeFilterCount === 0}
              fullWidth
            >
              Wissen
            </Button>
            <Button
              type="button"
              onClick={() => setFiltersOpen(false)}
              variant="primary" fullWidth
            >
              {sorted.length} tonen
            </Button>
          </div>
        </div>
      </BottomSheet>
      {selectMode && effectiveSelected.length > 0 && (
        <BulkBar
          count={effectiveSelected.length}
          labels={labels}
          onApply={applyBulkLabel}
          onClear={() => setSelected(new Set())}
        />
      )}

      {formOpen && (
        <ContactFormModal
          contact={editContact}
          onClose={() => setFormOpen(false)}
          onSubmit={async (data) => {
            if (editContact) {
              await update.mutateAsync({ id: editContact.id, data });
              setFormOpen(false);
              return;
            }
            try {
              await create.mutateAsync(data);
              setFormOpen(false);
            } catch (e) {
              if (e instanceof DuplicateContactError) {
                const forceCreate = await openConfirm({
                  title: "Mogelijk dubbel contact",
                  message: `Er bestaat al "${e.duplicate.display_name}". Wil je dit contact toch aanmaken? Kies "Annuleren" om het bestaande te openen.`,
                  confirmLabel: "Toch aanmaken",
                });
                if (forceCreate) {
                  await create.mutateAsync({ ...data, force: true });
                  setFormOpen(false);
                } else {
                  setFormOpen(false);
                  setDetailId(e.duplicate.id);
                }
                return;
              }
              throw e;
            }
          }}
        />
      )}

      {detailId && (
        <ContactDetailModal
          id={detailId}
          mutations={contacten}
          labels={labels}
          onClose={closeDetail}
          onEdit={(c) => {
            closeDetail();
            openEdit(c);
          }}
        />
      )}

      {labelManagerOpen && <LabelManagerModal onClose={() => setLabelManagerOpen(false)} />}
    </AppPageShell>
  );
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
        <div className="grid grid-cols-2 gap-2">
          <Button fullWidth onClick={onClose}>
            Annuleren
          </Button>
          <Button
            variant="primary"
            fullWidth
            onClick={() => void submit()}
            loading={saving}
            loadingLabel="Opslaan…"
          >
            {contact ? "Opslaan" : "Aanmaken"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormField id="contact-name" label="Naam">
          {(controlProps) => (
            <Input
              {...controlProps}
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="bijv. Mama"
              required
            />
          )}
        </FormField>

        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium text-[var(--color-text)]">Relatietype</legend>
          <div className="flex flex-wrap gap-2">
            {RELATIONSHIP_TYPES.map((type) => {
              const active = types.includes(type.value);
              return (
                <Button
                  key={type.value}
                  size="sm"
                  variant={active ? "primary" : "secondary"}
                  onClick={() => toggleType(type.value)}
                  aria-pressed={active}
                  className="rounded-full"
                >
                  {type.label}
                </Button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField id="contact-email" label="E-mail" optional>
            {(controlProps) => (
              <Input
                {...controlProps}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="naam@voorbeeld.nl"
              />
            )}
          </FormField>
          <FormField id="contact-phone" label="Telefoon" optional>
            {(controlProps) => (
              <Input
                {...controlProps}
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Telefoonnummer"
              />
            )}
          </FormField>
        </div>

        <FormField id="contact-address" label="Adres" optional>
          {(controlProps) => (
            <Input
              {...controlProps}
              type="text"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Straat, plaats"
            />
          )}
        </FormField>

        <FormField id="contact-notes" label="Profielachtergrond" optional>
          {(controlProps) => (
            <Textarea
              {...controlProps}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Vaste achtergrondinformatie over dit contact"
            />
          )}
        </FormField>
      </div>
    </ModalShell>
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
  const { data: contact, isLoading, isError: contactError, refetch: refetchContact } = useContact(id);
  const {
    notes: linkedNotes,
    isLoading: linkedNotesLoading,
    isError: linkedNotesError,
    refetch: refetchLinkedNotes,
  } = useContactNotes(id);
  const { success, error: toastError } = useToast();
  const { openConfirm } = useConfirm();
  const { hidden: notesPrivacyOn } = usePrivacy("notes");
  const { remove, addDate, deleteDate, addFact, deleteFact } = mutations;

  const [newFact, setNewFact] = useState("");
  const [dateKind, setDateKind] = useState("birthday");
  const [dateDay, setDateDay] = useState("");
  const [dateMonth, setDateMonth] = useState("");
  const [dateYear, setDateYear] = useState("");
  const [mergeOpen, setMergeOpen] = useState(false);

  const managed = contact?.source === "laventecare";

  const handleDelete = async () => {
    if (!contact) return;
    const ok = await openConfirm({
      title: "Contact verwijderen?",
      message: `${contact.display_name} en de bijbehorende datums en feiten worden permanent verwijderd. Notities uit de Notities-module blijven behouden, maar worden van dit contact ontkoppeld.`,
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

  const handleArchive = async () => {
    if (!contact) return;
    try {
      await mutations.update.mutateAsync({ id: contact.id, data: { archived: !contact.archived } });
      success(contact.archived ? "Contact hersteld" : "Contact gearchiveerd");
    } catch {
      toastError("Bijwerken mislukt.");
    }
  };

  const doMerge = async (fromId: string) => {
    if (!contact) return;
    try {
      await mutations.merge.mutateAsync({ fromId, into: contact.id });
      await refetchLinkedNotes();
      success("Contacten samengevoegd");
      setMergeOpen(false);
    } catch {
      toastError("Samenvoegen mislukt.");
    }
  };

  return (
    <ModalShell title={contact?.display_name ?? "Contact"} onClose={onClose}>
      {contactError ? (
        <Surface tone="danger" padding="md" role="alert" className="text-center">
          <p className="text-sm font-semibold text-[var(--color-text)]">Contact kon niet geladen worden</p>
          <Button size="sm" onClick={() => void refetchContact()} className="mt-3">
            <RefreshCw size={14} aria-hidden="true" /> Opnieuw proberen
          </Button>
        </Surface>
      ) : isLoading || !contact ? (
        <div className="space-y-3" role="status" aria-label="Contact laden">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-20" />
        </div>
      ) : (
        <div className="space-y-5">
          <RelationshipTypeEditor contact={contact} update={mutations.update} />

          <LabelsEditor contact={contact} labels={labels} assignLabel={mutations.assignLabel} removeLabel={mutations.removeLabel} />

          {(contact.email || contact.phone || contact.address) && (
            <Surface tone="subtle" radius="md" padding="sm" className="space-y-1 text-sm text-[var(--color-text-muted)]">
              {contact.email && <p className="truncate">{contact.email}</p>}
              {contact.phone && <p className="truncate">{contact.phone}</p>}
              {contact.address && <p className="truncate text-[var(--color-text-subtle)]">{contact.address}</p>}
            </Surface>
          )}

          <OrganizationsEditor
            contact={contact}
            addOrganization={mutations.addOrganization}
            removeOrganization={mutations.removeOrganization}
          />

          <ChannelsSection
            contact={contact}
            addChannel={mutations.addChannel}
            deleteChannel={mutations.deleteChannel}
            updateChannel={mutations.updateChannel}
          />

          <InteractionsSection contact={contact} addInteraction={mutations.addInteraction} deleteInteraction={mutations.deleteInteraction} />

          {contact.notes && (
            <div>
              <SectionLabel>Profielachtergrond</SectionLabel>
              <Surface tone="subtle" radius="md" padding="sm" className="whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">
                {contact.notes}
              </Surface>
            </div>
          )}

          <LinkedNotesSection
            contact={contact}
            notes={linkedNotes}
            isLoading={linkedNotesLoading}
            isError={linkedNotesError}
            onRetry={() => void refetchLinkedNotes()}
            onNavigate={onClose}
            masked={notesPrivacyOn}
          />

          {/* Important dates */}
          <div>
            <SectionLabel>Belangrijke datums</SectionLabel>
            <div className="space-y-1.5">
              {(contact.important_dates ?? []).map((d) => (
                <Surface key={d.id} tone="subtle" radius="sm" padding="sm" className="flex items-center gap-2">
                  <CalendarHeart size={16} className="shrink-0 text-[var(--color-warning)]" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-sm text-[var(--color-text)]">
                    {formatDayMonth(d.month, d.day)}
                    {d.year ? ` ${d.year}` : ""}
                    <span className="ml-1.5 text-xs text-[var(--color-text-subtle)]">
                      {d.kind === "birthday" ? "verjaardag" : d.kind === "anniversary" ? "jubileum" : d.label || "datum"}
                    </span>
                  </span>
                  <IconButton
                    label="Datum verwijderen"
                    icon={<Trash2 size={16} />}
                    variant="danger"
                    onClick={() => void deleteDate.mutateAsync({ contactId: contact.id, dateId: d.id })}
                  />
                </Surface>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Select
                value={dateKind}
                onChange={(e) => setDateKind(e.target.value)}
                aria-label="Soort datum"
                className="w-auto"
              >
                <option value="birthday">Verjaardag</option>
                <option value="anniversary">Jubileum</option>
                <option value="other">Anders</option>
              </Select>
              <Input
                type="number"
                inputMode="numeric"
                value={dateDay}
                onChange={(e) => setDateDay(e.target.value)}
                placeholder="dag"
                aria-label="Dag"
                className="w-20"
              />
              <Input
                type="number"
                inputMode="numeric"
                value={dateMonth}
                onChange={(e) => setDateMonth(e.target.value)}
                placeholder="maand"
                aria-label="Maand"
                className="w-24"
              />
              <Input
                type="number"
                inputMode="numeric"
                value={dateYear}
                onChange={(e) => setDateYear(e.target.value)}
                placeholder="jaar?"
                aria-label="Jaar (optioneel)"
                className="w-24"
              />
              <Button
                type="button"
                onClick={() => void submitDate()}
                variant="primary" size="sm"
              >
                Toevoegen
              </Button>
            </div>
          </div>

          {/* Facts */}
          <div>
            <SectionLabel>Feiten om te onthouden</SectionLabel>
            <div className="space-y-1.5">
              {(contact.facts ?? []).map((f) => (
                <Surface key={f.id} tone="subtle" radius="sm" padding="sm" className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-warning)]" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-sm text-[var(--color-text)]">{f.fact}</span>
                  <IconButton
                    label="Feit verwijderen"
                    icon={<Trash2 size={16} />}
                    variant="danger"
                    onClick={() => void deleteFact.mutateAsync({ contactId: contact.id, factId: f.id })}
                  />
                </Surface>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <Input
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
                className="min-w-0 flex-1"
              />
              <Button
                type="button"
                onClick={() => void submitFact()}
                variant="primary" size="sm"
              >
                Toevoegen
              </Button>
            </div>
          </div>

          <WhatsAppSection contactId={contact.id} />

          <div className="space-y-2 border-t border-[var(--color-border)] pt-4">
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => setMergeOpen(true)}
                variant="secondary"
                fullWidth
              >
                <GitMerge size={15} /> Samenvoegen
              </Button>
              <Button
                type="button"
                onClick={() => void handleArchive()}
                variant="secondary"
                fullWidth
              >
                <Archive size={15} /> {contact.archived ? "Herstellen" : "Archiveren"}
              </Button>
            </div>
            {managed ? (
              <Surface tone="info" radius="md" padding="sm" className="flex items-start gap-2 text-xs leading-relaxed text-[var(--color-info)]">
                <Building2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  Dit contact komt uit <span className="font-semibold">LaventeCare</span>. Kerngegevens (naam, e-mail,
                  telefoon) beheer je daar — relatie-types, labels, datums, feiten, kanalen en interacties voeg je hier
                  lokaal toe.
                </span>
              </Surface>
            ) : (
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => void handleDelete()}
                  variant="danger"
                >
                  <Trash2 size={16} /> Verwijderen
                </Button>
                <Button
                  type="button"
                  onClick={() => onEdit(contact)}
                  variant="primary" fullWidth
                >
                  Bewerken
                </Button>
              </div>
            )}
          </div>

          {mergeOpen && (
            <MergeContactPicker currentId={contact.id} onClose={() => setMergeOpen(false)} onPick={(id) => void doMerge(id)} />
          )}
        </div>
      )}
    </ModalShell>
  );
}

function LinkedNotesSection({
  contact,
  notes,
  isLoading,
  isError,
  onRetry,
  onNavigate,
  masked,
}: {
  contact: Contact;
  notes: NoteRecord[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onNavigate: () => void;
  masked: boolean;
}) {
  const sortedNotes = [...notes].sort((a, b) => b.gewijzigd.localeCompare(a.gewijzigd));
  const newNoteHref = {
    pathname: "/notities",
    query: {
      new: "1",
      contextType: "contact",
      contextId: contact.id,
      contextTitle: contact.display_name,
    },
  };

  return (
    <section aria-labelledby="linked-contact-notes-title">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p id="linked-contact-notes-title" className="text-micro font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
          Gekoppelde notities {isLoading ? "" : `(${notes.length})`}
        </p>
        <ButtonLink href={newNoteHref} onClick={onNavigate} size="sm" variant="secondary">
          <Plus size={14} aria-hidden="true" /> Nieuwe notitie
        </ButtonLink>
      </div>

      {isLoading ? (
        <div role="status" aria-label="Gekoppelde notities laden" className="space-y-1.5">
          {[0, 1].map((item) => (
            <Skeleton key={item} className="h-12 border border-[var(--color-border)]" />
          ))}
        </div>
      ) : isError ? (
        <Surface tone="warning" radius="md" padding="sm" role="alert" className="flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-warning)]">Notities konden niet geladen worden.</p>
          <Button size="sm" onClick={onRetry}>
            <RefreshCw size={14} aria-hidden="true" /> Opnieuw
          </Button>
        </Surface>
      ) : sortedNotes.length === 0 ? (
        <Surface tone="subtle" radius="md" padding="sm" className="border-dashed text-center">
          <StickyNote size={18} className="mx-auto text-[var(--color-text-subtle)]" aria-hidden="true" />
          <p className="mt-1 text-xs text-[var(--color-text-subtle)]">Nog geen notities aan dit contact gekoppeld.</p>
        </Surface>
      ) : (
        <div className="max-h-72 space-y-1.5 overflow-y-auto pr-0.5">
          {sortedNotes.map((note) => {
            const title = masked ? "••••••" : note.titel || note.inhoud.split("\n")[0]?.slice(0, 70) || "Zonder titel";
            const status = note.isArchived || note.is_archived
              ? "Archief"
              : note.isCompleted || note.is_completed
                ? "Afgerond"
                : null;
            return (
              <ButtonLink
                key={note.id}
                variant="secondary"
                fullWidth
                href={`/notities?note=${encodeURIComponent(note.id)}`}
                onClick={onNavigate}
                aria-label={masked ? "Gekoppelde notitie openen" : `Gekoppelde notitie openen: ${title}`}
                className="group h-auto min-h-12 justify-start gap-2 px-3 py-2 text-left"
              >
                <StickyNote size={14} className="shrink-0 text-[var(--color-primary-hover)]" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--color-text)] group-hover:text-[var(--color-text)]">{title}</span>
                  <span className="block text-micro text-[var(--color-text-subtle)]">
                    Gewijzigd {formatRelative(note.gewijzigd)}{status ? ` · ${status}` : ""}
                  </span>
                </span>
                <ChevronRight size={14} className="shrink-0 text-[var(--color-text-subtle)] group-hover:text-[var(--color-primary-hover)]" aria-hidden="true" />
              </ButtonLink>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-micro font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">{children}</p>;
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
    const relationshipTypes = contact.relationship_types ?? [];
    const has = relationshipTypes.includes(value);
    const next = has ? relationshipTypes.filter((t) => t !== value) : [...relationshipTypes, value];
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
          const active = (contact.relationship_types ?? []).includes(t.value);
          return (
            <Button
              key={t.value}
              type="button"
              onClick={() => void toggle(t.value)}
              aria-pressed={active}
              variant={active ? "primary" : "secondary"}
              size="sm"
            >
              {t.label}
            </Button>
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
      setOpen(false);
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
      setOpen(false);
    } catch {
      toastError("Label toevoegen mislukt.");
    }
  };
  // On Enter, resolve the EXACT catalog match explicitly — never fall back to the
  // first substring suggestion (typing "werk" must not assign "Netwerk").
  const submitQuery = () => {
    if (q === "") return;
    const exact = labels.find((l) => l.name.toLowerCase() === q);
    if (exact) {
      if (!assignedIds.has(exact.id)) void assignExisting(exact.id);
      else {
        setQuery("");
        setOpen(false);
      }
    } else {
      void createAndAssign();
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
              style={labelColorStyle(l.color)}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-micro font-semibold ${labelChipClasses()}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${labelDotClasses()}`} />
              {l.name}
              <IconButton
                label={`${l.name} verwijderen`}
                icon={<X size={14} />}
                onClick={() => void detach(l.id)}
                className="ml-0.5 border-transparent bg-transparent"
              />
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Input
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
              submitQuery();
            }
          }}
          placeholder="Label toevoegen of maken…"
          aria-label="Label toevoegen"
          className="w-full"
        />
        {open && (suggestions.length > 0 || q !== "") && (
          <Surface tone="elevated" radius="sm" padding="xs" className="mt-1 max-h-56 w-full overflow-y-auto">
            {suggestions.map((l) => (
              <Button
                key={l.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void assignExisting(l.id)}
                className="flex w-full items-center justify-start gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-active)]"
              >
                <span style={labelColorStyle(l.color)} className={`h-2 w-2 rounded-full ${labelDotClasses()}`} />
                <span className="flex-1 truncate">{l.name}</span>
                {typeof l.contact_count === "number" && <span className="text-micro text-[var(--color-text-subtle)]">{l.contact_count}</span>}
              </Button>
            ))}
            {q !== "" && !exactExists && (
              <Button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void createAndAssign()}
                className="flex w-full items-center justify-start gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[var(--color-warning)] hover:bg-[var(--color-warning-subtle)]"
              >
                <Plus size={13} /> Nieuw label &quot;{query.trim()}&quot;
              </Button>
            )}
          </Surface>
        )}
      </div>
    </div>
  );
}

function OrganizationsEditor({
  contact,
  addOrganization,
  removeOrganization,
}: {
  contact: Contact;
  addOrganization: ContactMutations["addOrganization"];
  removeOrganization: ContactMutations["removeOrganization"];
}) {
  const { error: toastError } = useToast();
  const [adding, setAdding] = useState(false);
  const [companyQuery, setCompanyQuery] = useState("");
  const [selected, setSelected] = useState<{ id: string; naam: string } | null>(null);
  const [role, setRole] = useState("");
  const orgs = contact.organizations ?? [];

  const companiesQuery = useQuery({
    queryKey: laventeCareQueryKeys.companies.picker(companyQuery),
    queryFn: () => laventecareApi.listCompanies({ q: companyQuery || undefined, limit: 8 }),
    enabled: adding,
    staleTime: 30_000,
  });
  const companies = companiesQuery.data ?? [];

  const add = async () => {
    if (!selected) return;
    try {
      await addOrganization.mutateAsync({
        contactId: contact.id,
        data: { organization_id: selected.id, role: role.trim() || undefined },
      });
      setSelected(null);
      setCompanyQuery("");
      setRole("");
      setAdding(false);
    } catch {
      toastError("Bedrijf koppelen mislukt.");
    }
  };
  const detach = async (orgId: string) => {
    try {
      await removeOrganization.mutateAsync({ contactId: contact.id, orgId });
    } catch {
      toastError("Ontkoppelen mislukt.");
    }
  };

  return (
    <div>
      <SectionLabel>Bedrijven</SectionLabel>
      {orgs.length > 0 && (
        <div className="space-y-1.5">
          {orgs.map((o) => (
            <Surface key={o.id} tone="subtle" radius="sm" padding="xs" className="flex items-center gap-2">
              <Building2 size={13} className="shrink-0 text-[var(--color-info)]" />
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-text)]">
                {o.organization_name || "Onbekend bedrijf"}
              </span>
              {o.role && <span className="shrink-0 text-micro text-[var(--color-text-subtle)]">{o.role}</span>}
              {o.source === "manual" ? (
                <IconButton
                  label="Bedrijf ontkoppelen"
                  icon={<Trash2 size={16} />}
                  variant="danger"
                  onClick={() => void detach(o.id)}
                />
              ) : (
                <span className="shrink-0 text-micro font-semibold text-[var(--color-info)]" title="Beheerd in LaventeCare">
                  LC
                </span>
              )}
            </Surface>
          ))}
        </div>
      )}
      {adding ? (
        <div className="mt-2 space-y-1.5">
          <div className="relative">
            <Input
              type="text"
              value={selected ? selected.naam : companyQuery}
              onChange={(e) => {
                setSelected(null);
                setCompanyQuery(e.target.value);
              }}
              placeholder="Zoek bedrijf…"
              aria-label="Bedrijf zoeken"
              className="w-full"
            />
            {!selected && companyQuery.trim() !== "" && companies.length > 0 && (
              <Surface tone="elevated" radius="sm" padding="xs" className="mt-1 max-h-48 w-full overflow-y-auto">
                {companies.map((co) => (
                  <Button
                    key={co.id}
                    type="button"
                    onClick={() => setSelected({ id: co.id, naam: co.naam })}
                    className="flex w-full items-center justify-start gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-active)]"
                  >
                    <Building2 size={12} className="text-[var(--color-info)]" />
                    <span className="truncate">{co.naam}</span>
                  </Button>
                ))}
              </Surface>
            )}
          </div>
          <div className="flex gap-1.5">
            <Input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="rol (optioneel)"
              aria-label="Rol"
              className="min-w-0 flex-1"
            />
            <Button
              type="button"
              onClick={() => void add()}
              disabled={!selected}
              variant="primary" size="sm"
            >
              Koppel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setAdding(false);
                setSelected(null);
                setCompanyQuery("");
              }}
              variant="ghost"
              size="sm"
            >
              Annuleren
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          onClick={() => setAdding(true)}
          variant="secondary"
          size="sm"
          className="mt-2"
        >
          <Plus size={13} /> Bedrijf koppelen
        </Button>
      )}
    </div>
  );
}

function MergeContactPicker({
  currentId,
  onClose,
  onPick,
}: {
  currentId: string;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const { contacts } = useContacten({ includeArchived: true });
  const { openConfirm } = useConfirm();
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const results = contacts
    .filter(
      (c) =>
        c.id !== currentId &&
        (query === "" ||
          c.display_name.toLowerCase().includes(query) ||
          (c.email ?? "").toLowerCase().includes(query)),
    )
    .slice(0, 30);

  const pick = async (c: Contact) => {
    const ok = await openConfirm({
      title: "Contacten samenvoegen?",
      message: `"${c.display_name}" wordt samengevoegd in dit contact en verdwijnt als los contact. Labels, datums, feiten, kanalen, interacties en bedrijfskoppelingen gaan mee.`,
      confirmLabel: "Samenvoegen",
    });
    if (ok) onPick(c.id);
  };

  return (
    <ModalShell title="Samenvoegen met…" onClose={onClose}>
      <div className="space-y-2">
        <Input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Zoek het contact om samen te voegen…"
          aria-label="Zoek contact"
          autoFocus
          className="w-full"
        />
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {results.map((c) => (
            <Button
              key={c.id}
              type="button"
              onClick={() => void pick(c)}
              variant="secondary"
              fullWidth
              className="h-auto justify-start gap-2 px-3 py-2 text-left"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--color-warning-border)] bg-[var(--color-warning-subtle)] text-xs font-bold uppercase text-[var(--color-warning)]">
                {c.display_name.trim().charAt(0) || "?"}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-text)]">{c.display_name}</span>
              {c.source === "laventecare" && <Building2 size={12} className="shrink-0 text-[var(--color-info)]" />}
            </Button>
          ))}
          {results.length === 0 && <p className="px-1 py-2 text-xs text-[var(--color-text-subtle)]">Geen contacten gevonden.</p>}
        </div>
      </div>
    </ModalShell>
  );
}

function ChannelsSection({
  contact,
  addChannel,
  deleteChannel,
  updateChannel,
}: {
  contact: Contact;
  addChannel: ContactMutations["addChannel"];
  deleteChannel: ContactMutations["deleteChannel"];
  updateChannel: ContactMutations["updateChannel"];
}) {
  const { error: toastError } = useToast();
  const [kind, setKind] = useState("email");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  // Hide extra channels whose value duplicates the primary email/phone already
  // shown above, so the same address doesn't appear twice.
  const primaries = new Set(
    [contact.email, contact.phone].filter(Boolean).map((v) => v!.trim().toLowerCase()),
  );
  const channels = (contact.channels ?? []).filter((ch) => !primaries.has(ch.value.trim().toLowerCase()));

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
  const makePrimary = async (channelId: string) => {
    try {
      await updateChannel.mutateAsync({ contactId: contact.id, channelId, data: { is_primary: true } });
    } catch {
      toastError("Primair maken mislukt.");
    }
  };

  return (
    <div>
      <SectionLabel>Extra contactgegevens</SectionLabel>
      {channels.length > 0 && (
        <div className="space-y-1.5">
          {channels.map((ch) => (
            <Surface key={ch.id} tone="subtle" radius="sm" padding="xs" className="flex items-center gap-2">
              {ch.kind === "phone" ? (
                <Phone size={13} className="shrink-0 text-[var(--color-success)]" />
              ) : ch.kind === "email" ? (
                <Mail size={13} className="shrink-0 text-[var(--color-info)]" />
              ) : (
                <Tag size={13} className="shrink-0 text-[var(--color-text-muted)]" />
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-text)]">{ch.value}</span>
              {ch.label && <span className="shrink-0 text-micro text-[var(--color-text-subtle)]">{ch.label}</span>}
              <IconButton
                label={ch.is_primary ? "Primair kanaal" : "Maak primair"}
                icon={<Star size={16} fill={ch.is_primary ? "currentColor" : "none"} />}
                variant={ch.is_primary ? "primary" : "ghost"}
                onClick={() => void makePrimary(ch.id)}
                disabled={ch.is_primary}
              />
              <IconButton
                label="Kanaal verwijderen"
                icon={<Trash2 size={16} />}
                variant="danger"
                onClick={() => void remove(ch.id)}
              />
            </Surface>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          aria-label="Soort kanaal"
          className="w-auto"
        >
          <option value="email">E-mail</option>
          <option value="phone">Telefoon</option>
          <option value="other">Anders</option>
        </Select>
        <Input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="waarde"
          aria-label="Waarde"
          className="min-w-0 flex-1"
        />
        <Input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="label?"
          aria-label="Kanaal-label"
          className="w-24"
        />
        <Button
          type="button"
          onClick={() => void submit()}
          variant="primary" size="sm"
        >
          Toevoegen
        </Button>
      </div>
    </div>
  );
}

const INTERACTION_KINDS = [
  { value: "call", label: "Gebeld" },
  { value: "meeting", label: "Afspraak" },
  { value: "message", label: "Bericht" },
  { value: "email", label: "E-mail" },
  { value: "note", label: "Memo" },
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
        <p className="mb-2 flex items-center gap-1.5 text-xs text-[var(--color-text-subtle)]">
          <Clock size={12} /> Laatst gesproken {formatRelative(contact.last_contacted_at)}
        </p>
      )}
      {interactions.length > 0 && (
        <div className="space-y-1.5">
          {interactions.map((it) => (
            <Surface key={it.id} tone="subtle" radius="sm" padding="xs" className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 rounded-md border border-[var(--color-border)] px-1.5 py-0.5 text-micro font-semibold text-[var(--color-text-muted)]">
                {interactionKindLabel(it.kind)}
              </span>
              <span className="min-w-0 flex-1 text-sm text-[var(--color-text)]">
                {it.summary || <span className="text-[var(--color-text-subtle)]">geen memo</span>}
                <span className="ml-1.5 text-micro text-[var(--color-text-subtle)]">{formatRelative(it.occurred_at)}</span>
              </span>
              <IconButton
                label="Contactmoment verwijderen"
                icon={<Trash2 size={16} />}
                variant="danger"
                onClick={() => void remove(it.id)}
              />
            </Surface>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          aria-label="Soort contact"
          className="w-auto"
        >
          {INTERACTION_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </Select>
        <Input
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder="korte memo (optioneel)"
          aria-label="Memo"
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          onClick={() => void submit()}
          variant="success" size="sm"
        >
          Log
        </Button>
      </div>
    </div>
  );
}

// ─── Label catalog manager ───────────────────────────────────────────────────

function ColorDot({ color, onClick }: { color: string; onClick: () => void }) {
  return (
    <IconButton
      label="Kleur kiezen"
      icon={<span style={labelColorStyle(color)} className={`h-6 w-6 rounded-full border border-[var(--color-border)] ${labelDotClasses()}`} />}
      onClick={onClick}
      className="rounded-full border-transparent bg-transparent"
    />
  );
}

// Rendered in-flow (below its row) rather than absolutely positioned, so the
// lower swatches are never clipped by the modal's overflow-y-auto scroll box.
function PalettePicker({ onPick }: { onPick: (c: string) => void }) {
  return (
    <Surface tone="subtle" radius="sm" padding="xs" className="mt-1.5 flex flex-wrap gap-1.5">
      {LABEL_COLOR_KEYS.map((color) => (
        <IconButton
          key={color}
          label={`Kleur ${color}`}
          icon={<span style={labelColorStyle(color)} className={`h-6 w-6 rounded-full border border-[var(--color-border)] ${labelDotClasses()}`} />}
          onClick={() => onPick(color)}
          className="rounded-full border-transparent bg-transparent hover:ring-2 hover:ring-[var(--color-border-strong)]"
        />
      ))}
    </Surface>
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
  // Returns false when the rename was rejected (e.g. 409 name-taken) so the caller
  // can restore the input, which is uncontrolled and would otherwise keep the
  // rejected text while the chips/DB show the real name.
  const rename = async (l: ContactLabel, name: string): Promise<boolean> => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === l.name) return true;
    try {
      await updateLabel.mutateAsync({ labelId: l.id, data: { name: trimmed } });
      return true;
    } catch {
      toastError("Hernoemen mislukt (bestaat de naam al?).");
      return false;
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
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <ColorDot color={newColor} onClick={() => setColorEditId(colorEditId === "__new" ? null : "__new")} />
            <Input
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
              className="min-w-0 flex-1"
            />
            <Button
              type="button"
              onClick={() => void create()}
              variant="primary" size="sm"
            >
              Maak
            </Button>
          </div>
          {colorEditId === "__new" && (
            <PalettePicker
              onPick={(c) => {
                setNewColor(c);
                setColorEditId(null);
              }}
            />
          )}
        </div>

        {mergeFrom && (
          <Surface tone="warning" radius="sm" padding="sm" className="text-xs text-[var(--color-warning)]">
            Kies hieronder waarmee je <span className="font-semibold">{mergeFrom.name}</span> wilt samenvoegen.{" "}
            <Button size="sm" variant="ghost" onClick={() => setMergeFrom(null)} className="ml-1 underline">
              annuleren
            </Button>
          </Surface>
        )}

        {isLoading ? (
          <p className="text-xs text-[var(--color-text-subtle)]">laden…</p>
        ) : labels.length === 0 ? (
          <p className="text-sm text-[var(--color-text-subtle)]">Nog geen labels. Maak er hierboven een aan.</p>
        ) : (
          <div className="space-y-1.5">
            {labels.map((l) => (
              <Surface key={l.id} tone="subtle" radius="sm" padding="xs">
                <div className="flex items-center gap-2">
                  <ColorDot color={l.color} onClick={() => setColorEditId(colorEditId === l.id ? null : l.id)} />
                  <Input
                    key={`${l.id}:${l.name}`}
                    defaultValue={l.name}
                    onBlur={async (e) => {
                      const el = e.target;
                      if (!(await rename(l, el.value))) el.value = l.name;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                    aria-label="Labelnaam"
                    className="min-w-0 flex-1 border-transparent bg-transparent shadow-none"
                  />
                  <span className="shrink-0 text-micro text-[var(--color-text-subtle)]">{l.contact_count ?? 0}</span>
                  {mergeFrom ? (
                    mergeFrom.id !== l.id && (
                      <Button
                        type="button"
                        onClick={() => void doMerge(l)}
                        variant="warning" size="sm"
                      >
                        → hierheen
                      </Button>
                    )
                  ) : (
                    <>
                      <IconButton
                        label="Samenvoegen met…"
                        icon={<GitMerge size={16} />}
                        variant="warning"
                        onClick={() => setMergeFrom(l)}
                      />
                      <IconButton
                        label="Label verwijderen"
                        icon={<Trash2 size={16} />}
                        variant="danger"
                        onClick={() => void del(l)}
                      />
                    </>
                  )}
                </div>
                {colorEditId === l.id && <PalettePicker onPick={(c) => void recolor(l, c)} />}
              </Surface>
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
            <Surface key={c.id} tone="subtle" radius="sm" padding="sm">
              <div className="flex items-center gap-2">
                <MessageCircle size={14} className="shrink-0 text-[var(--color-success)]" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--color-text)]">{c.chat_name}</span>
                <span className="shrink-0 text-micro text-[var(--color-text-subtle)]">{c.message_count} berichten</span>
              </div>
              {summaryFor(c.id) && <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">{summaryFor(c.id)}</p>}
            </Surface>
          ))}
        </div>
      )}
      <label className={cn(buttonVariants({ variant: "success", size: "sm" }), "mt-2 cursor-pointer")}>
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
      <p className="mt-1 text-micro leading-4 text-[var(--color-text-subtle)]">
        Exporteer een chat in WhatsApp (zonder media) en kies het .txt-bestand. Alleen een samenvatting gaat naar de AI; de
        berichten blijven lokaal.
      </p>
    </div>
  );
}
