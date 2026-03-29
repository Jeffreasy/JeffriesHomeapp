"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Lightbulb, Calendar, CalendarDays, Landmark, Zap, ChevronRight,
  TrendingUp, Power, Circle, Plus, Eye, EyeOff,
} from "lucide-react";
import Link from "next/link";
import { useDevices, useLampCommand } from "@/hooks/useHomeapp";
import { useSchedule } from "@/hooks/useSchedule";
import { useSalary } from "@/hooks/useSalary";
import { useLoonstroken } from "@/hooks/useLoonstroken";
import { usePersonalEvents, type PersonalEvent } from "@/hooks/usePersonalEvents";
import { NextShiftCard } from "@/components/schedule/NextShiftCard";
import { PersonalEventItem } from "@/components/schedule/PersonalEventItem";
import { CreateEventModal } from "@/components/schedule/CreateEventModal";
import { usePrivacy } from "@/hooks/usePrivacy";
import { CUSTOM_SCENES } from "@/lib/scenes";

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.97 }}
        className="glass rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
      >
        <div className="flex items-start justify-between">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
          >
            <Icon size={17} style={{ color: accent }} />
          </div>
          <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors mt-1" />
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">{label}</p>
          {sub && <p className="text-[11px] text-slate-600 mt-0.5">{sub}</p>}
        </div>
      </motion.div>
    </Link>
  );
}

// ─── Quick Scene Pill ─────────────────────────────────────────────────────────

