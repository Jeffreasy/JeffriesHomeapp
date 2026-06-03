"use client";

import { useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { personalEventsApi, type PersonalEventRow } from "@/lib/api";
import { useUser } from "@clerk/nextjs";
import { type PersonalEvent } from "@/hooks/usePersonalEvents";
import { getAmsterdamTodayIso } from "@/components/schedule/AgendaUtils";
import { useToast } from "@/components/ui/Toast";
import { AppIcon } from "@/components/ui/AppIcon";
import { EVENT_CATEGORY_SYMBOLS } from "@/lib/symbols";

const CATEGORIES = EVENT_CATEGORY_SYMBOLS;

type CategoryId = typeof CATEGORIES[number]["id"];

function parseCategoryFromDescription(desc?: string): CategoryId {
  const match = desc?.match(/\[categorie:(\w+)\]/);
  return (match?.[1] as CategoryId) ?? "overig";
}

function stripCategoryTag(desc: string): string {
  return desc.replace(/\s*\[categorie:\w+\]/, "").trim();
}

function nextPendingStatus(editEvent?: PersonalEvent | null) {
  if (!editEvent) return "PendingCreate";
  if (editEvent.status === "PendingCreate") return "PendingCreate";
  return "PendingUpdate";
}

interface CreateEventModalProps {
  open:       boolean;
  onClose:    () => void;
  onSuccess?: () => void | Promise<void>;
  editEvent?: PersonalEvent | null;
}

export function CreateEventModal({ open, onClose, onSuccess, editEvent }: CreateEventModalProps) {
  const { user }  = useUser();
  const { success, toast } = useToast();

  const today = getAmsterdamTodayIso();

  const [titel,        setTitel]        = useState("");
  const [startDatum,   setStartDatum]   = useState(today);
  const [eindDatum,    setEindDatum]    = useState(today);
  const [heledag,      setHeledag]      = useState(false);
  const [startTijd,    setStartTijd]    = useState("09:00");
  const [eindTijd,     setEindTijd]     = useState("10:00");
  const [locatie,      setLocatie]      = useState("");
  const [beschrijving, setBeschrijving] = useState("");
  const [categorie,    setCategorie]    = useState<CategoryId>("overig");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");

  const reset = useCallback(() => {
    setTitel(""); setStartDatum(today); setEindDatum(today);
    setHeledag(true); setStartTijd("09:00"); setEindTijd("10:00");
    setLocatie(""); setBeschrijving(""); setCategorie("overig"); setError("");
  }, [today]);

  useEffect(() => {
    if (open) {
      if (editEvent) {
        setTitel(editEvent.titel);
        setStartDatum(editEvent.startDatum);
        setEindDatum(editEvent.eindDatum);
        setHeledag(editEvent.heledag);
        setStartTijd(editEvent.startTijd ?? "09:00");
        setEindTijd(editEvent.eindTijd ?? "10:00");
        setLocatie(editEvent.locatie ?? "");
        setCategorie(parseCategoryFromDescription(editEvent.beschrijving));
        setBeschrijving(stripCategoryTag(editEvent.beschrijving ?? ""));
        setError("");
      } else {
        reset();
      }
    }
  }, [open, editEvent, reset]);

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!titel.trim()) { setError("Titel is verplicht"); return; }
    if (eindDatum < startDatum) { setError("Einddatum mag niet vóór startdatum zijn"); return; }
    if (!heledag && startDatum === eindDatum && eindTijd <= startTijd) {
      setError("Eindtijd moet na starttijd liggen");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const rawDesc = beschrijving.trim();
      const fullDesc = rawDesc
        ? `${rawDesc} [categorie:${categorie}]`
        : `[categorie:${categorie}]`;

      const row: PersonalEventRow = {
        user_id:      user.id,
        event_id:     editEvent?.eventId ?? crypto.randomUUID(),
        titel:        titel.trim(),
        start_datum:  startDatum,
        eind_datum:   eindDatum,
        heledag,
        start_tijd:   heledag ? null : startTijd || null,
        eind_tijd:    heledag ? null : eindTijd  || null,
        locatie:      locatie.trim() || null,
        beschrijving: fullDesc || null,
        conflict_met_dienst: null,
        status:       nextPendingStatus(editEvent),
        kalender:     editEvent?.kalender ?? "Main",
      };

      const result = await personalEventsApi.upsert(row);
      if (result.instantSync) {
        success(editEvent ? "Afspraak direct bijgewerkt in Google Calendar" : "Afspraak direct gesynchroniseerd met Google Calendar");
      } else {
        toast(result.syncError
          ? "Afspraak opgeslagen; Google sync blijft in de wachtrij."
          : "Afspraak opgeslagen en staat in de Google Calendar wachtrij.",
        "info");
      }
      await onSuccess?.();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan mislukt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1,    y: 0   }}
            exit={{   opacity: 0, scale: 0.95, y: 16  }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto"
          >
            <div className="glass rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <AppIcon name="agenda" tone="indigo" size="sm" />
                  {editEvent ? "Afspraak wijzigen" : "Nieuwe afspraak"}
                </h2>
                <button
                  type="button"
                  aria-label="Afspraakmodal sluiten"
                  onClick={handleClose}
                  className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                  <AppIcon name="close" tone="slate" size="sm" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">

                {/* Titel */}
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                    Titel *
                  </label>
                  <input
                    type="text"
                    value={titel}
                    onChange={e => setTitel(e.target.value)}
                    placeholder="bijv. Verjaardag Mama"
                    required
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>

                {/* Hele dag toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Hele dag
                  </label>
                  <button type="button" onClick={() => setHeledag(v => !v)}
                    className="relative w-10 h-5 rounded-full transition-colors cursor-pointer"
                    style={{ background: heledag ? "#6366f1" : "rgba(255,255,255,0.1)" }}>
                    <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                      style={{ left: heledag ? "calc(100% - 18px)" : "2px" }} />
                  </button>
                </div>

                {/* Datum */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                      <AppIcon name="calendar" tone="slate" size="xs" /> Start
                    </label>
                    <input type="date" value={startDatum}
                      onChange={e => { setStartDatum(e.target.value); if (e.target.value > eindDatum) setEindDatum(e.target.value); }}
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                      <AppIcon name="calendar" tone="slate" size="xs" /> Eind
                    </label>
                    <input type="date" value={eindDatum} min={startDatum}
                      onChange={e => setEindDatum(e.target.value)}
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                    />
                  </div>
                </div>

                {/* Tijd (alleen bij niet-hele-dag) */}
                {!heledag && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} className="grid grid-cols-2 gap-3 overflow-hidden">
                    <div>
                      <label className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                        <AppIcon name="time" tone="slate" size="xs" /> Van
                      </label>
                      <input type="time" value={startTijd} onChange={e => setStartTijd(e.target.value)}
                        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                        <AppIcon name="time" tone="slate" size="xs" /> Tot
                      </label>
                      <input type="time" value={eindTijd} onChange={e => setEindTijd(e.target.value)}
                        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Locatie */}
                <div>
                  <label className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                    <AppIcon name="location" tone="slate" size="xs" /> Locatie (optioneel)
                  </label>
                  <input type="text" value={locatie} onChange={e => setLocatie(e.target.value)}
                    placeholder="bijv. Amsterdam"
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>

                {/* Categorie */}
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                    Categorie
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {CATEGORIES.map(({ id, icon, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setCategorie(id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
                          categorie === id
                            ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                            : "bg-[var(--color-surface)] text-slate-500 border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] hover:text-slate-300"
                        }`}
                      >
                        <AppIcon name={icon} tone={categorie === id ? "indigo" : "slate"} size="xs" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Beschrijving */}
                <div>
                  <label className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                    <AppIcon name="note" tone="slate" size="xs" /> Notitie (optioneel)
                  </label>
                  <textarea value={beschrijving} onChange={e => setBeschrijving(e.target.value)}
                    rows={2} placeholder="Aantekeningen..."
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                  />
                </div>

                {/* Error */}
                {error && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                {/* Info */}
                <p className="text-[10px] text-slate-600">
                  {editEvent
                    ? "Wijzigingen worden direct naar Google Calendar gepusht. Als Google niet reageert, blijft de actie in de Render-wachtrij."
                    : "Afspraak wordt direct naar Google Calendar gepusht. Als Google niet reageert, blijft de actie in de Render-wachtrij."
                  }
                </p>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={handleClose}
                    className="flex-1 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-300 border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-all cursor-pointer">
                    Annuleren
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 py-2 rounded-xl text-sm font-medium text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 hover:bg-indigo-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
                    <AppIcon name={editEvent ? "save" : "add"} tone="indigo" size="xs" />
                    {loading ? "Bezig..." : (editEvent ? "Opslaan" : "Aanmaken")}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
