"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CalendarDays,
  FileText,
  ListChecks,
  Loader2,
  Pin,
  Plus,
  RefreshCw,
  Zap,
} from "lucide-react";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { useSchedule } from "@/hooks/useSchedule";
import { useNotes, type NoteCreateData, type NoteRecord } from "@/hooks/useNotes";
import { syncApi, type SyncStatusResult } from "@/lib/api";
import { getHistory as getDienstHistory, type DienstRow } from "@/lib/schedule";
import {
  getDisplayEndDate,
  usePersonalEvents,
  type PersonalEvent,
} from "@/hooks/usePersonalEvents";
import { PersonalEventItem } from "@/components/schedule/PersonalEventItem";
import { CreateEventModal } from "@/components/schedule/CreateEventModal";
import { AgendaCalendar } from "@/components/schedule/AgendaCalendar";
import { NextShiftCard } from "@/components/schedule/NextShiftCard";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { getDisplayTitle } from "@/components/notes/NotesUtils";
import { groupNotesByDate, groupNotesByEventId } from "@/components/notes/NoteAgendaUtils";
import { useToast } from "@/components/ui/Toast";
import { businessContextFromEvent, contextTagsFromEvent, mergeTags, type BusinessContextValue } from "@/lib/workspace-context";

import {
  getAmsterdamTodayIso,
  addDaysIso,
  formatDateLabel,
  formatDateTime,
  eventCoversDate,
  errorMessage,
} from "@/components/schedule/AgendaUtils";
import {
  Panel,
  EmptyState,
  StatusPill,
  NextEventCard,
  TimelineDay,
} from "@/components/schedule/AgendaCards";
import { StatChip } from "@/components/ui/StatChip";

type AgendaView = "today" | "upcoming" | "pending" | "history";
type CalendarMode = "month" | "week";

const HISTORY_RENDER_LIMIT = 60;

type TimelineGroup = {
  date: string;
  label: string;
  isToday: boolean;
  events: PersonalEvent[];
};

function sortByStart(a: PersonalEvent, b: PersonalEvent) {
  return `${a.startTijd || "00:00"}-${a.titel}`.localeCompare(`${b.startTijd || "00:00"}-${b.titel}`);
}

function dienstToTimelineEvent(dienst: DienstRow): PersonalEvent {
  const title = dienst.titel || dienst.shiftType || "Dienst";
  const endDate = dienst.eindDatum || dienst.startDatum;
  return {
    _id: dienst.eventId,
    userId: "",
    eventId: dienst.eventId,
    titel: title,
    startDatum: dienst.startDatum,
    startTijd: dienst.startTijd || undefined,
    eindDatum: endDate,
    eindTijd: dienst.eindTijd || undefined,
    heledag: dienst.heledag,
    locatie: dienst.locatie || undefined,
    beschrijving: dienst.beschrijving || undefined,
    symbol: "schedule",
    status: dienst.status === "Gedraaid" ? "Voorbij" : dienst.status === "VERWIJDERD" ? "VERWIJDERD" : "Aankomend",
    kalender: "Rooster",
    shiftType: dienst.shiftType,
    team: dienst.team,
  };
}

function mergeTimelineEvents(...groups: PersonalEvent[][]): PersonalEvent[] {
  const byId = new Map<string, PersonalEvent>();
  for (const group of groups) {
    for (const event of group) {
      const key = `${event.kalender}:${event.eventId}`;
      if (!byId.has(key)) byId.set(key, event);
    }
  }
  return Array.from(byId.values()).sort((a, b) => (
    `${a.startDatum || "9999-12-31"}T${a.startTijd || "00:00"}`.localeCompare(`${b.startDatum || "9999-12-31"}T${b.startTijd || "00:00"}`) ||
    a.titel.localeCompare(b.titel)
  ));
}

function splitEventCounts(events: PersonalEvent[]) {
  let appointments = 0;
  let shifts = 0;
  for (const event of events) {
    if (event.kalender === "Rooster") shifts += 1;
    else appointments += 1;
  }
  return { appointments, shifts };
}

function formatSplitCounts(events: PersonalEvent[]) {
  const { appointments, shifts } = splitEventCounts(events);
  const parts = [];
  if (appointments > 0) parts.push(`${appointments} ${appointments === 1 ? "afspraak" : "afspraken"}`);
  if (shifts > 0) parts.push(`${shifts} ${shifts === 1 ? "dienst" : "diensten"}`);
  return parts.length > 0 ? parts.join(" · ") : "geen items";
}

