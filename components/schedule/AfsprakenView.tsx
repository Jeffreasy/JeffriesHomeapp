"use client";

import { AnimatePresence, motion } from "framer-motion";
import { uiMotion } from "@/lib/ui/motion";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Calendar, CalendarClock, CalendarDays, ChevronDown, History, Plus, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { usePersonalEvents, type PersonalEvent } from "@/hooks/usePersonalEvents";
import { type DienstRow } from "@/lib/schedule";
import { useToast } from "@/components/ui/Toast";
import { StatChip } from "@/components/ui/StatChip";
import { Button } from "@/components/ui/Button";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { Skeleton } from "@/components/ui/Skeleton";
import { surfaceVariants } from "@/components/ui/Surface";
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
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  // Fout ≠ leeg (audit DEEL 2 #6): een mislukte fetch mag niet als "geen
  // afspraken gevonden" verschijnen — anders lijkt een 500 een lege agenda.
  if (eventsError && upcoming.length === 0 && history.length === 0 && pending.length === 0) {
    return (
      <FeedbackState
        tone="error"
        icon={AlertTriangle}
        title="Afspraken konden niet worden geladen"
        description={eventsError instanceof Error ? eventsError.message : "Controleer je verbinding en probeer het opnieuw."}
        actionLabel="Opnieuw proberen"
        onAction={() => void refetch()}
      />
    );
  }

  if (upcoming.length === 0 && history.length === 0 && pending.length === 0) {
    return (
      <FeedbackState
        icon={Calendar}
        title="Geen afspraken gevonden"
        description="Gebruik Agenda om te synchroniseren of maak direct een nieuwe afspraak."
        actionLabel={onNewEvent ? "Eerste afspraak aanmaken" : undefined}
        onAction={onNewEvent}
      />
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
                tone="info"
                onClick={() => selectFilter("aankomend")}
                active={upcomingFilter === "aankomend"}
              />
              <StatChip
                icon={CalendarDays}
                label="Deze maand"
                value={String(thisMonthEvents.length)}
                tone="neutral"
                onClick={() => selectFilter("maand")}
                active={upcomingFilter === "maand"}
              />
              <StatChip
                icon={AlertTriangle}
                label="Conflicten"
                value={String(withConflicts.length)}
                meta={withConflicts.length > 0 ? "te controleren" : "geen conflicten"}
                tone={withConflicts.length > 0 ? "warning" : "success"}
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
                <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-3 text-xs text-[var(--color-text-muted)]">
                  Geen items binnen dit filter.
                </p>
              )}
              {filteredUpcoming.length > 8 && (
                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  onClick={() => setShowAllUpcoming((v) => !v)}
                  aria-expanded={showAllUpcoming}
                >
                  {showAllUpcoming ? "Toon minder" : `Toon alle ${filteredUpcoming.length}`}
                </Button>
              )}
            </section>
          </>
        );
      })()}

      {/* ── Nog niet in Google (wachtrij) ───────────────────────────────── */}
      {pending.length > 0 && (
        <section className="space-y-2 rounded-xl border border-[var(--color-info-border)] bg-[var(--color-info-subtle)] p-4">
          <p className="flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wider text-[var(--color-info)]">
            <Zap size={11} aria-hidden="true" />
            Nog niet in Google Calendar ({pending.length})
          </p>
          <div className="space-y-1">
            {pending.map(e => (
              <div key={e.eventId}
                className="flex items-center justify-between rounded-lg bg-[var(--color-info-subtle)] px-3 py-1.5 text-xs">
                <div>
                  <span className="font-medium text-[var(--color-text)]">{e.titel}</span>
                  <span className="ml-2 text-[var(--color-text-muted)]">
                    {formatShortDate(e.startDatum)} {e.startTijd ? `· ${e.startTijd}` : "· Hele dag"}
                  </span>
                </div>
                <span className="rounded-full bg-[var(--color-info-subtle)] px-2 py-0.5 text-micro font-bold uppercase tracking-wider text-[var(--color-info)]">
                  {pendingLabel(e.status)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-micro text-[var(--color-text-muted)]">
              Verwerk nu om direct naar Google Calendar te sturen
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleVerwerk}
              loading={processing}
              loadingLabel="Verwerken…"
            >
              <Zap size={10} className={processing ? "animate-pulse motion-reduce:animate-none" : ""} />
              Verwerk nu
            </Button>
          </div>
        </section>
      )}

      {/* ── Geschiedenis ─────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowHistory(v => !v)}
            aria-expanded={showHistory}
            className="mb-3 flex min-h-[var(--touch-target)] items-center gap-2 text-micro uppercase tracking-wider text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] cursor-pointer"
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
                transition={{ duration: uiMotion.durationSeconds.standard }}
                className="overflow-hidden"
              >
                {/* Geen opacity-dimming op de lijst — de items zelf gebruiken al
                    gedempte maar AA-leesbare tekstkleuren (audit K15). */}
                <div className={cn(surfaceVariants({ padding: "none", radius: "md" }), "divide-y divide-[var(--color-border)] overflow-hidden")}>
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
            <Button onClick={onNewEvent} variant="secondary">
              <Plus size={14} /> Eerste afspraak aanmaken
            </Button>
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
