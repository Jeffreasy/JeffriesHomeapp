"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Calendar, CalendarClock, CalendarDays, ChevronDown, History, Plus, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { usePersonalEvents, type PersonalEvent } from "@/hooks/usePersonalEvents";
import { type DienstRow } from "@/lib/schedule";
import { useToast } from "@/components/ui/Toast";
import { StatChip } from "@/components/ui/StatChip";
import { PersonalEventItem } from "./PersonalEventItem";
import { getAmsterdamTodayIso, formatShortDate } from "./RoosterUtils";
import { shortSyncError } from "./scheduleUtils";
import { syncApi } from "@/lib/api";

type UpcomingFilter = "aankomend" | "maand" | "conflicten";

interface AfsprakenViewProps {
  diensten?:    DienstRow[];
  onEditEvent?: (evt: PersonalEvent) => void;
  onNewEvent?:  () => void;
  /** Gedeelde sync-busy-vlag (audit F9): header-Sync en "Verwerk nu" delen
   *  één vlag zodat er nooit twee gelijktijdige syncs kunnen lopen. */
  syncing?: boolean;
  onSyncingChange?: (busy: boolean) => void;
  /** Rapporteert de laatste wachtrij-fout aan de pagina zodat die persistent
   *  getoond kan worden, net als op /agenda (audit F10). */
  onPendingSyncError?: (error: string | null) => void;
}

