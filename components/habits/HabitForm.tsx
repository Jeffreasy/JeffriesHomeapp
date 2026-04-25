"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Zap, Clock, CalendarDays, Timer, Hash, Ruler } from "lucide-react";
import { HABIT_EMOJIS, ROOSTER_FILTER_OPTIONS } from "@/convex/lib/habitConstants";
import { HABIT_COLORS, FREQUENTIE_LABELS, MOEILIJKHEID_LABELS, DAG_LABELS } from "@/lib/habit-constants";
import type { HabitCreateData } from "@/hooks/useHabits";

/**
 * HabitForm — Create/edit modal.
 * Mobile-first: full-screen on mobile, modal on desktop.
 * BottomSheet pattern for mobile.
 */
interface HabitFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: HabitCreateData) => void | Promise<void>;
  initial?: Partial<HabitCreateData>;
}

export function HabitForm({ open, onClose, onSubmit, initial }: HabitFormProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [naam, setNaam] = useState(initial?.naam ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "🎯");
  const [type, setType] = useState<"positief" | "negatief">(initial?.type ?? "positief");
  const [frequentie, setFrequentie] = useState<HabitCreateData["frequentie"]>(initial?.frequentie ?? "dagelijks");
  const [aangepasteDagen, setAangepasteDagen] = useState<number[]>(initial?.aangepasteDagen ?? []);
  const [moeilijkheid, setMoeilijkheid] = useState<"makkelijk" | "normaal" | "moeilijk">(initial?.moeilijkheid ?? "normaal");
  const [roosterFilter, setRoosterFilter] = useState<HabitCreateData["roosterFilter"]>(initial?.roosterFilter ?? "alle");
  const [kleur, setKleur] = useState(initial?.kleur ?? HABIT_COLORS[0]);
  const [beschrijving, setBeschrijving] = useState(initial?.beschrijving ?? "");
  const [isKwantitatief, setIsKwantitatief] = useState(initial?.isKwantitatief ?? false);
  const [doelWaarde, setDoelWaarde] = useState<number | undefined>(initial?.doelWaarde);
  const [eenheid, setEenheid] = useState(initial?.eenheid ?? "");
  const [doelAantal, setDoelAantal] = useState<number | undefined>(initial?.doelAantal);
  const [doelTijd, setDoelTijd] = useState(initial?.doelTijd ?? "");
  const [showEmojis, setShowEmojis] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset state when form opens or initial values change
  useEffect(() => {
    if (!open) return;

    const timeout = window.setTimeout(() => {
      setNaam(initial?.naam ?? "");
      setEmoji(initial?.emoji ?? "🎯");
      setType(initial?.type ?? "positief");
      setFrequentie(initial?.frequentie ?? "dagelijks");
      setAangepasteDagen(initial?.aangepasteDagen ?? []);
      setMoeilijkheid(initial?.moeilijkheid ?? "normaal");
      setRoosterFilter(initial?.roosterFilter ?? "alle");
      setKleur(initial?.kleur ?? HABIT_COLORS[0]);
      setBeschrijving(initial?.beschrijving ?? "");
      setIsKwantitatief(initial?.isKwantitatief ?? false);
      setDoelWaarde(initial?.doelWaarde);
      setEenheid(initial?.eenheid ?? "");
      setDoelAantal(initial?.doelAantal);
      setDoelTijd(initial?.doelTijd ?? "");
      setShowEmojis(false);
      setIsSubmitting(false);
      setSubmitError(null);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const canAutofocus = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!canAutofocus) return;

    const timeout = window.setTimeout(() => nameInputRef.current?.focus(), 180);
    return () => window.clearTimeout(timeout);
  }, [open]);

  const handleSubmit = async () => {
    if (!naam.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        naam: naam.trim(),
        emoji,
        type,
        frequentie,
        aangepasteDagen: frequentie === "aangepast" ? aangepasteDagen : undefined,
        moeilijkheid,
        roosterFilter: roosterFilter === "alle" ? undefined : roosterFilter,
        isKwantitatief,
        doelWaarde: isKwantitatief ? doelWaarde : undefined,
        eenheid: isKwantitatief ? eenheid || undefined : undefined,
        doelAantal: (frequentie === "x_per_week" || frequentie === "x_per_maand") ? doelAantal : undefined,
        doelTijd: doelTijd || undefined,
        kleur,
        beschrijving: beschrijving.trim() || undefined,
      });
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Habit opslaan is mislukt.");
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
          />

          {/* Sheet — full-height on mobile, centered modal on desktop */}
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={initial ? "Habit bewerken" : "Nieuwe habit"}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[91] flex max-h-[calc(100dvh-10px)] flex-col rounded-t-3xl shadow-2xl md:inset-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:max-h-[min(760px,88vh)]"
            style={{
              background: "rgba(15, 15, 20, 0.98)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* Drag handle (mobile) */}
            <div className="flex shrink-0 justify-center pb-1 pt-3 md:hidden">
              <div className="w-10 h-1 rounded-full bg-white/10" />
            </div>

            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-5 pb-4 pt-2 md:pt-4">
              <h2 className="text-lg font-bold text-slate-200">
                {initial ? "Habit bewerken" : "Nieuwe Habit"}
              </h2>
              <button
                onClick={onClose}
                className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer active:scale-90"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable content */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-4"
              style={{ WebkitOverflowScrolling: "touch" }}
            >

              {/* Emoji + Naam */}
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => setShowEmojis(!showEmojis)}
                  className="w-14 h-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center text-2xl shrink-0 active:scale-95 transition-transform"
                  style={{ borderColor: kleur + "30" }}
                >
                  {emoji}
                </button>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={naam}
                  onChange={(e) => setNaam(e.target.value)}
                  placeholder="Naam van habit..."
                  className="flex-1 bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/30 min-h-[56px]"
                />
              </div>

              {/* Emoji picker */}
              <AnimatePresence>
                {showEmojis && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-4"
                  >
                    <div className="grid grid-cols-8 gap-1.5 p-3 bg-white/3 rounded-xl">
                      {HABIT_EMOJIS.map((e) => (
                        <button
                          key={e}
                          onClick={() => { setEmoji(e); setShowEmojis(false); }}
                          className="text-xl p-1.5 rounded-lg hover:bg-white/5 active:scale-90 transition-all min-h-[44px] flex items-center justify-center"
                          style={{ background: emoji === e ? "rgba(249,115,22,0.12)" : undefined }}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Beschrijving */}
              <input
                type="text"
                value={beschrijving}
                onChange={(e) => setBeschrijving(e.target.value)}
                placeholder="Optionele beschrijving..."
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/30 mb-4 min-h-[48px]"
              />

              {/* Type toggle */}
              <div className="mb-4">
                <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider block mb-2">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["positief", "negatief"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className="py-3 px-4 rounded-xl text-sm font-medium transition-all min-h-[48px]"
                      style={{
                        background: type === t ? (t === "positief" ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)") : "rgba(255,255,255,0.03)",
                        border: type === t ? `1px solid ${t === "positief" ? "rgba(34,197,94,0.20)" : "rgba(239,68,68,0.20)"}` : "1px solid rgba(255,255,255,0.05)",
                        color: type === t ? (t === "positief" ? "#4ade80" : "#f87171") : "#94a3b8",
                      }}
                    >
                      {t === "positief" ? "✅ Doen" : "🚫 Vermijden"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frequentie */}
              <div className="mb-4">
                <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1 mb-2">
                  <Clock size={10} /> Frequentie
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(FREQUENTIE_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setFrequentie(key as HabitCreateData["frequentie"])}
                      className="py-2.5 px-3 rounded-lg text-xs font-medium transition-all min-h-[44px]"
                      style={{
                        background: frequentie === key ? "rgba(249,115,22,0.10)" : "rgba(255,255,255,0.03)",
                        border: frequentie === key ? "1px solid rgba(249,115,22,0.20)" : "1px solid rgba(255,255,255,0.05)",
                        color: frequentie === key ? "#f97316" : "#94a3b8",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aangepaste dagen */}
              {frequentie === "aangepast" && (
                <div className="mb-4 flex gap-1.5">
                  {DAG_LABELS.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setAangepasteDagen((prev) =>
                          prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
                        );
                      }}
                      className="flex-1 py-2 rounded-lg text-xs font-medium transition-all min-h-[40px]"
                      style={{
                        background: aangepasteDagen.includes(i) ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.03)",
                        border: aangepasteDagen.includes(i) ? "1px solid rgba(249,115,22,0.20)" : "1px solid rgba(255,255,255,0.05)",
                        color: aangepasteDagen.includes(i) ? "#f97316" : "#64748b",
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}

              {/* Rooster koppeling */}
              <div className="mb-4">
                <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1 mb-2">
                  <CalendarDays size={10} /> Rooster koppeling
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {ROOSTER_FILTER_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setRoosterFilter(value)}
                      className="py-2 px-3 rounded-lg text-xs font-medium transition-all min-h-[40px]"
                      style={{
                        background: roosterFilter === value ? "rgba(59,130,246,0.10)" : "rgba(255,255,255,0.03)",
                        border: roosterFilter === value ? "1px solid rgba(59,130,246,0.20)" : "1px solid rgba(255,255,255,0.05)",
                        color: roosterFilter === value ? "#60a5fa" : "#94a3b8",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Doel per week/maand (alleen bij x_per_week/x_per_maand) */}
              {(frequentie === "x_per_week" || frequentie === "x_per_maand") && (
                <div className="mb-4">
                  <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1 mb-2">
                    <Hash size={10} /> Hoe vaak per {frequentie === "x_per_week" ? "week" : "maand"}?
                  </label>
                  <div className="flex gap-2">
                    {(frequentie === "x_per_week" ? [2, 3, 4, 5] : [5, 10, 15, 20]).map((n) => (
                      <button
                        key={n}
                        onClick={() => setDoelAantal(n)}
                        className="flex-1 py-2.5 rounded-lg text-xs font-medium transition-all min-h-[44px]"
                        style={{
                          background: doelAantal === n ? "rgba(249,115,22,0.10)" : "rgba(255,255,255,0.03)",
                          border: doelAantal === n ? "1px solid rgba(249,115,22,0.20)" : "1px solid rgba(255,255,255,0.05)",
                          color: doelAantal === n ? "#f97316" : "#94a3b8",
                        }}
                      >
                        {n}×
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Kwantitatief / Meetbaar */}
              <div className="mb-4">
                <button
                  onClick={() => setIsKwantitatief(!isKwantitatief)}
                  className="w-full flex items-center justify-between py-3 px-4 rounded-xl text-xs font-medium transition-all min-h-[48px]"
                  style={{
                    background: isKwantitatief ? "rgba(14,165,233,0.08)" : "rgba(255,255,255,0.03)",
                    border: isKwantitatief ? "1px solid rgba(14,165,233,0.15)" : "1px solid rgba(255,255,255,0.05)",
                    color: isKwantitatief ? "#0ea5e9" : "#94a3b8",
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <Ruler size={12} />
                    Meetbaar doel (hoeveelheid/duur)
                  </span>
                  <div
                    className="w-9 h-5 rounded-full transition-all relative"
                    style={{ background: isKwantitatief ? "#0ea5e9" : "rgba(255,255,255,0.08)" }}
                  >
                    <div
                      className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all"
                      style={{ left: isKwantitatief ? "18px" : "2px" }}
                    />
                  </div>
                </button>

                {isKwantitatief && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="number"
                      value={doelWaarde ?? ""}
                      onChange={(e) => setDoelWaarde(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Doel"
                      className="flex-1 bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500/30 min-h-[44px]"
                      inputMode="numeric"
                    />
                    <div className="flex gap-1">
                      {["min", "ml", "km", "pg", "x"].map((u) => (
                        <button
                          key={u}
                          onClick={() => setEenheid(u)}
                          className="px-2.5 py-2 rounded-lg text-[10px] font-medium transition-all min-h-[44px]"
                          style={{
                            background: eenheid === u ? "rgba(14,165,233,0.10)" : "rgba(255,255,255,0.03)",
                            border: eenheid === u ? "1px solid rgba(14,165,233,0.20)" : "1px solid rgba(255,255,255,0.05)",
                            color: eenheid === u ? "#0ea5e9" : "#64748b",
                          }}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Doeltijd */}
              <div className="mb-4">
                <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1 mb-2">
                  <Timer size={10} /> Doeltijdstip (optioneel)
                </label>
                <input
                  type="time"
                  value={doelTijd}
                  onChange={(e) => setDoelTijd(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/30 min-h-[48px] scheme-dark"
                />
                {doelTijd && (
                  <button
                    onClick={() => setDoelTijd("")}
                    className="mt-1.5 px-3 py-2 text-xs text-red-400/70 bg-red-500/8 border border-red-500/10 rounded-lg hover:bg-red-500/15 transition-colors cursor-pointer min-h-[40px]"
                  >
                    Tijdstip wissen
                  </button>
                )}
              </div>

              {/* Moeilijkheid */}
              <div className="mb-4">
                <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1 mb-2">
                  <Zap size={10} /> Moeilijkheid (XP)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["makkelijk", "normaal", "moeilijk"] as const).map((m) => {
                    const xpVals = { makkelijk: 5, normaal: 10, moeilijk: 20 };
                    return (
                      <button
                        key={m}
                        onClick={() => setMoeilijkheid(m)}
                        className="py-2.5 rounded-lg text-xs font-medium transition-all min-h-[44px] flex flex-col items-center gap-0.5"
                        style={{
                          background: moeilijkheid === m ? "rgba(249,115,22,0.10)" : "rgba(255,255,255,0.03)",
                          border: moeilijkheid === m ? "1px solid rgba(249,115,22,0.20)" : "1px solid rgba(255,255,255,0.05)",
                          color: moeilijkheid === m ? "#f97316" : "#94a3b8",
                        }}
                      >
                        <span>{MOEILIJKHEID_LABELS[m]}</span>
                        <span className="text-[9px] opacity-60">{xpVals[m]} XP</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Kleur */}
              <div className="mb-6">
                <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider block mb-2">Kleur</label>
                <div className="flex gap-2.5 flex-wrap">
                  {HABIT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setKleur(c)}
                      className="w-10 h-10 rounded-full transition-all active:scale-90 cursor-pointer"
                      style={{
                        background: c,
                        border: kleur === c ? "3px solid white" : "2px solid rgba(255,255,255,0.1)",
                        transform: kleur === c ? "scale(1.15)" : "scale(1)",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Submit button — above mobile nav, outside the scroll area */}
            <div
              className="shrink-0 border-t border-white/5 bg-[rgba(15,15,20,0.98)] p-4"
              style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
            >
              {submitError && (
                <p className="mb-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200">
                  {submitError}
                </p>
              )}
              <button
                onClick={handleSubmit}
                disabled={!naam.trim() || isSubmitting}
                className="w-full py-4 rounded-2xl text-sm font-bold transition-all min-h-[56px] active:scale-[0.97] disabled:opacity-30 cursor-pointer"
                style={{
                  background: naam.trim() ? "linear-gradient(135deg, #f97316, #f59e0b)" : "rgba(255,255,255,0.05)",
                  color: naam.trim() ? "white" : "#64748b",
                }}
              >
                <Plus size={16} className="inline mr-2" />
                {isSubmitting ? "Opslaan..." : initial ? "Opslaan" : "Habit toevoegen"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
