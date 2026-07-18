"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CalendarDays,
  FileText,
  ListChecks,
  Pin,
  Plus,
  RefreshCw,
  Zap,
} from "lucide-react";

import { useUser } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSchedule } from "@/hooks/useSchedule";
import { useNotes, type NoteCreateData, type NoteRecord } from "@/hooks/useNotes";
import { syncApi, type SyncStatusResult } from "@/lib/api";
import { getHistory as getDienstHistory, withRuntimeStatus, type DienstRow } from "@/lib/schedule";
import {
  getDisplayEndDate,
  usePersonalEvents,
  type PersonalEvent,
} from "@/hooks/usePersonalEvents";
import { PersonalEventItem } from "@/components/schedule/PersonalEventItem";
import { AgendaCalendar } from "@/components/schedule/AgendaCalendar";
import { NextShiftCard } from "@/components/schedule/NextShiftCard";
import { getDisplayTitle } from "@/components/notes/NotesUtils";
import { groupNotesByDate, groupNotesByEventId } from "@/components/notes/NoteAgendaUtils";
import { useToast } from "@/components/ui/Toast";
import { businessContextFromEvent, contextTagsFromEvent, mergeTags, type BusinessContextValue } from "@/lib/workspace-context";

import {
  getAmsterdamTodayIso,
  formatDateLabel,
  formatDateTime,
  eventCoversDate,
  errorMessage,
} from "@/components/schedule/AgendaUtils";
import {

  EmptyState,
  StatusPill,
  NextEventCard,
  TimelineDay,
} from "@/components/schedule/AgendaCards";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { compareAllDayFirst, shortSyncError, getShiftAppointments } from "@/components/schedule/scheduleUtils";
import { StatChip } from "@/components/ui/StatChip";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  AppPageHeader,
  AppPageShell,
  PageToolbar,
} from "@/components/layout/AppPageShell";
const LazyCreateEventModal = dynamic(
  () => import("@/components/schedule/CreateEventModal").then((module) => module.CreateEventModal),
  { ssr: false },
);
const LazyNoteEditor = dynamic(
  () => import("@/components/notes/NoteEditor").then((module) => module.NoteEditor),
  { ssr: false },
);


type AgendaView = "today" | "upcoming" | "pending" | "history";
type CalendarMode = "month" | "week";

const HISTORY_RENDER_LIMIT = 60;

type TimelineGroup = {
  date: string;
  label: string;
  isToday: boolean;
  events: PersonalEvent[];
};

function dienstToTimelineEvent(dienst: DienstRow): PersonalEvent {
  const title = dienst.titel || dienst.shiftType || "Dienst";
  const endDate = dienst.eindDatum || dienst.startDatum;
  // Runtime-status toepassen zodat een lopende dienst óók op /agenda "Bezig"
  // toont (rooster/focus doen dit al) i.p.v. altijd "Aankomend" (audit DEEL 2 #12).
  const runtime = withRuntimeStatus(dienst);
  const status =
    runtime.status === "Gedraaid" ? "Voorbij"
    : runtime.status === "VERWIJDERD" ? "VERWIJDERD"
    : runtime.status === "Bezig" ? "Bezig"
    : "Aankomend";
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
    status,
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
      // Gedeelde comparator met de kalender (audit L6): hele-dag eerst.
      events: [...groupEvents].sort(compareAllDayFirst),
    }));
}

function viewEmptyCopy(view: AgendaView) {
  switch (view) {
    case "today":
      return { title: "Vandaag geen afspraken", text: "Je dag is vrij." };
    case "pending":
      return { title: "Niets in de wachtrij", text: "Alles staat in Google Calendar." };
    case "history":
      return { title: "Geen historie", text: "Er zijn nog geen afgeronde afspraken." };
    default:
      return { title: "Geen aankomende afspraken", text: "Je agenda is rustig." };
  }
}

