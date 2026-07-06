"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { personalEventsApi, type PersonalEventRow } from "@/lib/api";
import { useUser } from "@clerk/nextjs";
import { applyEventRowToCache, type PersonalEvent } from "@/hooks/usePersonalEvents";
import { getAmsterdamTodayIso } from "@/components/schedule/AgendaUtils";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
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
  const queryClient = useQueryClient();
  const { success, toast, error: toastError } = useToast();
  const { openConfirm } = useConfirm();

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
  // Snapshot van een afspraak waarvan de achtergrond-upsert faalde. Bij een
  // fout heropent de modal gevuld met deze rij zodat de getypte invoer niet
  // verloren gaat (audit H1). Zolang gezet, gedraagt de modal zich alsof hij
  // open staat met deze rij als "editEvent".
  const [recoveryDraft, setRecoveryDraft] = useState<PersonalEvent | null>(null);
  const { options: laventeCareContextOptions } = useLaventeCareBusinessContextOptions();

  // Zodra de parent de modal expliciet (opnieuw) opent, vervalt een eventuele
  // hangende herstel-rij — de parent-intentie wint.
  useEffect(() => {
    if (open) setRecoveryDraft(null);
  }, [open]);

  // De modal staat open als de parent hem opent óf als er een mislukte rij
  // hersteld moet worden.
  const isOpen = open || recoveryDraft !== null;
  // Prefill-bron: parent-editEvent, of de herstelde mislukte rij.
  const prefillEvent = editEvent ?? recoveryDraft;

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
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (prefillEvent) {
        setTitel(prefillEvent.titel);
        setStartDatum(prefillEvent.startDatum);
        setEindDatum(prefillEvent.eindDatum);
        setHeledag(prefillEvent.heledag);
        setStartTijd(prefillEvent.startTijd ?? "09:00");
        setEindTijd(prefillEvent.eindTijd ?? "10:00");
        setLocatie(prefillEvent.locatie ?? "");
        const metadata = parseEventMetadata(prefillEvent.beschrijving);
        const nextCategory = (metadata.category as CategoryId) ?? "overig";
        setCategorie(nextCategory);
        setSymbol(resolveAppIconName(prefillEvent.symbol ?? metadata.symbol ?? parseSymbolFromDescription(prefillEvent.beschrijving), categoryIcon(nextCategory)));
        setEventTags(mergeTags(metadata.tags, metadata.contextIds));
        setBusinessContext(businessContextFromEvent(prefillEvent));
        setBusinessContextTouched(false);
        setCategoryTouched(false);
        setSymbolTouched(false);
        setBeschrijving(stripEventMetadata(prefillEvent.beschrijving ?? ""));
        setError("");
      } else {
        reset();
      }
    }
    // prefillEvent volgt editEvent/recoveryDraft; alleen bij een echte open/prefill-
    // wisseling opnieuw invullen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, prefillEvent, reset]);

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

  const handleClose = useCallback(() => {
    reset();
    setRecoveryDraft(null);
    onClose();
  }, [reset, onClose]);

  // ── Dirty-check vóór sluiten (audit K6) ──────────────────────────────────
  // Alleen de door de gebruiker bewerkbare velden tellen mee; automatische
  // context-verrijking (tags/categorie/symbool) maakt het formulier niet dirty.
  const pristine = useMemo(() => (
    editEvent
      ? {
          titel: editEvent.titel,
          startDatum: editEvent.startDatum,
          eindDatum: editEvent.eindDatum,
          heledag: editEvent.heledag,
          startTijd: editEvent.startTijd ?? "09:00",
          eindTijd: editEvent.eindTijd ?? "10:00",
          locatie: editEvent.locatie ?? "",
          beschrijving: stripEventMetadata(editEvent.beschrijving ?? ""),
        }
      : {
          titel: "",
          startDatum: defaultDate,
          eindDatum: defaultDate,
          heledag: false,
          startTijd: defaultStartTime,
          eindTijd: defaultEndTime,
          locatie: "",
          beschrijving: "",
        }
  ), [defaultDate, defaultEndTime, defaultStartTime, editEvent]);

  // Baseline-tags zoals ze na openen + automatische verrijking staan; auto-
  // verrijking mag het formulier niet dirty maken, dus we ijken de baseline
  // opnieuw zolang de gebruiker nog geen picker heeft aangeraakt.
  const pickerTouched = categoryTouched || symbolTouched || businessContextTouched;
  const baselineTagsRef = useRef<string[]>([]);
  useEffect(() => {
    // Zolang de gebruiker nog geen picker heeft aangeraakt volgt de baseline de
    // (automatisch verrijkte) tags, zodat alleen echte handmatige wijzigingen
    // daarna als dirty tellen.
    if (isOpen && !pickerTouched) baselineTagsRef.current = eventTags;
  }, [isOpen, pickerTouched, eventTags]);

  const tagsChanged =
    eventTags.length !== baselineTagsRef.current.length ||
    eventTags.some((tag, i) => tag !== baselineTagsRef.current[i]);

  const isDirty =
    titel !== pristine.titel ||
    startDatum !== pristine.startDatum ||
    eindDatum !== pristine.eindDatum ||
    heledag !== pristine.heledag ||
    (!heledag && (startTijd !== pristine.startTijd || eindTijd !== pristine.eindTijd)) ||
    locatie !== pristine.locatie ||
    beschrijving !== pristine.beschrijving ||
    // Picker-keuzes (categorie/symbool/context) + handmatige tag-wijzigingen
    // tellen nu ook mee — de touched-vlaggen bestonden al maar werden genegeerd
    // (audit K6/modal dirty-check).
    (pickerTouched && tagsChanged) ||
    categoryTouched ||
    symbolTouched ||
    businessContextTouched;

  // Guard zodat Escape in de bevestigingsdialoog niet nogmaals hier afvangt.
  const confirmingRef = useRef(false);
  const handleCloseAttempt = useCallback(async () => {
    if (confirmingRef.current) return;
    if (!isDirty) {
      handleClose();
      return;
    }
    confirmingRef.current = true;
    try {
      const discard = await openConfirm({
        title: "Wijzigingen verwerpen?",
        message: "Je hebt niet-opgeslagen wijzigingen in deze afspraak.",
        confirmLabel: "Verwerpen",
        variant: "danger",
      });
      if (discard) handleClose();
    } finally {
      confirmingRef.current = false;
    }
  }, [handleClose, isDirty, openConfirm]);

  // Accessibility: trap focus in the dialog, restore focus on close, close on Escape.
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(isOpen, dialogRef);
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void handleCloseAttempt();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, handleCloseAttempt]);

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

    // Pending-state dekt alleen de korte synchrone validatie/verrijking; de
    // (tot ~20s trage) Google-push blokkeert de modal niet meer (audit F8).
    setLoading(true);
    setError("");
    let row: PersonalEventRow | null = null;
    let rollback: () => void = () => {};
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

      row = {
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

      // Optimistic: laat de afspraak direct in de lijst/kalender verschijnen;
      // bij een fout wordt de cache-snapshot teruggezet (audit M16).
      rollback = applyEventRowToCache(queryClient, user.id, row);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan mislukt");
      setLoading(false);
      return;
    }
    setLoading(false);
    if (!row) return;
    const pendingRow = row;
    const wasEdit = Boolean(editEvent);

    // Modal direct sluiten (audit F8): de rij staat al optimistisch in de
    // cache. De upsert wordt op de achtergrond afgerond met toast-feedback en
    // rollback bij falen — zelfde patroon als het delete-pad.
    handleClose();

    void (async () => {
      try {
        const result = await personalEventsApi.upsert(pendingRow);
        if (result.instantSync) {
          success(wasEdit ? "Afspraak direct bijgewerkt in Google Calendar" : "Afspraak direct gesynchroniseerd met Google Calendar");
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
      } catch (err) {
        // Optimistic rij terugdraaien; de modal is al dicht.
        rollback();
        // Dataverlies voorkomen (audit H1): heropen de modal gevuld met de
        // mislukte rij zodat de getypte titel/beschrijving/locatie/context niet
        // weg zijn. De gebruiker kan met één klik ("Aanmaken"/"Opslaan")
        // opnieuw proberen.
        setRecoveryDraft(rowToRecoveryEvent(pendingRow));
        toastError(`Opslaan mislukt: ${err instanceof Error ? err.message : "onbekende fout"} — je invoer is bewaard, probeer opnieuw.`);
      }
    })();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            data-app-modal="agenda-event"
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={() => void handleCloseAttempt()}
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
                  onClick={() => void handleCloseAttempt()}
                  className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                  <AppIcon name="close" tone="slate" size="sm" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {/* overflow-x-hidden: a scroll box with overflow-y:auto computes
                    overflow-x to `auto` too, so any over-wide child (e.g. the
                    native date/time inputs below) produced a horizontal scroll on
                    mobile. Clip the x-axis; min-w-0 on the grid items keeps the
                    inputs from overflowing in the first place. */}
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-5 py-4">

                {/* Titel */}
                <div>
                  <label htmlFor="agenda-event-titel" className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                    Titel *
                  </label>
                  <input
                    id="agenda-event-titel"
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
                  <div className="min-w-0">
                    <label htmlFor="agenda-event-start-datum" className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                      <AppIcon name="calendar" tone="slate" size="xs" /> Start
                    </label>
                    <input id="agenda-event-start-datum" type="date" value={startDatum}
                      onChange={e => { setStartDatum(e.target.value); if (e.target.value > eindDatum) setEindDatum(e.target.value); }}
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-base text-white sm:text-sm focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                    />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="agenda-event-eind-datum" className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                      <AppIcon name="calendar" tone="slate" size="xs" /> Eind
                    </label>
                    <input id="agenda-event-eind-datum" type="date" value={eindDatum} min={startDatum}
                      onChange={e => setEindDatum(e.target.value)}
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-base text-white sm:text-sm focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                    />
                  </div>
                </div>

                {/* Tijd (alleen bij niet-hele-dag) */}
                {!heledag && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} className="grid grid-cols-2 gap-3 overflow-hidden">
                    <div className="min-w-0">
                      <label htmlFor="agenda-event-start-tijd" className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                        <AppIcon name="time" tone="slate" size="xs" /> Van
                      </label>
                      <input id="agenda-event-start-tijd" type="time" value={startTijd} onChange={e => setStartTijd(e.target.value)}
                        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-base text-white sm:text-sm focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                      />
                    </div>
                    <div className="min-w-0">
                      <label htmlFor="agenda-event-eind-tijd" className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                        <AppIcon name="time" tone="slate" size="xs" /> Tot
                      </label>
                      <input id="agenda-event-eind-tijd" type="time" value={eindTijd} onChange={e => setEindTijd(e.target.value)}
                        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-base text-white sm:text-sm focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Locatie */}
                <div>
                  <label htmlFor="agenda-event-locatie" className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                    <AppIcon name="location" tone="slate" size="xs" /> Locatie (optioneel)
                  </label>
                  <input id="agenda-event-locatie" type="text" value={locatie} onChange={e => setLocatie(e.target.value)}
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
                        className={`flex min-w-0 items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
                          categorie === id
                            ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                            : "bg-[var(--color-surface)] text-slate-500 border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] hover:text-slate-300"
                        }`}
                      >
                        <AppIcon name={icon} tone={categorie === id ? "indigo" : "slate"} size="xs" className="shrink-0" />
                        <span className="truncate">{label}</span>
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
                  <label htmlFor="agenda-event-notitie" className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                    <AppIcon name="note" tone="slate" size="xs" /> Notitie (optioneel)
                  </label>
                  <textarea id="agenda-event-notitie" value={beschrijving} onChange={e => setBeschrijving(e.target.value)}
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
                    ? "Wijzigingen worden direct naar Google Calendar gepusht. Als Google niet reageert, blijft de wijziging in de wachtrij (nog niet in Google)."
                    : "Afspraak wordt direct naar Google Calendar gepusht. Als Google niet reageert, blijft de afspraak in de wachtrij (nog niet in Google)."
                  }
                </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))]">
                  <button type="button" onClick={() => void handleCloseAttempt()}
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

/**
 * Reconstruct a PersonalEvent from the row that failed to upsert so the modal
 * can re-open pre-filled with exactly the user's submitted values (audit H1).
 * The description still carries the [categorie:…]/[symbol:…]/tag-metadata, which
 * the open-effect parses back into the pickers.
 */
function rowToRecoveryEvent(row: PersonalEventRow): PersonalEvent {
  return {
    _id: "",
    userId: row.user_id,
    eventId: row.event_id,
    titel: row.titel,
    startDatum: row.start_datum,
    startTijd: row.start_tijd ?? undefined,
    eindDatum: row.eind_datum,
    eindTijd: row.eind_tijd ?? undefined,
    heledag: row.heledag,
    locatie: row.locatie ?? undefined,
    beschrijving: row.beschrijving ?? undefined,
    symbol: (row.symbol as AppIconName) ?? undefined,
    businessContextType: row.business_context_type ?? undefined,
    businessContextId: row.business_context_id ?? undefined,
    businessContextTitle: row.business_context_title ?? undefined,
    status: row.status,
    kalender: row.kalender,
  };
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
