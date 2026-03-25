"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, MapPin, FileText, Plus, Save } from "lucide-react";
import { useMutation, useAction } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { type PersonalEvent } from "@/hooks/usePersonalEvents";

interface CreateEventModalProps {
  open:       boolean;
  onClose:    () => void;
  editEvent?: PersonalEvent | null;
}

export function CreateEventModal({ open, onClose, editEvent }: CreateEventModalProps) {
  const { user }  = useUser();
  const createFn  = useMutation(api.personalEvents.create);
  const updateFn  = useAction(api.actions.updatePersonalEvent.updateEvent);

  const today = new Date().toISOString().slice(0, 10);

  const [titel,        setTitel]        = useState("");
  const [startDatum,   setStartDatum]   = useState(today);
  const [eindDatum,    setEindDatum]    = useState(today);
  const [heledag,      setHeledag]      = useState(false);
  const [startTijd,    setStartTijd]    = useState("09:00");
  const [eindTijd,     setEindTijd]     = useState("10:00");
  const [locatie,      setLocatie]      = useState("");
  const [beschrijving, setBeschrijving] = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");

  const reset = () => {
    setTitel(""); setStartDatum(today); setEindDatum(today);
    setHeledag(true); setStartTijd("09:00"); setEindTijd("10:00");
    setLocatie(""); setBeschrijving(""); setError("");
  };

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
        setBeschrijving(editEvent.beschrijving ?? "");
        setError("");
      } else {
        reset();
      }
    }
  }, [open, editEvent]);

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!titel.trim()) { setError("Titel is verplicht"); return; }
    if (eindDatum < startDatum) { setError("Einddatum mag niet vóór startdatum zijn"); return; }

    setLoading(true);
    setError("");
    try {
      const payload = {
        userId:       user.id,
        titel:        titel.trim(),
        startDatum,
        eindDatum,
        heledag,
        startTijd:    heledag ? undefined : startTijd || undefined,
        eindTijd:     heledag ? undefined : eindTijd  || undefined,
        locatie:      locatie.trim()      || undefined,
        beschrijving: beschrijving.trim() || undefined,
      };

      if (editEvent) {
        // Edit flow
        const res = await updateFn({ eventId: editEvent.eventId, ...payload });
        if (!res.ok) throw new Error(res.message);
      } else {
        // Create flow
        await createFn(payload);
      }
      handleClose();
    } catch (err: any) {
      setError(err.message ?? "Opslaan mislukt");
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
            <div className="glass rounded-2xl border border-white/10 shadow-2xl overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Calendar size={14} className="text-indigo-400" />
                  {editEvent ? "Afspraak wijzigen" : "Nieuwe afspraak"}
                </h2>
                <button onClick={handleClose}
                  className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                  <X size={16} />
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
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
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
                      <Calendar size={9} /> Start
                    </label>
                    <input type="date" value={startDatum}
                      onChange={e => { setStartDatum(e.target.value); if (e.target.value > eindDatum) setEindDatum(e.target.value); }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                      <Calendar size={9} /> Eind
                    </label>
                    <input type="date" value={eindDatum} min={startDatum}
                      onChange={e => setEindDatum(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                    />
                  </div>
                </div>

                {/* Tijd (alleen bij niet-hele-dag) */}
                {!heledag && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} className="grid grid-cols-2 gap-3 overflow-hidden">
                    <div>
                      <label className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                        <Clock size={9} /> Van
                      </label>
                      <input type="time" value={startTijd} onChange={e => setStartTijd(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                        <Clock size={9} /> Tot
                      </label>
                      <input type="time" value={eindTijd} onChange={e => setEindTijd(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Locatie */}
                <div>
                  <label className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                    <MapPin size={9} /> Locatie (optioneel)
                  </label>
                  <input type="text" value={locatie} onChange={e => setLocatie(e.target.value)}
                    placeholder="bijv. Amsterdam"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>

                {/* Beschrijving */}
                <div>
                  <label className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                    <FileText size={9} /> Notitie (optioneel)
                  </label>
                  <textarea value={beschrijving} onChange={e => setBeschrijving(e.target.value)}
                    rows={2} placeholder="Aantekeningen..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
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
                    ? "Wijzigingen worden direct gesynchroniseerd met Google Calendar."
                    : "Afspraak wordt lokaal opgeslagen. Bij de volgende sync wordt deze automatisch naar Google Calendar gestuurd."
                  }
                </p>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={handleClose}
                    className="flex-1 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-300 border border-white/8 hover:bg-white/5 transition-all cursor-pointer">
                    Annuleren
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 py-2 rounded-xl text-sm font-medium text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 hover:bg-indigo-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
                    {editEvent ? <Save size={13} /> : <Plus size={13} />}
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
