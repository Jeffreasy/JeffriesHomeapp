"use client";

import { useRef, useState } from "react";
import { RefreshCw, Calendar, Upload, BarChart2, List, Euro, CalendarDays, Zap, Plus } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useAction } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useSchedule } from "@/hooks/useSchedule";
import { usePersonalEvents } from "@/hooks/usePersonalEvents";
import { useToast } from "@/components/ui/Toast";
import { NextShiftCard } from "@/components/schedule/NextShiftCard";
import { DienstItem } from "@/components/schedule/DienstItem";
import { StatsView } from "@/components/schedule/StatsView";
import { SalarisView } from "@/components/schedule/SalarisView";
import { AfsprakenView } from "@/components/schedule/AfsprakenView";
import { PersonalEventItem } from "@/components/schedule/PersonalEventItem";
import { CreateEventModal } from "@/components/schedule/CreateEventModal";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import {
  groupByWeekNr,
  calcTotalHours,
  shiftBreakdown,
  teamBreakdown,
  getHistory,
} from "@/lib/schedule";
import { generateUnifiedTimeline } from "@/lib/unified";
import { type PersonalEvent } from "@/hooks/usePersonalEvents";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { api } from "@/convex/_generated/api";

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div className="glass rounded-xl px-4 py-3 flex-1 min-w-0 border border-white/5"
      style={accent ? { borderColor: accent + "25" } : undefined}>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-bold leading-none" style={{ color: accent ?? "#e2e8f0" }}>{value}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Week header ──────────────────────────────────────────────────────────────