function QuickScene({
  scene,
  onApply,
}: {
  scene: (typeof CUSTOM_SCENES)[0];
  onApply: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={onApply}
      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium border border-white/8 hover:border-white/15 transition-all shrink-0"
      style={{ background: `${scene.color}12` }}
    >
      <Circle size={8} style={{ color: scene.color, fill: scene.color }} />
      <span className="text-slate-300">{scene.label}</span>
    </motion.button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: devices = [] } = useDevices();
  const { mutate: sendCommand } = useLampCommand();
  const { nextDienst, thisWeek } = useSchedule();
  const { huidig: salarisHuidig } = useSalary();
  const loonstroken = useLoonstroken();
  const { upcoming: upcomingEvents, eventsByDate, conflictMap } = usePersonalEvents({ diensten: thisWeek });
  const { hidden: privacyOn, toggle: togglePrivacy, mask } = usePrivacy();

  // Werkelijk salaris (loonstrook) of berekend (prognose)
  const nu = new Date();
  const huidigePeriode = `${nu.getFullYear()}-${String(nu.getMonth() + 1).padStart(2, "0")}`;
  const werkelijkNetto = loonstroken.byPeriode.get(huidigePeriode)?.netto;
  const nettoLabel = werkelijkNetto ? "Netto salaris" : "Netto prognose";
  const nettoValue = werkelijkNetto ?? salarisHuidig?.nettoPrognose;
  const nettoSub = werkelijkNetto ? "loonstrook" : "berekend";

  // Edit modal state
  const [editEvent, setEditEvent] = useState<PersonalEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const handleEditEvent = (evt: PersonalEvent) => {
    setEditEvent(evt);
    setModalOpen(true);
  };
  const openNewEvent = () => { setEditEvent(null); setModalOpen(true); };

  const onlineDevices = devices.filter((d) => d.status === "online");
  const onDevices = devices.filter((d) => d.current_state?.on);
  const allOn = onDevices.length === devices.length && devices.length > 0;

  const toggleAll = () =>
    devices.forEach((d) => sendCommand({ id: d.id, cmd: { on: !allOn } }));

  const applyScene = (scene: (typeof CUSTOM_SCENES)[0]) => {
    onlineDevices.forEach((d) =>
      sendCommand({ id: d.id, cmd: scene.command })
    );
  };

  // Greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 6 ? "Goedenacht" : hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";

  const today = new Date().toLocaleDateString("nl-NL", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "#0a0a0f" }}>
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{greeting} 👋</h1>
            <p className="text-sm text-slate-500 mt-0.5 capitalize">{today}</p>
          </div>

          {/* Master lamp toggle */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={toggleAll}
            title="Alle lampen aan/uit"
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
              allOn
                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                : "bg-white/5 text-slate-400 border-white/10"
            }`}
          >
            <Power size={13} />
            <span className="hidden sm:inline">{allOn ? "Uit" : "Aan"}</span>
          </motion.button>

          {/* Privacy toggle */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={togglePrivacy}
            title={privacyOn ? "Bedragen tonen" : "Bedragen verbergen"}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium border transition-all ${
              privacyOn
                ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                : "bg-white/5 text-slate-500 border-white/10 hover:text-slate-300"
            }`}
          >
            {privacyOn ? <EyeOff size={13} /> : <Eye size={13} />}
          </motion.button>
        </div>
      </header>

      <main className="px-6 py-5 space-y-7 max-w-3xl mx-auto">

        {/* ─── Stats grid ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={Lightbulb}
            label="Verlichting"
            value={`${onDevices.length} / ${devices.length}`}
            sub={`${onlineDevices.length} online`}
            accent="#f59e0b"
            href="/lampen"
          />
          <StatCard
            icon={Calendar}
            label="Diensten"
            value={thisWeek?.length ? `${thisWeek.length}` : "—"}
            sub="deze week"
            accent="#60a5fa"
            href="/rooster"
          />
          <StatCard
            icon={Landmark}
            label={nettoLabel}
            value={mask(
              nettoValue
                ? `€ ${nettoValue.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}`
                : "—"
            )}
            sub={nettoSub}
            accent="#34d399"
            href="/rooster"
          />
          <StatCard
            icon={CalendarDays}
            label="Afspraken"
            value={upcomingEvents.length ? `${upcomingEvents.length}` : "—"}
            sub="aankomend"
            accent="#818cf8"
            href="/rooster"
          />
        </div>

        {/* ─── Quick scenes ─────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Snelle scènes</p>
            <Link href="/lampen" className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors flex items-center gap-1">
              Alle lampen <ChevronRight size={12} />
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CUSTOM_SCENES.map((scene) => (
              <QuickScene
                key={scene.id}
                scene={scene}
                onApply={() => applyScene(scene)}
              />
            ))}
            {/* Alles uit */}
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() =>
                onlineDevices.forEach((d) =>
                  sendCommand({ id: d.id, cmd: { on: false } })
                )
              }
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium border border-white/8 hover:border-white/15 bg-white/5 transition-all shrink-0"
            >
              <Power size={12} className="text-slate-400" />
              <span className="text-slate-400">Uit</span>
            </motion.button>
          </div>
        </section>

        {/* ─── Next shift ───────────────────────────────────────────────────── */}
        {nextDienst && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Volgende dienst</p>
              <Link href="/rooster" className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors flex items-center gap-1">
                Rooster <ChevronRight size={12} />
              </Link>
            </div>
            <NextShiftCard dienst={nextDienst} compact afspraken={nextDienst ? eventsByDate[nextDienst.startDatum] : undefined} conflictMap={conflictMap} />
          </section>
        )}

        {/* ─── Aankomende afspraken ────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Aankomende afspraken</p>
            <div className="flex items-center gap-2">
              <button
                onClick={openNewEvent}
                className="flex items-center gap-1 text-xs text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
              >
                <Plus size={11} /> Nieuw
              </button>
              <Link href="/rooster" className="text-xs text-indigo-400/70 hover:text-indigo-400 transition-colors flex items-center gap-1">
                Agenda <ChevronRight size={12} />
              </Link>
            </div>
          </div>

          {upcomingEvents.length > 0 ? (
            <>
              <div className="glass rounded-xl border border-white/5 divide-y divide-white/5 overflow-hidden">
                {upcomingEvents.slice(0, 5).map(evt => (
                  <div key={evt.eventId} className="px-3 py-0.5">
                    <PersonalEventItem
                      event={evt}
                      isToday={evt.startDatum === new Date().toISOString().slice(0, 10)}
                      onEdit={handleEditEvent}
                      conflictInfo={conflictMap.get(evt.eventId)}
                    />
                  </div>
                ))}
              </div>
              {upcomingEvents.length > 5 && (
                <Link
                  href="/rooster"
                  className="block text-center text-xs text-indigo-400/70 hover:text-indigo-400 mt-2 transition-colors"
                >
                  +{upcomingEvents.length - 5} meer bekijken
                </Link>
              )}
            </>
          ) : (
            <div className="glass rounded-xl border border-dashed border-white/10 p-6 text-center">
              <CalendarDays size={24} className="text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 mb-3">Geen aankomende afspraken</p>
              <button
                onClick={openNewEvent}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                <Plus size={12} /> Afspraak aanmaken
              </button>
            </div>
          )}
        </section>

        {/* ─── Quick links grid ─────────────────────────────────────────────── */}
        <section>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Navigeer naar</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: "/lampen",     icon: Lightbulb, label: "Verlichting",  sub: `${devices.length} lampen`,  accent: "#f59e0b" },
              { href: "/rooster",    icon: Calendar,  label: "Rooster",      sub: "Diensten & agenda",          accent: "#60a5fa" },
              { href: "/finance",    icon: Landmark,  label: "Finance",      sub: "Salaris & transacties",      accent: "#34d399" },
              { href: "/automations",icon: Zap,       label: "Automations",  sub: "Schema & triggers",          accent: "#a78bfa" },
            ].map(({ href, icon: Icon, label, sub, accent }) => (
              <Link key={href} href={href}>
                <motion.div
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  className="glass rounded-xl p-3.5 border border-white/5 hover:border-white/10 flex items-center gap-3 transition-all group cursor-pointer"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${accent}15`, border: `1px solid ${accent}25` }}
                  >
                    <Icon size={15} style={{ color: accent }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{label}</p>
                    <p className="text-[11px] text-slate-500">{sub}</p>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </section>

      </main>

      {/* Edit modal */}
      <CreateEventModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditEvent(null); }}
        editEvent={editEvent}
      />
    </div>
  );
}
