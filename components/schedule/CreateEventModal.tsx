"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { personalEventsApi, type PersonalEventRow } from "@/lib/api";
import { useUser } from "@clerk/nextjs";
import { type PersonalEvent } from "@/hooks/usePersonalEvents";
import { getAmsterdamTodayIso } from "@/components/schedule/AgendaUtils";
import { useToast } from "@/components/ui/Toast";
import { AppIcon } from "@/components/ui/AppIcon";
import { SymbolPicker } from "@/components/ui/SymbolPicker";
import { BusinessContextPicker } from "@/components/laventecare/BusinessContextPicker";
import { useLaventeCareBusinessContextOptions } from "@/hooks/useLaventeCareBusinessContexts";
import {
  isGenericLaventeCareBusinessContext,
  isSpecificLaventeCareBusinessContext,
  resolveLaventeCareBusinessContextFromText,
} from "@/lib/laventecare/business-context";
import {
  EVENT_CATEGORY_SYMBOLS,
  EVENT_SYMBOL_OPTIONS,
  getEventCategoryIcon,
  resolveAppIconName,
  type AppIconName,
} from "@/lib/symbols";
import {
  businessContextFromEvent,
  businessContextFromWorkspaceContext,
  buildEventDescription,
  enrichEventDraft,
  extractHashTags,
  getPrimaryWorkspaceContext,
  mergeTags,
  parseEventMetadata,
  stripEventMetadata,
  type BusinessContextValue,
} from "@/lib/workspace-context";

const CATEGORIES = EVENT_CATEGORY_SYMBOLS;

type CategoryId = typeof CATEGORIES[number]["id"];

function parseSymbolFromDescription(desc?: string): string | undefined {
  return parseEventMetadata(desc).symbol;
}

function categoryIcon(category: CategoryId): AppIconName {
  return getEventCategoryIcon(category);
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
  initialDate?: string;
  initialTime?: string;
}