export default function AgendaPage() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { success, error: toastError, toast } = useToast();
  const {
    diensten,
    nextDienst,
    upcoming: upcomingDiensten,
    isLoading: scheduleLoading,
    isError: scheduleIsError,
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

  // Adaptieve poll (audit L3): 10s alleen in de 2 minuten na een handmatige
  // sync (dan is de status echt in beweging), anders 60s — een open kiosk-tab
  // hamert de API zo niet meer 8.640×/dag.
  const lastManualSyncRef = useRef(0);
  const { data: syncStatuses } = useQuery<SyncStatusResult>({
    queryKey: ["sync-status"],
    queryFn: () => syncApi.status(),
    refetchInterval: () =>
      Date.now() - lastManualSyncRef.current < 120_000 ? 10_000 : 60_000,
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
  // Persistent wachtrij-fout van de laatste sync — blijft zichtbaar in de
  // sidebar tot een sync zonder wachtrij-fout slaagt (audit K11).
  const [pendingSyncError, setPendingSyncError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<AgendaView>("today");

  const todayIso = getAmsterdamTodayIso();
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("month");
  const [calendarCursorDate, setCalendarCursorDate] = useState(todayIso);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(todayIso);
  const syncStatus = syncStatuses?.personal;
  // Eén gedeelde laad-vlag voor chips, kalender en sidebar — koude loads tonen
  // placeholders i.p.v. "0 conflicten"/"Geen aankomende diensten" (audit K3).
  const agendaBusy = isLoading || scheduleLoading;

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
  // Heeft de agenda al (gecachte) data? Zo ja, dan is een refetch-fout slechts
  // "verouderd", geen leeg foutscherm (audit H15).
  const agendaHasData = upcoming.length > 0 || history.length > 0 || pending.length > 0;
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
    if (syncing) return;
    if (!user?.id) { toastError("Niet ingelogd"); return; }
    lastManualSyncRef.current = Date.now();
    setSyncing(true);
    try {
      const result = await syncApi.calendar(user.id);
      await refetchEvents();
      await refetchDiensten();
      // De header-StatusPill leest deze query — direct verversen i.p.v. op de
      // 10s-poll wachten (audit K11).
      queryClient.invalidateQueries({ queryKey: ["sync-status"] });
      if (result.scheduleWriteError) {
        // Kalender opgehaald, maar het rooster kon niet worden weggeschreven —
        // geen schone "gesynchroniseerd" claimen (audit DEEL 2 #7).
        setPendingSyncError(`Rooster opslaan mislukt: ${result.scheduleWriteError}`);
        toastError(`Rooster opslaan mislukt: ${shortSyncError(result.scheduleWriteError)}`);
      } else if (result.pendingError) {
        setPendingSyncError(result.pendingError);
        toast(`Agenda opgehaald; wachtrij faalde: ${shortSyncError(result.pendingError)}`, "info");
      } else {
        setPendingSyncError(null);
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
    <AppPageShell width="standard" className="space-y-5 text-[var(--color-text)]">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-[var(--layer-sticky)] space-y-2 bg-[var(--color-background)]/95 pb-3 backdrop-blur-xl">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <AppPageHeader
              title="Agenda"
              description={
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span>{formatDateLabel(todayIso)}</span>
                  <StatusPill status={syncStatus?.status} />
                </span>
              }
              className="min-w-0 flex-1"
            />
            <div className="flex shrink-0 items-center gap-2">
              <IconButton
                onClick={handleSync}
                loading={syncing}
                label="Synchroniseer met Google Calendar"
                title="Sync met Google Calendar"
                icon={<RefreshCw size={16} />}
                className="hover:border-[var(--color-info-border)] hover:text-[var(--color-info)]"
              />
              <Button variant="primary" onClick={() => openNewEvent()}>
                <Plus size={16} aria-hidden="true" />
                <span className="hidden min-[390px]:inline">Nieuwe afspraak</span>
                <span className="min-[390px]:hidden">Nieuw</span>
              </Button>
            </div>
          </div>

          <PageToolbar label="Agenda-weergaven">
          <Tabs
            items={viewTabs}
            value={activeView}
            onValueChange={setActiveView}
            idPrefix="agenda"
            ariaLabel="Agenda-weergave"
            tone="info"
            className="w-full"
          />
          </PageToolbar>
        </div>
      </div>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <div className="space-y-5">
        <div className="mb-4">
          <AgendaCalendar
            events={calendarEvents}
            isLoading={agendaBusy}
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
            already shown as badges on the view-tabs in the header. The Komend-chip
            counts the exact same list as the Komend-tab badge (audit K17). */}
        <section className="mb-5 flex flex-wrap items-center gap-1.5" aria-label="Agenda-overzicht">
          {agendaBusy ? (
            <>
              <Skeleton className="h-8 w-28 rounded-lg border border-[var(--color-border)]" />
              <Skeleton className="h-8 w-28 rounded-lg border border-[var(--color-border)]" />
              <span className="sr-only">Agenda-overzicht wordt geladen</span>
            </>
          ) : (
            <>
              <StatChip icon={CalendarDays} label="Komend" value={String(upcomingTimelineEvents.length)} meta={formatSplitCounts(upcomingTimelineEvents)} tone="info" onClick={() => setActiveView("upcoming")} active={activeView === "upcoming"} />
              <StatChip icon={AlertTriangle} label="Conflicten" value={String(withConflicts.length)} meta={withConflicts.length ? "te controleren" : "geen conflicten"} tone={withConflicts.length ? "warning" : "success"} onClick={withConflicts.length ? () => setActiveView("upcoming") : undefined} />
            </>
          )}
        </section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">

          {/* ── Timeline ─────────────────────────────────────────────── */}
          {/* Onder xl komt de sidebar (volgende dienst + conflicten) BOVEN de
              tijdlijn te staan (audit K5) — vandaar de order-utilities. */}
          <TabPanel
            idPrefix="agenda"
            value={activeView}
            className="order-2 space-y-5 xl:order-1"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-[var(--color-text)]">{activeViewMeta.label}</h2>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  {formatSplitCounts(viewEvents)}
                </p>
              </div>
              {activeView !== "today" && (
                <Button size="sm" variant="secondary" onClick={() => setActiveView("today")}>
                  Vandaag
                </Button>
              )}
            </div>

            {/* Dienst-fout is óók zichtbaar (audit DEEL 2 #2): voorheen werd
                alleen de events-fout getoond en leek een rooster-500 gewoon
                een lege agenda. */}
            {scheduleIsError && (
              <Surface tone="warning" radius="sm">
                <div className="flex flex-wrap items-start gap-3 text-sm text-[var(--color-warning)]">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">Diensten konden niet worden geladen</p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      Je afspraken worden getoond, maar het rooster (diensten en conflicten) kan verouderd of onvolledig zijn.
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => void refetchDiensten()}>
                    Opnieuw proberen
                  </Button>
                </div>
              </Surface>
            )}

            {/* Failed ≠ empty (audit H15): een mislukte background-refetch mag
                een gevulde agenda niet vervangen door een foutscherm. Alleen bij
                écht geen data het volle foutpaneel; anders een compacte semantische waarschuwing
                stale-banner met retry (pariteit met /rooster). */}
            {agendaError && agendaHasData ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-warning-border)] bg-[var(--color-warning-subtle)] px-3 py-2 text-xs text-[var(--color-warning)]">
                <AlertTriangle size={13} className="shrink-0 text-[var(--color-warning)]" />
                <span className="min-w-0 flex-1">
                  Agenda verversen mislukt — je ziet mogelijk verouderde afspraken.
                </span>
                <Button size="sm" variant="secondary" onClick={() => void refetchEvents()}>
                  Opnieuw proberen
                </Button>
              </div>
            ) : agendaError ? (
              <Surface tone="danger" radius="sm">
                <div className="flex flex-wrap items-start gap-3 text-sm text-[var(--color-danger)]">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">Agenda kon niet worden geladen</p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">{errorMessage(agendaError)}</p>
                  </div>
                  <Button size="sm" variant="primary" onClick={() => void refetchEvents()}>
                    Opnieuw proberen
                  </Button>
                </div>
              </Surface>
            ) : agendaBusy ? (
              <div className="space-y-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-40 rounded" />
                    <Skeleton className="h-12 rounded-lg" />
                    <Skeleton className="h-12 rounded-lg" />
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
              <Surface radius="sm">
                <EmptyState
                  icon={CalendarDays}
                  title={emptyCopy.title}
                  text={emptyCopy.text}
                />
                {/* Zelfde CTA als de kalender-empty-state (audit K12). */}
                {activeView !== "history" && (
                  <div className="flex justify-center pb-2">
                    <Button size="sm" variant="primary" onClick={() => openNewEvent()}>
                      <Plus size={14} />
                      Nieuwe afspraak
                    </Button>
                  </div>
                )}
              </Surface>
            )}

            {activeView === "history" && historyHiddenCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-xs text-[var(--color-text-muted)]">
                <Archive size={13} className="shrink-0 text-[var(--color-text-subtle)]" aria-hidden="true" />
                <span>
                  {HISTORY_RENDER_LIMIT} van {historyTimelineEvents.length} getoond · {historyHiddenCount} oudere{historyHiddenCount === 1 ? "" : "n"} verborgen
                </span>
              </div>
            )}

            {activeView !== "pending" && pending.length > 0 && (
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setActiveView("pending")}
                className="justify-between border-[var(--color-info-border)] bg-[var(--color-info-subtle)] text-left text-[var(--color-info)]"
              >
                <span className="flex items-center gap-2 text-xs font-medium">
                  <Zap size={14} />
                  {pending.length} {pending.length === 1 ? "afspraak" : "afspraken"} nog niet in Google Calendar
                </span>
                <span className="text-xs">Bekijken</span>
              </Button>
            )}
          </TabPanel>

          {/* ── Sidebar ──────────────────────────────────────────────── */}
          <aside className="order-1 space-y-4 xl:order-2 xl:sticky xl:top-20 xl:self-start">

            <NextShiftCard
              dienst={nextDienst}
              compact
              loading={agendaBusy}
              // Gedeelde helper (audit DEEL 2 NextShiftCard): alle afspraken over
              // álle dagen die de dienst beslaat — nachtdiensten tonen nu ook de
              // vroege-ochtendafspraak van de volgende dag.
              afspraken={getShiftAppointments(nextDienst, eventsByDate)}
              conflictMap={conflictMap}
              todayIso={todayIso}
            />

            <NextEventCard event={nextAppointment} />

            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText size={13} className="text-[var(--color-primary-hover)]" />
                  <p className="text-micro font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Notities vandaag
                  </p>
                </div>
                <Button size="sm" variant="primary" onClick={() => openNewNoteForDate(todayIso)}>
                  <Plus size={11} />
                  Nieuw
                </Button>
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
                        className="flex min-h-[var(--touch-target)] w-full items-center gap-2 rounded-md px-2 text-left text-xs text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)] cursor-pointer"
                      >
                        {isPinned ? (
                          <Pin size={11} className="shrink-0 text-[var(--color-primary-hover)] fill-[var(--color-primary)]" />
                        ) : (
                          <FileText size={11} className="shrink-0 text-[var(--color-text-subtle)]" />
                        )}
                        <span className="truncate">{getDisplayTitle(note)}</span>
                      </button>
                    );
                  })}
                  {todayNotes.length > 5 && (
                    <p className="px-2 text-micro text-[var(--color-text-subtle)]">+{todayNotes.length - 5} meer notities vandaag</p>
                  )}
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-[var(--color-border)] px-3 py-3 text-xs text-[var(--color-text-subtle)]">
                  Nog geen dagnotities.
                </p>
              )}
            </div>

            {/* Conflicts — only when present */}
            {withConflicts.length > 0 && (
              <Surface tone="warning" radius="sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-[var(--color-warning)]" />
                  <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
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
              </Surface>
            )}

            {/* Wachtrij-fout van de laatste handmatige sync — persistent i.p.v.
                alleen een 4s-toast (audit K11). */}
            {pendingSyncError && (
              <div className="rounded-lg border border-[var(--color-danger-border)] bg-[var(--color-danger-subtle)] px-4 py-3">
                <div className="mb-1 flex items-center gap-2">
                  <AlertTriangle size={13} className="shrink-0 text-[var(--color-danger)]" />
                  <p className="text-micro font-semibold uppercase tracking-wider text-[var(--color-danger)]">Wachtrij-fout</p>
                </div>
                <p className="text-micro leading-relaxed text-[var(--color-danger)]">{shortSyncError(pendingSyncError)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleSync}
                    loading={syncing}
                    loadingLabel="Synchroniseren…"
                  >
                    Opnieuw syncen
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPendingSyncError(null)}>
                    Verbergen
                  </Button>
                </div>
              </div>
            )}

            {/* Sync error — only surfaced when actionable; the header StatusPill
                already shows the at-a-glance state, and Recent-voorbij lives on
                the Historie tab + the no-conflict state on the Conflicten chip. */}
            {syncStatus?.lastError && (
              <div className="rounded-lg border border-[var(--color-danger-border)] bg-[var(--color-danger-subtle)] px-4 py-3">
                <div className="mb-1 flex items-center gap-2">
                  <AlertTriangle size={13} className="shrink-0 text-[var(--color-danger)]" />
                  <p className="text-micro font-semibold uppercase tracking-wider text-[var(--color-danger)]">Sync-fout</p>
                </div>
                <p className="text-micro leading-relaxed text-[var(--color-danger)]">{syncStatus.lastError}</p>
                <p className="mt-1 text-micro text-[var(--color-text-muted)]">Laatst geslaagd: {formatDateTime(syncStatus?.lastSuccessAt)}</p>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* ── Modal ──────────────────────────────────────────────────────── */}
      {modalOpen && (
        <LazyCreateEventModal
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
      )}

        {noteEditorOpen && (
          <LazyNoteEditor
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
    </AppPageShell>
  );
}
