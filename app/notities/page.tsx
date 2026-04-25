"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Archive,
  ArrowDownAZ,
  ArrowUpDown,
  CalendarClock,
  Clock3,
  Eye,
  EyeOff,
  FolderOpen,
  Hash,
  LayoutGrid,
  ListChecks,
  NotebookPen,
  Pin,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Tag,
  X,
  type LucideIcon,
} from "lucide-react";
import { useNotes, type NoteCreateData, type NoteRecord } from "@/hooks/useNotes";
import { usePrivacy } from "@/hooks/usePrivacy";
import { NoteCard } from "@/components/notes/NoteCard";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

type ViewMode = "active" | "archived";
type SortMode = "recent" | "oldest" | "title" | "deadline";
type Tone = "amber" | "green" | "rose" | "sky" | "indigo" | "slate";

const SORT_OPTIONS: Array<{ id: SortMode; label: string; icon: LucideIcon }> = [
  { id: "recent", label: "Nieuwst", icon: ArrowUpDown },
  { id: "oldest", label: "Oudst", icon: Clock3 },
  { id: "title", label: "A-Z", icon: ArrowDownAZ },
  { id: "deadline", label: "Deadline", icon: CalendarClock },
];

const toneClasses: Record<Tone, { border: string; surface: string; icon: string; text: string }> = {
  amber: {
    border: "border-amber-500/25",
    surface: "bg-amber-500/10",
    icon: "text-amber-300",
    text: "text-amber-200",
  },
  green: {
    border: "border-emerald-500/20",
    surface: "bg-emerald-500/10",
    icon: "text-emerald-300",
    text: "text-emerald-200",
  },
  rose: {
    border: "border-rose-500/20",
    surface: "bg-rose-500/10",
    icon: "text-rose-300",
    text: "text-rose-200",
  },
  sky: {
    border: "border-sky-500/20",
    surface: "bg-sky-500/10",
    icon: "text-sky-300",
    text: "text-sky-200",
  },
  indigo: {
    border: "border-indigo-500/20",
    surface: "bg-indigo-500/10",
    icon: "text-indigo-300",
    text: "text-indigo-200",
  },
  slate: {
    border: "border-white/10",
    surface: "bg-white/[0.04]",
    icon: "text-slate-300",
    text: "text-slate-200",
  },
};

function MetricTile({
  icon: Icon,
  label,
  value,
  meta,
  tone = "slate",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  meta: string;
  tone?: Tone;
}) {
  const toneClass = toneClasses[tone];

  return (
    <div className={cn("rounded-lg border bg-white/[0.035] p-4", toneClass.border)}>
      <div className="flex items-start gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", toneClass.surface)}>
          <Icon size={18} className={toneClass.icon} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
          <p className={cn("mt-2 truncate text-2xl font-bold leading-tight", toneClass.text)}>{value}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{meta}</p>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
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
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
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

function SegmentedButton({
  active,
  icon: Icon,
  children,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
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
          : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
      )}
    >
      <Icon size={15} />
      {children}
    </button>
  );
}