function WeekHeader({ weeknr, count, hours, open, onToggle }: {
  weeknr: string; count: number; hours: number; open: boolean; onToggle: () => void;
}) {
  return (
    <button onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/3 hover:bg-white/6 transition-colors border border-white/5">
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-slate-300">Week {weeknr}</span>
        <span className="text-[10px] text-slate-600">{count} diensten · {hours}u</span>
      </div>
      <div style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "overzicht" | "statistieken" | "salaris" | "afspraken_beheer";

export default function RoosterPage() {
  const {
    diensten,
    nextDienst,
    upcoming,
    meta,
    isLoading,
    importXlsx,
    clear,
  } = useSchedule();

  const { success, error } = useToast();
  const { user } = useUser();
  const fileRef = useRef<HTMLInputElement>(null);
  const today   = new Date().toISOString().slice(0, 10);

  // Load personal events with smart conflict detection
  const { 
    upcoming: upcomingEvents,
    eventsByDate,
    conflictMap
  } = usePersonalEvents({ diensten: upcoming });

  // Modal control
  const [modalOpen, setModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<PersonalEvent | null>(null);

  const openNewEvent = () => {
    setEditEvent(null);
    setModalOpen(true);
  };

  const handleEditEvent = (evt: PersonalEvent) => {
    setEditEvent(evt);
    setModalOpen(true);
  };

  // Convex native calendar syncs
  const syncSchedule = useAction(api.actions.syncSchedule.syncNow);
  const syncPersonal = useAction(api.actions.syncPersonalEvents.syncPersonalNow);

  const [calSyncing, setCalSyncing] = useState(false);
  const handleCalendarSync = async () => {
    if (!user?.id) { error("Niet ingelogd"); return; }
    setCalSyncing(true);
    try {
      const [scheduleRes, personalRes] = await Promise.allSettled([
        syncSchedule({ userId: user.id }),
        syncPersonal({ userId: user.id })
      ]);

      const scheduleSuccess = scheduleRes.status === "fulfilled";
      const personalSuccess = personalRes.status === "fulfilled";

      if (scheduleSuccess && personalSuccess) {
        success("Beide agenda's gesynchroniseerd via API.");
      } else if (scheduleSuccess || personalSuccess) {
        // We use the same success toast, but with a different message for partial sync
        success("Gedeeltelijk gesynchroniseerd: Een van de agenda's kon niet benaderd worden.");
      } else {
        throw new Error("Failed validation for both actions");
      }
    } catch (err: any) {
      console.error("Cal sync fout:", err);
      error(`Fout bij ophalen: ${err.message}`);
    } finally {
      setCalSyncing(false);
    }
  };

  const [tab,         setTab]         = useState<Tab>("overzicht");
  const [showHistory, setShowHistory] = useState(false);
  const [openWeeks,   setOpenWeeks]   = useState<Set<string>>(new Set());
  const [confirmClear, setConfirmClear] = useState(false);

  // ── Derived for agenda tab ─────────────────────────────────────────────────
  const upcomingHours = calcTotalHours(upcoming);
  const shifts        = shiftBreakdown(upcoming);
  const teams         = teamBreakdown(upcoming);
  const history       = getHistory(diensten);
  const unifiedWeeks  = generateUnifiedTimeline(upcoming, upcomingEvents);

  // Open all weeks on first load
  if (openWeeks.size === 0 && unifiedWeeks.length > 0) {
    setOpenWeeks(new Set(unifiedWeeks.map(w => w.weeknr)));
  }

  const toggleWeek = (wk: string) =>
    setOpenWeeks(prev => {
      const next = new Set(prev);
      next.has(wk) ? next.delete(wk) : next.add(wk);
      return next;
    });


  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await importXlsx(file);
    if (res.ok) success(`${res.count} diensten geïmporteerd`);
    else error(`Import mislukt: ${res.error}`);
    e.target.value = "";
  };

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar size={18} className="text-amber-400" />
              Rooster
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {meta
                ? `${meta.totalRows} diensten · gesynct ${new Date(meta.importedAt).toLocaleDateString("nl", { day: "numeric", month: "short" })}`
                : "Geen rooster gesynchroniseerd"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {meta && (
              confirmClear ? (
                <div className="flex items-center gap-1 bg-red-950/40 border border-red-500/20 rounded-lg px-2 py-1">
                  <span className="text-[10px] text-red-400 font-medium">Wissen?</span>
                  <button onClick={() => { clear(); setConfirmClear(false); }}
                    className="text-[10px] text-red-500 font-bold px-1 hover:bg-red-500/20 rounded">Ja</button>
                  <button onClick={() => setConfirmClear(false)}
                    className="text-[10px] text-slate-400 px-1 hover:bg-slate-700/50 rounded">Nee</button>
                </div>
              ) : (
                <button onClick={() => {
                  setConfirmClear(true);
                  setTimeout(() => setConfirmClear(false), 3000);
                }} className="text-xs text-slate-600 hover:text-red-400 transition-colors px-2 py-1 hidden sm:block">
                  Wissen
                </button>
              )
            )}
            <button onClick={() => fileRef.current?.click()} disabled={isLoading}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-400 hover:text-slate-200 transition-all">
              <Upload size={12} /><span className="hidden sm:inline">XLSX</span>
            </button>

            <button onClick={handleCalendarSync} disabled={calSyncing}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs sm:text-sm font-medium hover:bg-amber-500/25 transition-all cursor-pointer disabled:opacity-50">
              <Zap size={13} className={calSyncing ? "animate-pulse" : ""} />
              <span className="hidden sm:inline">{calSyncing ? "Syncing..." : "Sync Agenda"}</span>
              <span className="sm:hidden">{calSyncing ? "..." : "Sync"}</span>
            </button>
            <button onClick={openNewEvent}
              className="flex items-center justify-center w-9 h-9 sm:w-auto sm:px-3 sm:py-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 text-sm font-medium hover:bg-indigo-500/25 transition-all cursor-pointer">
              <Plus size={16} />
              <span className="hidden sm:inline ml-1.5">+ Afspraak</span>
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
          {([
            { id: "overzicht",        label: "Overzicht",    icon: List         },
            { id: "statistieken",     label: "Statistieken", icon: BarChart2    },
            { id: "salaris",          label: "Salaris",      icon: Euro         },
            { id: "afspraken_beheer", label: "Beheer",       icon: CalendarDays },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all border",
                tab === id
                  ? "bg-amber-500/12 text-amber-400 border-amber-500/30"
                  : "text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5"
              )}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-6 py-6 max-w-3xl mx-auto space-y-6">

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {!meta && !nextDienst && (
          <div className="glass rounded-2xl p-10 text-center border border-dashed border-white/10">
            <Calendar size={36} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-slate-300 mb-1">Rooster ophalen</h3>
            <p className="text-sm text-slate-500 mb-5">
              Synchroniseer je dienstenrooster vanuit Google Sheets of upload een .xlsx bestand.
            </p>
            <button onClick={handleCalendarSync} disabled={calSyncing}
              className="px-5 py-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 text-sm font-medium hover:bg-amber-500/25 transition-colors inline-flex items-center gap-2 mx-auto">
              <Zap size={13} className={calSyncing ? "animate-pulse" : ""} />
              {calSyncing ? "Bezig met syncing..." : "Sync Google Agenda"}
            </button>
          </div>
        )}

        {/* ════════════════════  OVERZICHT TAB (UNIFIED)  ════════════════════ */}
        {tab === "overzicht" && (
          <>
            {/* Stats bar */}
            {unifiedWeeks.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Komende uren"  value={`${upcomingHours}u`} sub={`${upcoming.length} diensten`}   accent="#f59e0b" />
                <StatCard label="Vroeg / Laat"  value={`${shifts["Vroeg"] ?? 0} / ${shifts["Laat"] ?? 0}`}          sub={`${shifts["Dienst"] ?? 0} dagdienst`} accent="#f97316" />
                <StatCard label="Team R."        value={teams["R."] ?? 0} sub="diensten"  accent="#60a5fa" />
                <StatCard label="Team A."        value={teams["A."] ?? 0} sub="diensten"  accent="#34d399" />
              </div>
            )}

            {/* Volgende dienst */}
            <ErrorBoundary>
              <NextShiftCard
                dienst={nextDienst}
                onImport={handleCalendarSync}
                afspraken={nextDienst ? eventsByDate[nextDienst.startDatum] : undefined}
              />
            </ErrorBoundary>

            {/* Week groups */}
            {unifiedWeeks.length > 0 && (
              <section className="space-y-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Tijdlijn overzicht
                </p>
                {unifiedWeeks.map(({ weeknr, items, werkUren, dienstenAantal }) => {
                  const isOpen = openWeeks.has(weeknr);
                  return (
                    <div key={weeknr}>
                      <WeekHeader weeknr={weeknr} count={dienstenAantal} hours={werkUren} open={isOpen} onToggle={() => toggleWeek(weeknr)} />
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                            <div className="mt-1 glass rounded-xl border border-white/5 divide-y divide-white/5 overflow-hidden">
                              {items.map((item, idx) => (
                                <div key={idx} className="px-4 py-0.5">
                                  {item.type === "dienst" ? (
                                    <DienstItem
                                      dienst={item.data as any}
                                      isToday={item.date === today}
                                      afspraken={eventsByDate[item.date]}
                                    />
                                  ) : (
                                    <PersonalEventItem
                                      event={item.data as PersonalEvent}
                                      isToday={item.date === today}
                                      onEdit={handleEditEvent}
                                      conflictInfo={conflictMap.get((item.data as PersonalEvent).eventId)}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </section>
            )}

            {/* History */}
            {history.length > 0 && (
              <section>
                <button onClick={() => setShowHistory(v => !v)}
                  className="flex items-center gap-2 text-[10px] text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-wider mb-3">
                  <span>⏱</span> Geschiedenis ({history.length})
                  {showHistory ? " ▾" : " ▸"}
                </button>
                <AnimatePresence>
                  {showHistory && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="glass rounded-xl border border-white/5 divide-y divide-white/5 overflow-hidden opacity-60">
                        {history.map(d => (
                          <div key={d.eventId} className="px-4 py-0.5">
                            <DienstItem dienst={d} afspraken={eventsByDate[d.startDatum]} />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            )}
          </>
        )}

        {/* ════════════════════  STATISTIEKEN TAB  ════════════════════ */}
        {tab === "statistieken" && (
          <ErrorBoundary>
            <StatsView diensten={diensten} />
          </ErrorBoundary>
        )}

        {/* ════════════════════  SALARIS TAB  ════════════════════ */}
        {tab === "salaris" && (
          <ErrorBoundary>
            <SalarisView />
          </ErrorBoundary>
        )}

        {/* ════════════════════  AFSPRAKEN TAB  ════════════════════ */}
        {tab === "afspraken_beheer" && (
          <ErrorBoundary>
            <AfsprakenView 
              diensten={upcoming} 
              onEditEvent={handleEditEvent}
            />
          </ErrorBoundary>
        )}

      </main>
      
      {/* Global modal for creating/editing events */}
      <CreateEventModal 
        open={modalOpen} 
        onClose={() => { setModalOpen(false); setEditEvent(null); }} 
        editEvent={editEvent}
      />
    </div>
  );
}