function groupByDate(events: PersonalEvent[], todayIso: string, direction: "asc" | "desc" = "asc", forcedDate?: string): TimelineGroup[] {
  const groups = new Map<string, PersonalEvent[]>();
  for (const event of events) {
    // The "today" view passes forcedDate to gather everything under today; other
    // views key by the event's real start date (clamping ongoing events onto
    // today there made them look duplicated against the calendar).
    const key = forcedDate ?? event.startDatum;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(event);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => direction === "asc" ? a.localeCompare(b) : b.localeCompare(a))
    .map(([date, groupEvents]) => ({
      date,
      label: formatDateLabel(date),
      isToday: date === todayIso,
      events: [...groupEvents].sort(sortByStart),
    }));
}

function viewEmptyCopy(view: AgendaView) {
  switch (view) {
    case "today":
      return { title: "Vandaag geen afspraken", text: "Je dag is vrij." };
    case "pending":
      return { title: "Geen wachtrij", text: "Alles is verwerkt." };
    case "history":
      return { title: "Geen historie", text: "Er zijn nog geen afgeronde afspraken." };
    default:
      return { title: "Geen aankomende afspraken", text: "Je agenda is rustig." };
  }
}

export default function AgendaPage() {
  const { user } = useUser();
  const { success, error: toastError, toast } = useToast();
  const {
    diensten,
    nextDienst,
    upcoming: upcomingDiensten,
    isLoading: scheduleLoading,
    refetch: refetchDiensten,
  } = useSchedule();
  const {
    active: activeNotes,
    create: createNote,
    update: updateNote,
    remove: removeNote,
    archive: archiveNote,
    togglePin: togglePinNote,
    toggleComplete: toggleCompleteNote,
    revisions: noteRevisions,
    restoreRevision: restoreNoteRevision,
  } = useNotes();
  const {
    events: agendaEvents,
    upcoming,
    pending,
    history,
    eventsByDate,
    withConflicts,
    conflictMap,
    nextAppointment,
    error: agendaError,
    isLoading,
    refetch: refetchEvents,
  } = usePersonalEvents({ diensten });

  const { data: syncStatuses } = useQuery<SyncStatusResult>({
    queryKey: ["sync-status"],
    queryFn: () => syncApi.status(),
    refetchInterval: 10000,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<PersonalEvent | null>(null);
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [editNote, setEditNote] = useState<NoteRecord | null>(null);
  const [noteDefaults, setNoteDefaults] = useState<{
    deadline?: string;
    linkedEventId?: string;
    tags?: string[];
    title?: string;
    businessContext?: BusinessContextValue | null;
  }>({});
  const [eventInitialDate, setEventInitialDate] = useState<string | undefined>();
  const [eventInitialTime, setEventInitialTime] = useState<string | undefined>();
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<AgendaView>("today");

  const todayIso = getAmsterdamTodayIso();
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("month");
  const [calendarCursorDate, setCalendarCursorDate] = useState(todayIso);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(todayIso);
  const monthEndIso = addDaysIso(todayIso, 30);
  const syncStatus = syncStatuses?.personal;

  // ─── Computed data ──────────────────────────────────────────────────────

  const upcomingDienstEvents = useMemo(
    () => upcomingDiensten.map(dienstToTimelineEvent),
    [upcomingDiensten],
  );
  const allDienstEvents = useMemo(
    () => diensten.map(dienstToTimelineEvent),
    [diensten],
  );
  const historyDienstEvents = useMemo(
    () => getDienstHistory(diensten, 30).map(dienstToTimelineEvent),
    [diensten],
  );

  const todayEvents = useMemo(
    () => upcoming.filter((e) => eventCoversDate(e, todayIso)),
    [todayIso, upcoming],
  );
  const todayDienstEvents = useMemo(
    () => upcomingDienstEvents.filter((event) => eventCoversDate(event, todayIso)),
    [todayIso, upcomingDienstEvents],
  );
  const todayTimelineEvents = useMemo(
    () => mergeTimelineEvents(todayDienstEvents, todayEvents),
    [todayDienstEvents, todayEvents],
  );
  const upcomingTimelineEvents = useMemo(
    () => mergeTimelineEvents(upcomingDienstEvents, upcoming),
    [upcomingDienstEvents, upcoming],
  );
  const historyTimelineEvents = useMemo(
    () => mergeTimelineEvents(history, historyDienstEvents).sort((a, b) => (
      `${getDisplayEndDate(b) || b.startDatum || "0000-00-00"}T${b.eindTijd || "23:59"}`.localeCompare(`${getDisplayEndDate(a) || a.startDatum || "0000-00-00"}T${a.eindTijd || "23:59"}`) ||
      b.titel.localeCompare(a.titel)
    )),
    [history, historyDienstEvents],
  );
  const notesByDate = useMemo(() => groupNotesByDate(activeNotes), [activeNotes]);
  const notesByEventId = useMemo(() => groupNotesByEventId(activeNotes), [activeNotes]);
  const todayNotes = notesByDate.get(todayIso) ?? [];

  const monthEvents = useMemo(
    () => upcomingTimelineEvents.filter((e) => getDisplayEndDate(e) >= todayIso && e.startDatum <= monthEndIso),
    [monthEndIso, todayIso, upcomingTimelineEvents],
  );

  const noteEventOptions = useMemo(
    () => mergeTimelineEvents(agendaEvents, upcomingDienstEvents, historyDienstEvents),
    [agendaEvents, historyDienstEvents, upcomingDienstEvents],
  );
  const calendarEvents = useMemo(
    () => mergeTimelineEvents(agendaEvents, allDienstEvents).filter((event) => event.status !== "VERWIJDERD"),
    [agendaEvents, allDienstEvents],
  );

  const viewEvents = useMemo(() => {
    switch (activeView) {
      case "today":
        return todayTimelineEvents;
      case "pending":
        return pending;
      case "history":
        return historyTimelineEvents.slice(0, HISTORY_RENDER_LIMIT);
      default:
        return upcomingTimelineEvents;
    }
  }, [activeView, historyTimelineEvents, pending, todayTimelineEvents, upcomingTimelineEvents]);

  const timelineGroups = useMemo(() => {
    const groups = groupByDate(viewEvents, todayIso, activeView === "history" ? "desc" : "asc", activeView === "today" ? todayIso : undefined);
    if (activeView === "today" && todayNotes.length > 0 && !groups.some((group) => group.date === todayIso)) {
      return [{
        date: todayIso,
        label: formatDateLabel(todayIso),
        isToday: true,
        events: [],
      }];
    }
    return groups;
  }, [activeView, todayIso, todayNotes.length, viewEvents]);

  const viewTabs = useMemo(() => [
    { id: "today" as const, label: "Vandaag", count: todayTimelineEvents.length, icon: CalendarDays },
    { id: "upcoming" as const, label: "Komend", count: upcomingTimelineEvents.length, icon: ListChecks },
    { id: "pending" as const, label: "Wachtrij", count: pending.length, icon: Zap },
    { id: "history" as const, label: "Historie", count: historyTimelineEvents.length, icon: Archive },
  ], [historyTimelineEvents.length, pending.length, todayTimelineEvents.length, upcomingTimelineEvents.length]);

  const emptyCopy = viewEmptyCopy(activeView);
  const activeViewMeta = viewTabs.find((tab) => tab.id === activeView) ?? viewTabs[0];
  const historyHiddenCount = Math.max(0, historyTimelineEvents.length - HISTORY_RENDER_LIMIT);

  // ─── Actions ────────────────────────────────────────────────────────────

  const openNewEvent = (date = selectedCalendarDate, time?: string) => {
    setEditEvent(null);
    setEventInitialDate(date);
    setEventInitialTime(time);
    setModalOpen(true);
  };

  const openEditEvent = (event: PersonalEvent) => {
    setEditEvent(event);
    setEventInitialDate(undefined);
    setEventInitialTime(undefined);
    setModalOpen(true);
  };

  const openNewNoteForDate = (date: string) => {
    setEditNote(null);
    setNoteDefaults({ deadline: `${date}T09:00`, tags: ["agenda"] });
    setNoteEditorOpen(true);
  };

  const openNewNoteForEvent = (event: PersonalEvent) => {
    const isRooster = event.kalender === "Rooster";
    setEditNote(null);
    setNoteDefaults({
      deadline: `${event.startDatum}T${event.startTijd || "09:00"}`,
      linkedEventId: event.eventId,
      tags: mergeTags(isRooster ? ["agenda", "dienst"] : ["agenda"], contextTagsFromEvent(event)),
      title: isRooster ? `Notitie bij dienst: ${event.shiftType || event.titel}` : `Notitie bij ${event.titel}`,
      businessContext: businessContextFromEvent(event),
    });
    setNoteEditorOpen(true);
  };

  const openEditNote = (note: NoteRecord) => {
    setEditNote(note);
    setNoteDefaults({});
    setNoteEditorOpen(true);
  };

  const handleSaveNote = async (data: NoteCreateData) => {
    if (editNote) {
      await updateNote(editNote.id, data);
      success("Notitie bijgewerkt");
    } else {
      await createNote(data);
      success("Notitie toegevoegd");
    }
  };

  const handleSync = async () => {
    if (!user?.id) { toastError("Niet ingelogd"); return; }
    setSyncing(true);
    try {
      const result = await syncApi.calendar(user.id);
      await refetchEvents();
      await refetchDiensten();
      if (result.pendingError) {
        toast(`Agenda opgehaald; wachtrij faalde: ${shortSyncError(result.pendingError)}`, "info");
      } else {
        success("Agenda gesynchroniseerd");
      }
    } catch (err) {
      toastError(`Sync mislukt: ${errorMessage(err)}`);
    } finally {
      setSyncing(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="text-slate-100">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[#0a0a0f]/92 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-white sm:text-lg">Agenda</h1>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {formatDateLabel(todayIso)}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleSync}
                disabled={syncing}
                aria-label="Synchroniseer met Google Calendar"
                aria-busy={syncing}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-white/[0.03] text-slate-400 hover:text-sky-300 hover:border-sky-500/20 transition-colors disabled:opacity-40 cursor-pointer"
                title="Sync met Google Calendar"
              >
                {syncing ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={15} aria-hidden="true" />}
              </button>

              <StatusPill status={syncStatus?.status} />

              <button
                onClick={() => openNewEvent()}
                aria-label="Nieuwe afspraak"
                className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-500/12 border border-emerald-500/25 px-3 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/18 transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">Nieuw</span>
              </button>
            </div>
          </div>

          <div role="tablist" aria-label="Agenda-weergave" className="mt-3 flex gap-1 overflow-x-auto pb-0.5">
            {viewTabs.map(({ id, label, count, icon: Icon }) => {
              const active = activeView === id;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveView(id)}
                  className={`flex h-9 min-w-max items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? "border-sky-500/35 bg-sky-500/12 text-sky-200"
                      : "border-transparent bg-white/[0.03] text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]"
                  }`}
                >
                  <Icon size={13} aria-hidden="true" />
                  <span>{label}</span>
                  <span className={`rounded-md px-1.5 py-0.5 text-[11px] tabular-nums ${
                    active ? "bg-sky-400/12 text-sky-100" : "bg-white/[0.04] text-slate-500"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:py-7">
        <div className="mb-4">
          <AgendaCalendar
            events={calendarEvents}
            notesByDate={notesByDate}
            notesByEventId={notesByEventId}
            conflictMap={conflictMap}
            todayIso={todayIso}
            selectedDate={selectedCalendarDate}
            cursorDate={calendarCursorDate}
            mode={calendarMode}
            onSelectedDateChange={setSelectedCalendarDate}
            onCursorDateChange={setCalendarCursorDate}
            onModeChange={setCalendarMode}
            onCreateEvent={(date, time) => openNewEvent(date, time)}
            onCreateNoteForDate={openNewNoteForDate}
            onCreateNoteForEvent={openNewNoteForEvent}
            onEditEvent={openEditEvent}
            onEditNote={openEditNote}
          />
        </div>

        {/* Compact summary chips — only the net-new counts; Vandaag/Wachtrij are
            already shown as badges on the view-tabs in the header. */}
        <section className="mb-5 flex flex-wrap items-center gap-1.5" aria-label="Agenda-overzicht">
          <StatChip icon={CalendarDays} label="30 dagen" value={String(monthEvents.length)} meta={formatSplitCounts(monthEvents)} tone="sky" onClick={() => setActiveView("upcoming")} active={activeView === "upcoming"} />
          <StatChip icon={AlertTriangle} label="Conflicten" value={String(withConflicts.length)} meta={withConflicts.length ? "te controleren" : "geen conflicten"} tone={withConflicts.length ? "amber" : "green"} onClick={withConflicts.length ? () => setActiveView("upcoming") : undefined} />
        </section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">

          {/* ── Timeline ─────────────────────────────────────────────── */}
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-white">{activeViewMeta.label}</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatSplitCounts(viewEvents)}
                </p>
              </div>
              {activeView !== "today" && (
                <button
                  onClick={() => setActiveView("today")}
                  className="rounded-lg border border-[var(--color-border)] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-slate-200 hover:bg-white/[0.05] cursor-pointer"
                >
                  Vandaag
                </button>
              )}
            </div>

            {agendaError ? (
              <Panel className="border-amber-500/20 bg-amber-500/[0.045]">
                <div className="flex items-start gap-3 text-sm text-amber-200">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Agenda kon niet worden geladen</p>
                    <p className="mt-1 text-xs text-slate-400">{errorMessage(agendaError)}</p>
                  </div>
                </div>
              </Panel>
            ) : isLoading || scheduleLoading ? (
              <div className="space-y-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-40 animate-pulse rounded bg-white/5" />
                    <div className="h-12 animate-pulse rounded-lg bg-white/[0.03]" />
                    <div className="h-12 animate-pulse rounded-lg bg-white/[0.03]" />
                  </div>
                ))}
              </div>
            ) : timelineGroups.length > 0 ? (
              <div className="space-y-5">
                {timelineGroups.map((group) => (
                  <TimelineDay
                    key={group.date}
                    label={group.label}
                    isToday={group.isToday}
                    events={group.events}
                    onEdit={openEditEvent}
                    onRefetch={refetchEvents}
                    conflictMap={conflictMap}
                    notes={notesByDate.get(group.date) ?? []}
                    notesByEventId={notesByEventId}
                    onEditNote={openEditNote}
                    onCreateNoteForDate={() => openNewNoteForDate(group.date)}
                    onCreateNoteForEvent={openNewNoteForEvent}
                  />
                ))}
              </div>
            ) : (
              <Panel>
                <EmptyState
                  icon={CalendarDays}
                  title={emptyCopy.title}
                  text={emptyCopy.text}
                />
              </Panel>
            )}

            {activeView === "history" && historyHiddenCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white/[0.02] px-4 py-3 text-xs text-slate-500">
                <Archive size={13} className="shrink-0 text-slate-600" aria-hidden="true" />
                <span>
                  {HISTORY_RENDER_LIMIT} van {historyTimelineEvents.length} getoond · {historyHiddenCount} oudere{historyHiddenCount === 1 ? "" : "n"} verborgen
                </span>
              </div>
            )}

            {activeView !== "pending" && pending.length > 0 && (
              <button
                onClick={() => setActiveView("pending")}
                className="flex w-full items-center justify-between rounded-lg border border-sky-500/15 bg-sky-500/[0.045] px-4 py-3 text-left transition-colors hover:bg-sky-500/[0.07] cursor-pointer"
              >
                <span className="flex items-center gap-2 text-xs font-medium text-sky-200">
                  <Zap size={14} />
                  {pending.length} in Google Calendar wachtrij
                </span>
                <span className="text-xs text-sky-300">Bekijken</span>
              </button>
            )}
          </div>

          {/* ── Sidebar ──────────────────────────────────────────────── */}
          <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">

            <NextShiftCard
              dienst={nextDienst}
              compact
              afspraken={nextDienst ? (eventsByDate[nextDienst.startDatum] ?? []) : []}
              conflictMap={conflictMap}
              todayIso={todayIso}
            />

            <NextEventCard event={nextAppointment} />

            <div className="rounded-lg border border-[var(--color-border)] bg-white/[0.02] px-4 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText size={13} className="text-amber-300/70" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Notities vandaag
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openNewNoteForDate(todayIso)}
                  className="flex h-7 items-center gap-1 rounded-md border border-amber-500/15 bg-amber-500/[0.06] px-2 text-[10px] font-semibold text-amber-300 transition-colors hover:bg-amber-500/[0.1] cursor-pointer"
                >
                  <Plus size={11} />
                  Nieuw
                </button>
              </div>

              {todayNotes.length > 0 ? (
                <div className="space-y-1">
                  {todayNotes.slice(0, 5).map((note) => {
                    const isPinned = note.isPinned || note.is_pinned;
                    return (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => openEditNote(note)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-slate-300 transition-colors hover:bg-white/[0.04] cursor-pointer"
                      >
                        {isPinned ? (
                          <Pin size={11} className="shrink-0 text-amber-300 fill-amber-300" />
                        ) : (
                          <FileText size={11} className="shrink-0 text-slate-600" />
                        )}
                        <span className="truncate">{getDisplayTitle(note)}</span>
                      </button>
                    );
                  })}
                  {todayNotes.length > 5 && (
                    <p className="px-2 text-[10px] text-slate-600">+{todayNotes.length - 5} meer notities vandaag</p>
                  )}
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-[var(--color-border)] px-3 py-3 text-xs text-slate-600">
                  Nog geen dagnotities.
                </p>
              )}
            </div>

            {/* Conflicts — only when present */}
            {withConflicts.length > 0 && (
              <Panel className="border-amber-500/15 bg-amber-500/[0.035]">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-amber-400" />
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {withConflicts.length} {withConflicts.length === 1 ? "conflict" : "conflicten"}
                  </p>
                </div>
                <div className="space-y-1">
                  {withConflicts.slice(0, 5).map((event) => (
                    <PersonalEventItem
                      key={event.eventId}
                      event={event}
                      onEdit={openEditEvent}
                      onRefetch={refetchEvents}
                      conflictInfo={conflictMap.get(event.eventId)}
                    />
                  ))}
                </div>
              </Panel>
            )}

            {/* Sync error — only surfaced when actionable; the header StatusPill
                already shows the at-a-glance state, and Recent-voorbij lives on
                the Historie tab + the no-conflict state on the Conflicten chip. */}
            {syncStatus?.lastError && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/[0.05] px-4 py-3">
                <div className="mb-1 flex items-center gap-2">
                  <AlertTriangle size={13} className="shrink-0 text-rose-400" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-300">Sync-fout</p>
                </div>
                <p className="text-[10px] leading-relaxed text-rose-400/80">{syncStatus.lastError}</p>
                <p className="mt-1 text-[10px] text-slate-500">Laatst geslaagd: {formatDateTime(syncStatus?.lastSuccessAt)}</p>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* ── Modal ──────────────────────────────────────────────────────── */}
      <CreateEventModal
        open={modalOpen}
        editEvent={editEvent}
        initialDate={eventInitialDate}
        initialTime={eventInitialTime}
        onSuccess={() => refetchEvents()}
        onClose={() => {
          setModalOpen(false);
          setEditEvent(null);
          setEventInitialDate(undefined);
          setEventInitialTime(undefined);
        }}
      />

      <AnimatePresence>
        {noteEditorOpen && (
          <NoteEditor
            key={editNote?.id ?? [
              noteDefaults.linkedEventId ?? "new-note",
              noteDefaults.deadline ?? "",
              noteDefaults.title ?? "",
              noteDefaults.businessContext?.type ?? "",
              noteDefaults.businessContext?.id ?? "",
              ...(noteDefaults.tags ?? []),
            ].join(":")}
            note={editNote}
            userId={user?.id}
            onSave={handleSaveNote}
            onClose={() => {
              setNoteEditorOpen(false);
              setEditNote(null);
              setNoteDefaults({});
            }}
            onDelete={removeNote}
            onArchive={archiveNote}
            onTogglePin={togglePinNote}
            onToggleComplete={toggleCompleteNote}
            onLoadRevisions={noteRevisions}
            onRestoreRevision={restoreNoteRevision}
            eventOptions={noteEventOptions}
            initialDeadline={noteDefaults.deadline}
            initialLinkedEventId={noteDefaults.linkedEventId}
            initialTags={noteDefaults.tags}
            initialTitle={noteDefaults.title}
            initialBusinessContext={noteDefaults.businessContext}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function shortSyncError(error: string) {
  const trimmed = error.trim();
  if (trimmed.length <= 140) return trimmed;
  // Truncate on a word boundary so the message never cuts mid-word.
  const head = trimmed.slice(0, 137);
  const lastSpace = head.lastIndexOf(" ");
  const clipped = lastSpace > 80 ? head.slice(0, lastSpace) : head;
  return `${clipped.trimEnd()}…`;
}