export function AfsprakenView({
  diensten,
  onEditEvent,
  onNewEvent,
  syncing,
  onSyncingChange,
  onPendingSyncError,
}: AfsprakenViewProps) {
  const { upcoming, history, withConflicts, pending, conflictMap, isLoading, error: eventsError, refetch } =
    usePersonalEvents({ diensten });

  const { user } = useUser();
  const queryClient = useQueryClient();
  const { success, error, toast } = useToast();
  // Gecontroleerd (gedeelde vlag van de pagina) of lokaal — F9.
  const [localProcessing, setLocalProcessing] = useState(false);
  const processing = syncing ?? localProcessing;
  const setProcessing = (busy: boolean) => {
    if (onSyncingChange) onSyncingChange(busy);
    else setLocalProcessing(busy);
  };

  const handleVerwerk = async () => {
    if (processing) return;
    if (!user?.id) { error("Niet ingelogd"); return; }
    setProcessing(true);
    try {
      const result = await syncApi.calendar(user.id);
      // De calendar-sync herschrijft server-side óók het rooster + meta, dus
      // die caches moeten mee-invalideren — anders toont /rooster een verouderd
      // rooster naast verse afspraken (audit DEEL 2 #8).
      queryClient.invalidateQueries({ queryKey: ["/schedule"] });
      queryClient.invalidateQueries({ queryKey: ["/schedule/meta"] });
      await refetch();
      if (result.scheduleWriteError) {
        // Kalender opgehaald maar rooster-write faalde — geen schone claim
        // (audit DEEL 2 #7).
        onPendingSyncError?.(`Rooster opslaan mislukt: ${result.scheduleWriteError}`);
        error(`Rooster opslaan mislukt: ${shortSyncError(result.scheduleWriteError)}`);
      } else if (result.pendingError) {
        onPendingSyncError?.(result.pendingError);
        toast(`Agenda opgehaald; wachtrij faalde: ${shortSyncError(result.pendingError)}`, "info");
      } else {
        onPendingSyncError?.(null);
        success(result.pendingProcessed
          ? `${result.pendingProcessed} wachtrij-item(s) verwerkt`
          : "Agenda gesynchroniseerd");
      }
    } catch (err) {
      error(`Verwerken mislukt: ${err instanceof Error ? err.message : "onbekende fout"}`);
    } finally {
      setProcessing(false);
    }
  };

  const [showHistory, setShowHistory] = useState(false);
  // Chips filteren de lijst (audit F11); "Toon alle" heft de cap van 8 op.
  const [upcomingFilter, setUpcomingFilter] = useState<UpcomingFilter>("aankomend");
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const today = getAmsterdamTodayIso();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-[var(--color-surface)] animate-pulse" />
        ))}
      </div>
    );
  }

  // Fout ≠ leeg (audit DEEL 2 #6): een mislukte fetch mag niet als "geen
  // afspraken gevonden" verschijnen — anders lijkt een 500 een lege agenda.
  if (eventsError && upcoming.length === 0 && history.length === 0 && pending.length === 0) {
    return (
      <div className="glass rounded-2xl p-10 text-center border border-amber-500/20 bg-amber-500/[0.04]">
        <AlertTriangle size={32} className="text-amber-400 mx-auto mb-4" />
        <h3 className="text-base font-semibold text-amber-100 mb-1">Afspraken konden niet worden geladen</h3>
        <p className="text-sm text-slate-400 mb-4">
          {eventsError instanceof Error ? eventsError.message : "Controleer je verbinding en probeer het opnieuw."}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15 cursor-pointer"
        >
          Opnieuw proberen
        </button>
      </div>
    );
  }

  if (upcoming.length === 0 && history.length === 0 && pending.length === 0) {
    return (
      <div className="glass rounded-2xl p-10 text-center border border-dashed border-[var(--color-border)]">
        <Calendar size={36} className="text-slate-600 mx-auto mb-4" />
        <h3 className="text-base font-semibold text-slate-300 mb-1">Geen afspraken gevonden</h3>
        <p className="text-sm text-slate-500">
          Gebruik Agenda om te synchroniseren of maak direct een nieuwe afspraak.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Stats chips (fungeren als filters, audit F11) ─────────────────── */}
      {upcoming.length > 0 && (() => {
        const thisMonthEvents = upcoming.filter((e) => e.startDatum.slice(0, 7) === today.slice(0, 7));
        const filteredUpcoming =
          upcomingFilter === "maand" ? thisMonthEvents
          : upcomingFilter === "conflicten" ? withConflicts
          : upcoming;
        const visibleUpcoming = showAllUpcoming ? filteredUpcoming : filteredUpcoming.slice(0, 8);
        const selectFilter = (filter: UpcomingFilter) => {
          setUpcomingFilter((current) => (current === filter ? "aankomend" : filter));
          setShowAllUpcoming(false);
        };

        return (
          <>
            <section className="flex flex-wrap items-center gap-1.5" aria-label="Afspraken-overzicht">
              <StatChip
                icon={CalendarClock}
                label="Aankomend"
                value={String(upcoming.length)}
                tone="indigo"
                onClick={() => selectFilter("aankomend")}
                active={upcomingFilter === "aankomend"}
              />
              <StatChip
                icon={CalendarDays}
                label="Deze maand"
                value={String(thisMonthEvents.length)}
                tone="slate"
                onClick={() => selectFilter("maand")}
                active={upcomingFilter === "maand"}
              />
              <StatChip
                icon={AlertTriangle}
                label="Conflicten"
                value={String(withConflicts.length)}
                meta={withConflicts.length > 0 ? "te controleren" : "geen conflicten"}
                tone={withConflicts.length > 0 ? "amber" : "green"}
                onClick={() => selectFilter("conflicten")}
                active={upcomingFilter === "conflicten"}
              />
            </section>

            {/* ── Aankomende afspraken (audit F11): de Beheer-tab telde ze wél
                  maar rendert de lijst nu ook. ───────────────────────────── */}
            <section className="space-y-2" aria-label="Aankomende afspraken">
              {visibleUpcoming.length > 0 ? (
                <div className="space-y-1.5">
                  {visibleUpcoming.map((event) => (
                    <PersonalEventItem
                      key={event.eventId}
                      event={event}
                      isToday={event.startDatum === today}
                      onEdit={onEditEvent}
                      onRefetch={refetch}
                      conflictInfo={conflictMap.get(event.eventId)}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-3 text-xs text-slate-500">
                  Geen items binnen dit filter.
                </p>
              )}
              {filteredUpcoming.length > 8 && (
                <button
                  type="button"
                  onClick={() => setShowAllUpcoming((v) => !v)}
                  aria-expanded={showAllUpcoming}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-white/[0.02] px-4 py-2 text-xs font-semibold text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-slate-200 cursor-pointer"
                >
                  {showAllUpcoming ? "Toon minder" : `Toon alle ${filteredUpcoming.length}`}
                </button>
              )}
            </section>
          </>
        );
      })()}

      {/* ── Nog niet in Google (wachtrij) ───────────────────────────────── */}
      {pending.length > 0 && (
        <section className="space-y-2 rounded-xl border border-indigo-500/25 bg-indigo-500/[0.06] p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
            <Zap size={11} aria-hidden="true" />
            Nog niet in Google Calendar ({pending.length})
          </p>
          <div className="space-y-1">
            {pending.map(e => (
              <div key={e.eventId}
                className="flex items-center justify-between rounded-lg bg-indigo-500/[0.08] px-3 py-1.5 text-xs">
                <div>
                  <span className="font-medium text-slate-200">{e.titel}</span>
                  <span className="ml-2 text-slate-500">
                    {formatShortDate(e.startDatum)} {e.startTijd ? `· ${e.startTijd}` : "· Hele dag"}
                  </span>
                </div>
                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-300">
                  {pendingLabel(e.status)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-[10px] text-slate-500">
              Verwerk nu om direct naar Google Calendar te sturen
            </p>
            <button onClick={handleVerwerk} disabled={processing}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-indigo-500/25 px-3 py-1.5 text-[10px] font-semibold text-indigo-300 transition-all hover:bg-indigo-500/35 disabled:opacity-50">
              <Zap size={10} className={processing ? "animate-pulse" : ""} />
              {processing ? "Verwerken..." : "Verwerk nu"}
            </button>
          </div>
        </section>
      )}

      {/* ── Geschiedenis ─────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <section>
          <button
            onClick={() => setShowHistory(v => !v)}
            aria-expanded={showHistory}
            className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-300 cursor-pointer"
          >
            <History size={12} aria-hidden="true" />
            Historie ({history.length})
            <ChevronDown
              size={13}
              aria-hidden="true"
              className={cn("transition-transform", showHistory && "rotate-180")}
            />
          </button>
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {/* Geen opacity-dimming op de lijst — de items zelf gebruiken al
                    gedempte maar AA-leesbare tekstkleuren (audit K15). */}
                <div className="glass min-w-0 divide-y divide-[var(--color-border)] overflow-hidden rounded-xl border border-[var(--color-border)]">
                  {history.map(e => (
                    <div key={e.eventId} className="px-4 py-0.5">
                      <PersonalEventItem event={e} onEdit={onEditEvent} />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}
      {upcoming.length === 0 && !isLoading && (
        <div className="flex justify-center pt-2">
          {onNewEvent && (
            <button onClick={onNewEvent}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 hover:bg-indigo-500/20 transition-all cursor-pointer">
              <Plus size={14} /> Eerste afspraak aanmaken
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Nederlandse badge voor wachtrij-items — zelfde vocabulaire als PersonalEventItem. */
function pendingLabel(status: string) {
  switch (status) {
    case "PendingCreate": return "Nieuw";
    case "PendingUpdate": return "Wijziging";
    case "PendingDelete": return "Verwijderen";
    default: return "Wachtrij";
  }
}