export function CreateEventModal({ open, onClose, onSuccess, editEvent, initialDate, initialTime }: CreateEventModalProps) {
  const { user }  = useUser();
  const { success, toast } = useToast();

  const today = getAmsterdamTodayIso();
  const defaultDate = initialDate || today;
  const defaultStartTime = initialTime || "09:00";
  const defaultEndTime = initialTime ? addHours(initialTime, 1) : "10:00";

  const [titel,        setTitel]        = useState("");
  const [startDatum,   setStartDatum]   = useState(today);
  const [eindDatum,    setEindDatum]    = useState(today);
  const [heledag,      setHeledag]      = useState(false);
  const [startTijd,    setStartTijd]    = useState("09:00");
  const [eindTijd,     setEindTijd]     = useState("10:00");
  const [locatie,      setLocatie]      = useState("");
  const [beschrijving, setBeschrijving] = useState("");
  const [categorie,    setCategorie]    = useState<CategoryId>("overig");
  const [symbol,       setSymbol]       = useState<AppIconName>(categoryIcon("overig"));
  const [eventTags,    setEventTags]    = useState<string[]>([]);
  const [businessContext, setBusinessContext] = useState<BusinessContextValue | null>(null);
  const [businessContextTouched, setBusinessContextTouched] = useState(false);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [symbolTouched,   setSymbolTouched]   = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const laventeCareContextOptions = useLaventeCareBusinessContextOptions();

  const reset = useCallback(() => {
    setTitel(""); setStartDatum(defaultDate); setEindDatum(defaultDate);
    // A new appointment defaults to a timed event (less surprising than all-day
    // for the header / calendar "+ Afspraak" actions); the user can toggle it.
    setHeledag(false); setStartTijd(defaultStartTime); setEindTijd(defaultEndTime);
    setLocatie(""); setBeschrijving(""); setCategorie("overig"); setSymbol(categoryIcon("overig"));
    setEventTags([]); setBusinessContext(null); setBusinessContextTouched(false); setCategoryTouched(false); setSymbolTouched(false); setError("");
  }, [defaultDate, defaultEndTime, defaultStartTime]);

  const detectedContext = getPrimaryWorkspaceContext(`${titel} ${beschrijving} ${locatie}`, mergeTags(eventTags, extractHashTags(`${titel} ${beschrijving}`)));
  const inferredBusinessContext = useMemo(
    () => resolveLaventeCareBusinessContextFromText(`${titel} ${beschrijving} ${locatie}`, laventeCareContextOptions, businessContext),
    [beschrijving, businessContext, laventeCareContextOptions, locatie, titel],
  );
  const automaticBusinessContext = useMemo(() => inferredBusinessContext ?? businessContextFromWorkspaceContext(detectedContext), [detectedContext, inferredBusinessContext]);
  const effectiveBusinessContext = useMemo(() => {
    if (businessContextTouched) return businessContext;
    if (!businessContext) return automaticBusinessContext;
    if (isGenericLaventeCareBusinessContext(businessContext) && isSpecificLaventeCareBusinessContext(automaticBusinessContext)) {
      return automaticBusinessContext;
    }
    return businessContext;
  }, [automaticBusinessContext, businessContext, businessContextTouched]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

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
        const metadata = parseEventMetadata(editEvent.beschrijving);
        const nextCategory = (metadata.category as CategoryId) ?? "overig";
        setCategorie(nextCategory);
        setSymbol(resolveAppIconName(editEvent.symbol ?? metadata.symbol ?? parseSymbolFromDescription(editEvent.beschrijving), categoryIcon(nextCategory)));
        setEventTags(mergeTags(metadata.tags, metadata.contextIds));
        setBusinessContext(businessContextFromEvent(editEvent));
        setBusinessContextTouched(false);
        setCategoryTouched(false);
        setSymbolTouched(false);
        setBeschrijving(stripEventMetadata(editEvent.beschrijving ?? ""));
        setError("");
      } else {
        reset();
      }
    }
  }, [open, editEvent, reset]);

  useEffect(() => {
    if (detectedContext) {
      setEventTags((current) => {
        const next = mergeTags(current, [detectedContext.tag]);
        return next.join("|") === current.join("|") ? current : next;
      });
      if (!categoryTouched && categorie === "overig") {
        setCategorie(detectedContext.eventCategory as CategoryId);
      }
      if (!symbolTouched && (symbol === categoryIcon("overig") || symbol === categoryIcon("werk") || symbol === "agenda")) {
        setSymbol(detectedContext.eventSymbol);
      }
    } else if (automaticBusinessContext?.type?.startsWith("laventecare")) {
      setEventTags((current) => {
        const next = mergeTags(current, ["laventecare"]);
        return next.join("|") === current.join("|") ? current : next;
      });
      if (!categoryTouched && categorie === "overig") {
        setCategorie("werk");
      }
      if (!symbolTouched && (symbol === categoryIcon("overig") || symbol === categoryIcon("werk") || symbol === "agenda")) {
        setSymbol("business");
      }
    }
    if (!businessContextTouched && automaticBusinessContext && (!businessContext || (isGenericLaventeCareBusinessContext(businessContext) && isSpecificLaventeCareBusinessContext(automaticBusinessContext)))) {
      setBusinessContext(automaticBusinessContext);
    }
  }, [automaticBusinessContext, businessContext, businessContextTouched, categorie, categoryTouched, detectedContext, symbol, symbolTouched]);

  const handleClose = useCallback(() => { reset(); onClose(); }, [reset, onClose]);

  // Accessibility: trap focus in the dialog, restore focus on close, close on Escape.
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, dialogRef);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const handleCategoryChange = (nextCategory: CategoryId) => {
    setCategoryTouched(true);
    const previousIcon = categoryIcon(categorie);
    if (symbol === previousIcon) {
      setSymbol(categoryIcon(nextCategory));
    }
    setCategorie(nextCategory);
  };

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
      const enriched = enrichEventDraft({
        title: titel,
        description: rawDesc,
        location: locatie,
        tags: eventTags,
        category: categorie,
        symbol,
        businessContext: effectiveBusinessContext,
      });
      const fullDesc = buildEventDescription({
        description: rawDesc,
        category: enriched.category,
        symbol: enriched.symbol,
        context: enriched.context,
        businessContext: enriched.businessContext,
        tags: enriched.tags,
      });

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
        symbol:       enriched.symbol,
        business_context_type: enriched.businessContext?.type ?? null,
        business_context_id: enriched.businessContext?.id ?? null,
        business_context_title: enriched.businessContext?.title ?? null,
        status:       nextPendingStatus(editEvent),
        kalender:     editEvent?.kalender ?? "Main",
      };

      const result = await personalEventsApi.upsert(row);
      if (result.instantSync) {
        success(editEvent ? "Afspraak direct bijgewerkt in Google Calendar" : "Afspraak direct gesynchroniseerd met Google Calendar");
      } else if (result.permanent) {
        toast(
          "Afspraak lokaal opgeslagen, maar kan niet naar Google gesynchroniseerd worden (vermoedelijk een automatisch Google-event, zoals een verjaardag). Pas dit aan in Google Agenda/Contacten zelf.",
          "error"
        );
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
            data-app-modal="agenda-event"
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1,    y: 0   }}
            exit={{   opacity: 0, scale: 0.95, y: 16  }}
            transition={{ duration: 0.2 }}
            data-app-modal="agenda-event"
            className="fixed inset-x-0 bottom-0 z-[101] mx-auto max-w-lg sm:inset-x-4 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2"
          >
            <div
              ref={dialogRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="agenda-event-title"
              className="glass flex max-h-[calc(100dvh-0.5rem)] flex-col overflow-hidden rounded-t-2xl border border-[var(--color-border)] shadow-2xl focus:outline-none sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl"
            >

              {/* Header */}
              <div className="flex shrink-0 items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                <h2 id="agenda-event-title" className="text-sm font-semibold text-white flex items-center gap-2">
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
              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">

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
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-base text-white sm:text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                  {detectedContext && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-xs font-semibold text-cyan-200">
                        <AppIcon name={detectedContext.eventSymbol} tone="cyan" size="xs" />
                        {detectedContext.label}
                        <span className="text-cyan-300/70">#{detectedContext.tag}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Hele dag toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Hele dag
                  </label>
                  <button type="button" onClick={() => setHeledag(v => !v)}
                    role="switch" aria-checked={heledag} aria-label="Hele dag"
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
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-base text-white sm:text-sm focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                      <AppIcon name="calendar" tone="slate" size="xs" /> Eind
                    </label>
                    <input type="date" value={eindDatum} min={startDatum}
                      onChange={e => setEindDatum(e.target.value)}
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-base text-white sm:text-sm focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
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
                        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-base text-white sm:text-sm focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                        <AppIcon name="time" tone="slate" size="xs" /> Tot
                      </label>
                      <input type="time" value={eindTijd} onChange={e => setEindTijd(e.target.value)}
                        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-base text-white sm:text-sm focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
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
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-base text-white sm:text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>

                <BusinessContextPicker
                  value={businessContext}
                  onChange={(value) => {
                    setBusinessContextTouched(true);
                    setBusinessContext(value);
                    if (value?.type?.startsWith("laventecare")) {
                      setEventTags((current) => mergeTags(current, ["laventecare"]));
                    }
                  }}
                  compact
                />

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
                        onClick={() => handleCategoryChange(id)}
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

                {/* Symbool */}
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                    Symbool
                  </label>
                  <SymbolPicker
                    value={symbol}
                    options={EVENT_SYMBOL_OPTIONS}
                    onChange={(value) => {
                      setSymbolTouched(true);
                      setSymbol(value);
                    }}
                    tone="indigo"
                    fallback={categoryIcon(categorie)}
                    gridClassName="grid-cols-2 sm:grid-cols-3"
                  />
                </div>

                {/* Beschrijving */}
                <div>
                  <label className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                    <AppIcon name="note" tone="slate" size="xs" /> Notitie (optioneel)
                  </label>
                  <textarea value={beschrijving} onChange={e => setBeschrijving(e.target.value)}
                    rows={2} placeholder="Aantekeningen..."
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-base text-white sm:text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
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
                </div>

                {/* Actions */}
                <div className="flex shrink-0 gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))]">
                  <button type="button" onClick={handleClose}
                    className="min-h-[44px] flex-1 rounded-xl border border-[var(--color-border)] text-sm font-semibold text-slate-500 transition-all hover:bg-[var(--color-surface-hover)] hover:text-slate-300 cursor-pointer">
                    Annuleren
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/15 text-sm font-semibold text-indigo-300 transition-all hover:bg-indigo-500/25 cursor-pointer disabled:opacity-50">
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

function addHours(time: string, hours: number) {
  const [rawHour, rawMinute] = time.split(":").map(Number);
  const hour = Number.isFinite(rawHour) ? Math.min(Math.max(rawHour, 0), 23) : 9;
  const minute = Number.isFinite(rawMinute) ? Math.min(Math.max(rawMinute, 0), 59) : 0;
  const totalMinutes = hour * 60 + minute + hours * 60;
  const clampedMinutes = Math.min(totalMinutes, 23 * 60 + 59);
  const nextHour = Math.floor(clampedMinutes / 60);
  const nextMinute = clampedMinutes % 60;
  return `${String(nextHour).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`;
}
