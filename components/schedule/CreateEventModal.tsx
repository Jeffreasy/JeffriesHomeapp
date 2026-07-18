"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { personalEventsApi, type PersonalEventRow } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { applyEventRowToCache, type PersonalEvent } from "@/hooks/usePersonalEvents";
import { getAmsterdamTodayIso } from "@/components/schedule/AgendaUtils";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { ModalCancelButton } from "@/components/ui/ModalCancelButton";
import { Switch } from "@/components/ui/Switch";
import { Textarea } from "@/components/ui/Textarea";
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
  // Zodra de parent de modal expliciet (opnieuw) opent, vervalt een eventuele
  // hangende herstel-rij — de parent-intentie wint.
  useEffect(() => {
    if (open) setRecoveryDraft(null);
  }, [open]);

  // De modal staat open als de parent hem opent óf als er een mislukte rij
  // hersteld moet worden.
  const isOpen = open || recoveryDraft !== null;
  const { options: laventeCareContextOptions } = useLaventeCareBusinessContextOptions({
    enabled: isOpen,
  });
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
    <Modal
      isOpen={isOpen}
      onClose={() => void handleCloseAttempt()}
      title={prefillEvent ? "Afspraak wijzigen" : "Nieuwe afspraak"}
      icon={<AppIcon name="agenda" tone="info" size="sm" />}
      maxWidth="lg"
      tone="info"
      closeDisabled={loading}
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
      ariaBusy={loading}
      dataAppModal="agenda-event"
      className="max-h-[calc(100dvh-0.5rem)] sm:max-h-[calc(100dvh-2rem)]"
      contentClassName="overflow-hidden p-0"
      footer={
        <div className="grid gap-2 sm:flex sm:items-center sm:justify-end">
          <ModalCancelButton
            onFallback={() => void handleCloseAttempt()}
            disabled={loading}
            className="w-full sm:w-auto"
          />
          <Button
            type="submit"
            form="agenda-event-form"
            loading={loading}
            loadingLabel="Bezig…"
            variant="info"
            className="w-full sm:w-auto"
          >
            <AppIcon name={editEvent ? "save" : "add"} tone="info" size="xs" />
            {editEvent ? "Opslaan" : "Aanmaken"}
          </Button>
        </div>
      }
    >
              <form id="agenda-event-form" onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {/* overflow-x-hidden: a scroll box with overflow-y:auto computes
                    overflow-x to `auto` too, so any over-wide child (e.g. the
                    native date/time inputs below) produced a horizontal scroll on
                    mobile. Clip the x-axis; min-w-0 on the grid items keeps the
                    inputs from overflowing in the first place. */}
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-5 py-4">

                {/* Titel */}
                <FormField id="agenda-event-title" label="Titel *">
                  {(controlProps) => (
                    <>
                      <Input
                        {...controlProps}
                        type="text"
                        value={titel}
                        onChange={e => setTitel(e.target.value)}
                        placeholder="bijv. Verjaardag Mama"
                        required
                        className="w-full placeholder:text-[var(--color-text-subtle)]"
                      />
                      {detectedContext ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-info-border)] bg-[var(--color-info-subtle)] px-2 py-1 text-xs font-semibold text-[var(--color-info)]">
                            <AppIcon name={detectedContext.eventSymbol} tone="info" size="xs" />
                            {detectedContext.label}
                            <span className="text-[var(--color-info)]">#{detectedContext.tag}</span>
                          </span>
                        </div>
                      ) : null}
                    </>
                  )}
                </FormField>

                {/* Hele dag toggle */}
                <Switch
                  label="Hele dag"
                  checked={heledag}
                  onCheckedChange={setHeledag}
                  className="px-0"
                />

                {/* Datum. Like the time fields, a date is fixed-length content, so a
                    half-width grid box left it looking like a wide empty bar. Let each
                    box size to its content (dates vary in length, so a fixed width
                    would either clip long dates or pad short ones) and lay them out
                    with flex-wrap so they hug the value and only stack when too narrow. */}
                <div className="flex flex-wrap gap-x-4 gap-y-3">
                  <FormField
                    id="agenda-event-start-date"
                    label={<span className="flex items-center gap-1"><AppIcon name="calendar" tone="neutral" size="xs" /> Start</span>}
                    className="min-w-0"
                  >
                    {(controlProps) => (
                      <Input
                        {...controlProps}
                        type="date"
                        value={startDatum}
                        onChange={e => { setStartDatum(e.target.value); if (e.target.value > eindDatum) setEindDatum(e.target.value); }}
                        className="w-auto max-w-full cursor-pointer [color-scheme:dark]"
                      />
                    )}
                  </FormField>
                  <FormField
                    id="agenda-event-end-date"
                    label={<span className="flex items-center gap-1"><AppIcon name="calendar" tone="neutral" size="xs" /> Eind</span>}
                    className="min-w-0"
                  >
                    {(controlProps) => (
                      <Input
                        {...controlProps}
                        type="date"
                        value={eindDatum}
                        min={startDatum}
                        onChange={e => setEindDatum(e.target.value)}
                        className="w-auto max-w-full cursor-pointer [color-scheme:dark]"
                      />
                    )}
                  </FormField>
                </div>

                {/* Tijd (alleen bij niet-hele-dag). A time value (HH:MM) is short,
                    and the iOS time control left-aligns it, so a full-width box left
                    a big empty "bar". Give each field a compact fixed width that hugs
                    the value; flex-wrap keeps Van/Tot side by side and only stacks
                    them on very narrow phones. */}
                {!heledag && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} className="flex flex-wrap gap-x-4 gap-y-3 overflow-hidden">
                    <FormField
                      id="agenda-event-start-time"
                      label={<span className="flex items-center gap-1"><AppIcon name="time" tone="neutral" size="xs" /> Van</span>}
                      className="min-w-0"
                    >
                      {(controlProps) => (
                        <Input
                          {...controlProps}
                          type="time"
                          value={startTijd}
                          onChange={e => setStartTijd(e.target.value)}
                          className="w-36 max-w-full cursor-pointer [color-scheme:dark]"
                        />
                      )}
                    </FormField>
                    <FormField
                      id="agenda-event-end-time"
                      label={<span className="flex items-center gap-1"><AppIcon name="time" tone="neutral" size="xs" /> Tot</span>}
                      className="min-w-0"
                    >
                      {(controlProps) => (
                        <Input
                          {...controlProps}
                          type="time"
                          value={eindTijd}
                          onChange={e => setEindTijd(e.target.value)}
                          className="w-36 max-w-full cursor-pointer [color-scheme:dark]"
                        />
                      )}
                    </FormField>
                  </motion.div>
                )}

                {/* Locatie */}
                <FormField
                  id="agenda-event-location"
                  label={<span className="flex items-center gap-1"><AppIcon name="location" tone="neutral" size="xs" /> Locatie</span>}
                  optional
                >
                  {(controlProps) => (
                    <Input
                      {...controlProps}
                      type="text"
                      value={locatie}
                      onChange={e => setLocatie(e.target.value)}
                      placeholder="bijv. Amsterdam"
                      className="w-full placeholder:text-[var(--color-text-subtle)]"
                    />
                  )}
                </FormField>

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
                <fieldset>
                  <legend className="mb-1.5 text-sm font-medium text-[var(--color-text)]">Categorie</legend>
                  <div className="grid grid-cols-3 gap-1.5">
                    {CATEGORIES.map(({ id, icon, label }) => (
                      <Button
                        key={id}
                        size="sm"
                        variant="secondary"
                        aria-pressed={categorie === id}
                        onClick={() => handleCategoryChange(id)}
                        className={cn(
                          "min-w-0 justify-start",
                          categorie === id && "border-[var(--color-info-border)] bg-[var(--color-info-subtle)] text-[var(--color-info)]",
                        )}
                      >
                        <AppIcon name={icon} tone={categorie === id ? "info" : "neutral"} size="xs" className="shrink-0" />
                        <span className="truncate">{label}</span>
                      </Button>
                    ))}
                  </div>
                </fieldset>

                {/* Symbool */}
                <fieldset>
                  <legend className="mb-1.5 text-sm font-medium text-[var(--color-text)]">Symbool</legend>
                  <SymbolPicker
                    value={symbol}
                    options={EVENT_SYMBOL_OPTIONS}
                    onChange={(value) => {
                      setSymbolTouched(true);
                      setSymbol(value);
                    }}
                    tone="info"
                    fallback={categoryIcon(categorie)}
                    gridClassName="grid-cols-2 sm:grid-cols-3"
                  />
                </fieldset>

                {/* Beschrijving */}
                <FormField
                  id="agenda-event-note"
                  label={<span className="flex items-center gap-1"><AppIcon name="note" tone="neutral" size="xs" /> Notitie</span>}
                  optional
                >
                  {(controlProps) => (
                    <Textarea
                      {...controlProps}
                      value={beschrijving}
                      onChange={e => setBeschrijving(e.target.value)}
                      rows={2}
                      placeholder="Aantekeningen..."
                      className="min-h-24 w-full resize-none placeholder:text-[var(--color-text-subtle)]"
                    />
                  )}
                </FormField>

                {/* Error */}
                {error && (
                  <p className="text-xs text-[var(--color-danger)] bg-[var(--color-danger-subtle)] border border-[var(--color-danger-border)] rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                {/* Info */}
                <p className="text-micro text-[var(--color-text-subtle)]">
                  {editEvent
                    ? "Wijzigingen worden direct naar Google Calendar gepusht. Als Google niet reageert, blijft de wijziging in de wachtrij (nog niet in Google)."
                    : "Afspraak wordt direct naar Google Calendar gepusht. Als Google niet reageert, blijft de afspraak in de wachtrij (nog niet in Google)."
                  }
                </p>
                </div>

              </form>
    </Modal>
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