function formatDate(iso?: string) {
  if (!iso) return "Geen datum";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Onbekend";
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

function getChecklistInfo(text: string) {
  const lines = text.split("\n");
  const total = lines.filter((line) => /^- \[[ x]\] /i.test(line)).length;
  const done = lines.filter((line) => /^- \[x\] /i.test(line)).length;
  return { total, done };
}

function getDisplayTitle(note: NoteRecord) {
  return note.titel || note.inhoud.slice(0, 50) || "Zonder titel";
}

function tagLabel(tag: string, index: number, masked: boolean) {
  return masked ? `Tag ${index + 1}` : tag;
}

export default function NotitiesPage() {
  const {
    notes,
    archived,
    pinned,
    allTags,
    isLoading,
    count,
    create,
    update,
    togglePin,
    archive,
    remove,
  } = useNotes();
  const { hidden: privacyOn, toggle: togglePrivacy } = usePrivacy("notes");

  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editNote, setEditNote] = useState<NoteRecord | null>(null);
  const [nowMs, setNowMs] = useState<number | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updateNow = () => setNowMs(Date.now());
    updateNow();
    const interval = window.setInterval(updateNow, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        setEditNote(null);
        setEditorOpen(true);
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const sourceNotes = viewMode === "active" ? notes : archived;

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const note of sourceNotes) {
      for (const tag of note.tags ?? []) {
        map.set(tag, (map.get(tag) ?? 0) + 1);
      }
    }
    return map;
  }, [sourceNotes]);

  const displayed = useMemo(() => {
    let list = [...sourceNotes];

    if (tagFilter) {
      list = list.filter((note) => (note.tags ?? []).includes(tagFilter));
    }

    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter((note) => {
        const haystack = `${note.titel ?? ""} ${note.inhoud} ${(note.tags ?? []).join(" ")}`.toLowerCase();
        return haystack.includes(query);
      });
    }

    list.sort((a, b) => {
      if (viewMode === "active" && a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;

      switch (sortMode) {
        case "oldest":
          return a.gewijzigd.localeCompare(b.gewijzigd);
        case "title":
          return getDisplayTitle(a).localeCompare(getDisplayTitle(b), "nl");
        case "deadline": {
          const aDeadline = a.deadline ?? "";
          const bDeadline = b.deadline ?? "";
          if (aDeadline && !bDeadline) return -1;
          if (!aDeadline && bDeadline) return 1;
          if (aDeadline && bDeadline) return aDeadline.localeCompare(bDeadline);
          return b.gewijzigd.localeCompare(a.gewijzigd);
        }
        default:
          return b.gewijzigd.localeCompare(a.gewijzigd);
      }
    });

    return list;
  }, [search, sortMode, sourceNotes, tagFilter, viewMode]);

  const checklistStats = useMemo(() => {
    return notes.reduce(
      (total, note) => {
        const info = getChecklistInfo(note.inhoud);
        total.done += info.done;
        total.total += info.total;
        return total;
      },
      { done: 0, total: 0 }
    );
  }, [notes]);

  const deadlineStats = useMemo(() => {
    if (!nowMs) return { overdue: 0, soon: 0, next: null as NoteRecord | null };
    const week = nowMs + 7 * 24 * 60 * 60 * 1000;
    const withDeadline = notes
      .filter((note) => note.deadline)
      .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""));

    return {
      overdue: withDeadline.filter((note) => new Date(note.deadline as string).getTime() < nowMs).length,
      soon: withDeadline.filter((note) => {
        const time = new Date(note.deadline as string).getTime();
        return time >= nowMs && time <= week;
      }).length,
      next: withDeadline.find((note) => new Date(note.deadline as string).getTime() >= nowMs) ?? null,
    };
  }, [notes, nowMs]);

  const highPriorityCount = notes.filter((note) => note.prioriteit === "hoog").length;
  const linkedCount = notes.filter((note) => note.linkedEventId).length;
  const totalCount = notes.length + archived.length;
  const activeFilters = [search.trim(), tagFilter, viewMode === "archived", sortMode !== "recent"].filter(Boolean).length;
  const activeSort = SORT_OPTIONS.find((option) => option.id === sortMode) ?? SORT_OPTIONS[0];

  const handleEdit = (note: NoteRecord) => {
    setEditNote(note);
    setEditorOpen(true);
  };

  const handleNew = () => {
    setEditNote(null);
    setEditorOpen(true);
  };

  const handleSave = async (data: NoteCreateData) => {
    if (editNote) {
      await update(editNote._id, data);
    } else {
      await create(data);
    }
  };

  const handleDelete = (id: Id<"notes">) => {
    if (confirm("Notitie permanent verwijderen?")) {
      remove(id);
    }
  };

  const handleUpdateContent = async (id: Id<"notes">, inhoud: string) => {
    await update(id, { inhoud });
  };

  const handleNavigateToNote = (title: string) => {
    setViewMode("active");
    setTagFilter(null);
    setSearch(title);
    searchRef.current?.focus();
  };

  const clearFilters = () => {
    setSearch("");
    setTagFilter(null);
    setSortMode("recent");
    setViewMode("active");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-28 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10">
              <StickyNote size={20} className="text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-slate-500">Knowledge base</p>
              <h1 className="mt-1 truncate text-2xl font-bold text-white">Notities</h1>
              <p className="mt-1 text-sm text-slate-500">
                {isLoading
                  ? "Notities laden"
                  : `${count} actief - ${archived.length} archief - ${pinned.length} vastgezet`}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={togglePrivacy}
              title={privacyOn ? "Notities tonen" : "Notities verbergen"}
              aria-label={privacyOn ? "Notities tonen" : "Notities verbergen"}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
                privacyOn
                  ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-200"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
              )}
            >
              {privacyOn ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className="hidden sm:inline">{privacyOn ? "Verborgen" : "Zichtbaar"}</span>
            </button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={handleNew}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Nieuw</span>
            </motion.button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <SectionTitle
              icon={Search}
              title="Zoeken en ordenen"
              subtitle={
                activeFilters > 0
                  ? `${activeFilters} actieve instelling(en)`
                  : "Actieve notities, archief, tags en sortering"
              }
              action={
                activeFilters > 0 ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.06]"
                  >
                    <RotateCcw size={14} />
                    Reset
                  </button>
                ) : null
              }
            />

            <div className="mt-5 grid gap-4">
              <div className="flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3">
                <Search size={16} className="shrink-0 text-slate-500" />
                <input
                  ref={searchRef}
                  type="search"
                  placeholder="Zoek in notities..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Zoekterm wissen"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-300"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <SegmentedButton active={viewMode === "active"} icon={LayoutGrid} onClick={() => setViewMode("active")}>
                  Actief <span className="text-xs opacity-70">{notes.length}</span>
                </SegmentedButton>
                <SegmentedButton active={viewMode === "archived"} icon={Archive} onClick={() => setViewMode("archived")}>
                  Archief <span className="text-xs opacity-70">{archived.length}</span>
                </SegmentedButton>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {SORT_OPTIONS.map((option) => (
                  <SegmentedButton
                    key={option.id}
                    active={sortMode === option.id}
                    icon={option.icon}
                    onClick={() => setSortMode(option.id)}
                  >
                    {option.label}
                  </SegmentedButton>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <SectionTitle icon={ShieldCheck} title="Signalen" subtitle="Context voor je huidige notities" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <MetricTile
                icon={Pin}
                label="Vastgezet"
                value={`${pinned.length}`}
                meta={pinned.length === 1 ? "Belangrijke notitie bovenaan" : "Belangrijke notities bovenaan"}
                tone={pinned.length > 0 ? "amber" : "slate"}
              />
              <MetricTile
                icon={AlertTriangle}
                label="Aandacht"
                value={`${deadlineStats.overdue + highPriorityCount}`}
                meta={`${deadlineStats.overdue} verlopen - ${highPriorityCount} hoge prioriteit`}
                tone={deadlineStats.overdue + highPriorityCount > 0 ? "rose" : "green"}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            icon={StickyNote}
            label="Totaal"
            value={`${totalCount}`}
            meta={`${notes.length} actief, ${archived.length} gearchiveerd`}
            tone="amber"
          />
          <MetricTile
            icon={ListChecks}
            label="Checklists"
            value={`${checklistStats.done}/${checklistStats.total}`}
            meta={checklistStats.total > 0 ? "Afgevinkte items in actieve notities" : "Geen checklist-items actief"}
            tone={checklistStats.total > 0 && checklistStats.done === checklistStats.total ? "green" : "sky"}
          />
          <MetricTile
            icon={CalendarClock}
            label="Deadlines"
            value={`${deadlineStats.soon}`}
            meta={deadlineStats.next ? `Volgende: ${formatDate(deadlineStats.next.deadline)}` : "Geen aankomende deadlines"}
            tone={deadlineStats.overdue > 0 ? "rose" : deadlineStats.soon > 0 ? "amber" : "slate"}
          />
          <MetricTile
            icon={Hash}
            label="Tags"
            value={`${allTags.length}`}
            meta={linkedCount > 0 ? `${linkedCount} gekoppeld aan agenda` : "Labels voor snelle selectie"}
            tone="indigo"
          />
        </section>

        {allTags.length > 0 && (
          <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <SectionTitle
              icon={Tag}
              title="Tags"
              subtitle={tagFilter ? `Filter actief: ${privacyOn ? "verborgen tag" : tagFilter}` : "Klik een tag om te filteren"}
              action={
                tagFilter ? (
                  <button
                    type="button"
                    onClick={() => setTagFilter(null)}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.06]"
                  >
                    <X size={14} />
                    Wissen
                  </button>
                ) : null
              }
            />
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setTagFilter(null)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
                  !tagFilter
                    ? "border-amber-500/35 bg-amber-500/15 text-amber-200"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                )}
              >
                <FolderOpen size={14} />
                Alle
              </button>
              {allTags.map((tag, index) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
                    tagFilter === tag
                      ? "border-amber-500/35 bg-amber-500/15 text-amber-200"
                      : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                  )}
                >
                  <Tag size={13} />
                  {tagLabel(tag, index, privacyOn)}
                  <span className="text-xs opacity-60">{tagCounts.get(tag) ?? 0}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <SectionTitle
            icon={NotebookPen}
            title={viewMode === "active" ? "Actieve notities" : "Archief"}
            subtitle={
              isLoading
                ? "Laden..."
                : `${displayed.length} zichtbaar - sortering: ${activeSort.label.toLowerCase()}`
            }
            action={
              <button
                type="button"
                onClick={handleNew}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20"
              >
                <Plus size={16} />
                Nieuwe notitie
              </button>
            }
          />

          {isLoading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="mt-5 flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 py-12 text-center">
              <Sparkles size={34} className="text-slate-700" />
              <p className="mt-4 font-semibold text-slate-200">
                {search || tagFilter ? "Geen notities gevonden" : "Nog geen notities"}
              </p>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                {search || tagFilter
                  ? "Pas je zoekterm of tagfilter aan om meer notities te zien."
                  : "Maak je eerste notitie en leg losse gedachten meteen vast."}
              </p>
              {search || tagFilter ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.06]"
                >
                  <RotateCcw size={14} />
                  Filters wissen
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNew}
                  className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20"
                >
                  <Plus size={14} />
                  Eerste notitie maken
                </button>
              )}
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {displayed.map((note) => (
                  <NoteCard
                    key={note._id}
                    note={note}
                    onEdit={handleEdit}
                    onTogglePin={togglePin}
                    onArchive={archive}
                    onDelete={handleDelete}
                    onUpdateContent={handleUpdateContent}
                    onNavigateToNote={handleNavigateToNote}
                    masked={privacyOn}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </main>

      <AnimatePresence>
        {editorOpen && (
          <NoteEditor
            note={editNote}
            onSave={handleSave}
            onClose={() => {
              setEditorOpen(false);
              setEditNote(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
