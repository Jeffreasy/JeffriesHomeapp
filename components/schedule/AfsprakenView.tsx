"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { AlertTriangle, Calendar, CalendarClock, CalendarDays, Plus, Zap } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { usePersonalEvents, type PersonalEvent } from "@/hooks/usePersonalEvents";
import { type DienstRow } from "@/lib/schedule";
import { useToast } from "@/components/ui/Toast";
import { StatChip } from "@/components/ui/StatChip";
import { PersonalEventItem } from "./PersonalEventItem";
import { getAmsterdamTodayIso } from "./RoosterUtils";
import { syncApi } from "@/lib/api";

interface AfsprakenViewProps {
  diensten?:    DienstRow[];
  onEditEvent?: (evt: PersonalEvent) => void;
  onNewEvent?:  () => void;
}

export function AfsprakenView({ diensten, onEditEvent, onNewEvent }: AfsprakenViewProps) {
  const { upcoming, history, withConflicts, pending, isLoading, refetch } =
    usePersonalEvents({ diensten });

  const { user } = useUser();
  const { success, error, toast } = useToast();
  const [processing, setProcessing] = useState(false);

  const handleVerwerk = async () => {
    if (!user?.id) { error("Niet ingelogd"); return; }
    setProcessing(true);
    try {
      const result = await syncApi.calendar(user.id);
      await refetch();
      if (result.pendingError) {
        toast(`Agenda opgehaald; wachtrij faalde: ${shortSyncError(result.pendingError)}`, "info");
      } else {
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

      {/* ── Stats chips ──────────────────────────────────────────────────── */}
      {upcoming.length > 0 && (
        <section className="flex flex-wrap items-center gap-1.5" aria-label="Afspraken-overzicht">
          <StatChip icon={CalendarClock} label="Aankomend" value={String(upcoming.length)} tone="indigo" />
          <StatChip
            icon={CalendarDays}
            label="Deze maand"
            value={String(upcoming.filter((e) => e.startDatum.slice(0, 7) === today.slice(0, 7)).length)}
            tone="slate"
          />
          <StatChip
            icon={AlertTriangle}
            label="Conflicten"
            value={String(withConflicts.length)}
            meta={withConflicts.length > 0 ? "te controleren" : "geen conflicten"}
            tone={withConflicts.length > 0 ? "amber" : "green"}
          />
        </section>
      )}

      {/* ── In wachtrij (PendingCreate) ──────────────────────────────────── */}
      {pending.length > 0 && (
        <section className="rounded-xl border p-4 space-y-2"
          style={{ background: "rgba(99,102,241,0.06)", borderColor: "rgba(99,102,241,0.25)" }}>
          <p className="text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5"
            style={{ color: "#818cf8" }}>
            ⏳ Wacht op verwerking ({pending.length})
          </p>
          <div className="space-y-1">
            {pending.map(e => (
              <div key={e.eventId}
                className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg"
                style={{ background: "rgba(99,102,241,0.08)" }}>
                <div>
                  <span className="text-slate-200 font-medium">{e.titel}</span>
                  <span className="text-slate-500 ml-2">
                    {e.startDatum} {e.startTijd ? `· ${e.startTijd}` : "· Hele dag"}
                  </span>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8" }}>
                  PENDING
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-[10px] text-slate-500">
              Verwerk nu om direct naar Google Calendar te sturen
            </p>
            <button onClick={handleVerwerk} disabled={processing}
              className="flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-50"
              style={{ background: "rgba(99,102,241,0.25)", color: "#818cf8" }}>
              <Zap size={10} className={processing ? "animate-pulse" : ""} />
              {processing ? "Verwerken..." : "Verwerk nu"}
            </button>
          </div>
        </section>
      )}

      {/* ── Aankomend Beheer (Optioneel) ──────────────────────────────────────── */}
      <p className="text-xs text-slate-500 mb-2">Je actieve afspraken worden nu weergegeven in de Overzicht-tab.</p>

      {/* ── Geschiedenis ─────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <section>
          <button
            onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-2 text-[10px] text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-wider mb-3"
          >
            <span>⏱</span> Geschiedenis ({history.length}) {showHistory ? "▾" : "▸"}
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
                <div className="glass rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)] overflow-hidden opacity-60 min-w-0">
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

function shortSyncError(error: string) {
  return error.length > 140 ? `${error.slice(0, 137)}...` : error;
}
