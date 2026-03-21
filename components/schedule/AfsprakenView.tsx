"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Calendar, AlertTriangle, Clock, Plus, Zap } from "lucide-react";
import { useAction } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { usePersonalEvents } from "@/hooks/usePersonalEvents";
import { useToast } from "@/components/ui/Toast";
import { NextAppointmentCard } from "./NextAppointmentCard";
import { PersonalEventItem } from "./PersonalEventItem";
import { CreateEventModal } from "./CreateEventModal";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { api } from "@/convex/_generated/api";

export function AfsprakenView() {
  const { upcoming, history, withConflicts, nextAppointment, pending, isLoading } =
    usePersonalEvents();

  const { user } = useUser();
  const { success, error } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processPendingNow = useAction((api as any).actions.processPendingCalendar.processPendingNow);
  const [processing, setProcessing] = useState(false);

  const handleVerwerk = async () => {
    if (!user?.id) { error("Niet ingelogd"); return; }
    setProcessing(true);
    try {
      const res = await processPendingNow({ userId: user.id }) as any;
      success(`${res.aangemaakt} afspraak(en) aangemaakt in Google Calendar`);
    } catch (e: any) {
      error(`Verwerken mislukt: ${e.message ?? "onbekende fout"}`);
    } finally {
      setProcessing(false);
    }
  };

  const [showHistory, setShowHistory] = useState(false);
  const [modalOpen,   setModalOpen]   = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-white/3 animate-pulse" />
        ))}
      </div>
    );
  }

  if (upcoming.length === 0 && history.length === 0 && pending.length === 0) {
    return (
      <div className="glass rounded-2xl p-10 text-center border border-dashed border-white/10">
        <Calendar size={36} className="text-slate-600 mx-auto mb-4" />
        <h3 className="text-base font-semibold text-slate-300 mb-1">Geen afspraken gevonden</h3>
        <p className="text-sm text-slate-500">
          Voer een &quot;Sync Persoonlijke Afspraken&quot; uit via Google Sheets menu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      {upcoming.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="glass rounded-xl px-4 py-3 border border-white/5">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Aankomend</p>
            <p className="text-xl font-bold text-indigo-400">{upcoming.length}</p>
          </div>
          <div className="glass rounded-xl px-4 py-3 border border-white/5">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Deze maand</p>
            <p className="text-xl font-bold text-slate-200">
              {upcoming.filter(e => e.startDatum.slice(0, 7) === today.slice(0, 7)).length}
            </p>
          </div>
          <div
            className="glass rounded-xl px-4 py-3 border"
            style={{ borderColor: withConflicts.length > 0 ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.05)" }}
          >
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Conflicten</p>
            <p className="text-xl font-bold" style={{ color: withConflicts.length > 0 ? "#f59e0b" : "#475569" }}>
              {withConflicts.length}
            </p>
          </div>
        </div>
      )}

      {/* ── Volgende afspraak ─────────────────────────────────────────────── */}
      <NextAppointmentCard event={nextAppointment} />

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
              Klik om direct naar Google Calendar te sturen
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

      {/* ── Conflict sectie ──────────────────────────────────────────────── */}
      {withConflicts.length > 0 && (
        <section>
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber-500 mb-2">
            <AlertTriangle size={10} />
            Conflicten met diensten ({withConflicts.length})
          </p>
          <div className="glass rounded-xl border border-amber-500/20 divide-y divide-white/5 overflow-hidden">
            {withConflicts.map(e => (
              <div key={e.eventId} className="px-4 py-0.5">
                <PersonalEventItem event={e} isToday={e.startDatum === today} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Aankomende afspraken ──────────────────────────────────────────── */}
      {upcoming.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock size={10} />
              Komende {upcoming.length} afspraken
            </p>
            <button onClick={() => setModalOpen(true)}
              className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer border border-indigo-500/30 rounded-lg px-2 py-1 hover:bg-indigo-500/10">
              <Plus size={10} /> Toevoegen
            </button>
          </div>
          <div className="glass rounded-xl border border-white/5 divide-y divide-white/5 overflow-hidden">
            {upcoming.map(e => (
              <div key={e.eventId} className="px-4 py-0.5">
                <PersonalEventItem event={e} isToday={e.startDatum === today} />
              </div>
            ))}
          </div>
        </section>
      )}

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
                <div className="glass rounded-xl border border-white/5 divide-y divide-white/5 overflow-hidden opacity-60">
                  {history.map(e => (
                    <div key={e.eventId} className="px-4 py-0.5">
                      <PersonalEventItem event={e} />
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
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 hover:bg-indigo-500/20 transition-all cursor-pointer">
            <Plus size={14} /> Eerste afspraak aanmaken
          </button>
        </div>
      )}

      <CreateEventModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
