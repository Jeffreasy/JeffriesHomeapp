"use client";

import { useState, useRef, useEffect, useCallback, useMemo, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Archive,
  CalendarDays,
  ChevronDown,
  Check,
  CheckCircle2,
  Clock,
  Hash,
  Heading1,
  History,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Palette,
  Pin,
  Quote,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { getNotesSearch } from "@/lib/api/generated/notes/notes";
import type { NoteCreateData, NoteRecord, NoteRevisionRecord } from "@/hooks/useNotes";
import { formatDateRange, getTimeLabel, type PersonalEvent } from "@/hooks/usePersonalEvents";
import { AppIcon } from "@/components/ui/AppIcon";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { SymbolPicker } from "@/components/ui/SymbolPicker";
import { BusinessContextPicker } from "@/components/laventecare/BusinessContextPicker";
import { useLaventeCareBusinessContextOptions } from "@/hooks/useLaventeCareBusinessContexts";
import {
  isGenericLaventeCareBusinessContext,
  isSpecificLaventeCareBusinessContext,
  resolveLaventeCareBusinessContextFromText,
} from "@/lib/laventecare/business-context";
import { NOTE_SYMBOL_OPTIONS, resolveAppIconName, type AppIconName } from "@/lib/symbols";
import {
  businessContextFromEvent,
  businessContextFromWorkspaceContext,
  contextTagsFromEvent,
  detectWorkspaceContexts,
  enrichNoteDraft,
  extractHashTags,
  mergeTags,
  normalizeBusinessContext,
  type BusinessContextValue,
} from "@/lib/workspace-context";

const KLEUREN = [
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
  "#64748b",
];

const PRIORITEITEN = [
  { value: "hoog", label: "Hoog", dot: "bg-red-500" },
  { value: "normaal", label: "Normaal", dot: "bg-slate-500" },
  { value: "laag", label: "Laag", dot: "bg-blue-400" },
] as const;

const NOTE_TEMPLATE_CATEGORIES = ["Algemeen", "Werk", "LaventeCare", "Veiligheid"] as const;
type NoteTemplateCategory = (typeof NOTE_TEMPLATE_CATEGORIES)[number];
type NoteTemplate = {
  id: string;
  title: string;
  label: string;
  category: NoteTemplateCategory;
  description: string;
  icon: AppIconName;
  content: string;
  tags?: string[];
  priority?: (typeof PRIORITEITEN)[number]["value"];
  symbol?: AppIconName;
  businessContext?: BusinessContextValue;
};

const LAVENTECARE_TEMPLATE_CONTEXT: BusinessContextValue = {
  type: "laventecare",
  title: "LaventeCare",
};

const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "evaluatie",
    title: "Evaluatie",
    label: "Evaluatie",
    category: "Algemeen",
    description: "Terugblik met verbeterpunten en concrete vervolgacties.",
    icon: "chart",
    content: "## Wat ging goed?\n\n## Wat kan beter?\n\n## Acties\n- [ ] ",
  },
  {
    id: "dagstart",
    title: "Dagstart",
    label: "Dagstart",
    category: "Algemeen",
    description: "Korte dagfocus voor prioriteiten, energie en afsluiting.",
    icon: "calendar",
    tags: ["dagstart", "focus"],
    symbol: "calendar",
    content:
      "## Vandaag belangrijk\n- [ ] \n\n" +
      "## Planning\n\n" +
      "## Energie en focus\n\n" +
      "## Einde dag check\n- [ ] Afgerond of verplaatst\n- [ ] Morgen voorbereid\n",
  },
  {
    id: "dienst",
    title: "Dienstnotitie",
    label: "Dienst",
    category: "Werk",
    description: "Overdracht, bijzonderheden en acties rondom een dienst.",
    icon: "roster",
    content: "## Dienst\n\n## Bijzonderheden\n\n## Overdracht\n- [ ] ",
  },
  {
    id: "gesprek",
    title: "Gespreksnotitie",
    label: "Gesprek",
    category: "Werk",
    description: "Bespreking vastleggen met besluiten en opvolging.",
    icon: "note",
    tags: ["gesprek", "actie"],
    symbol: "note",
    content:
      "## Context\n- Met: \n- Aanleiding: \n- Datum/tijd: \n\n" +
      "## Besproken\n\n" +
      "## Besluiten\n\n" +
      "## Acties\n- [ ] \n",
  },
  {
    id: "planning",
    title: "Planning",
    label: "Planning",
    category: "Werk",
    description: "Doel, stappen en deadline overzichtelijk maken.",
    icon: "calendar",
    content: "## Doel\n\n## Stappen\n- [ ] \n\n## Deadline\n",
  },
  {
    id: "besluit",
    title: "Besluit",
    label: "Besluit",
    category: "Werk",
    description: "Waarom iets besloten is en wat de impact wordt.",
    icon: "shield",
    content: "## Besluit\n\n## Reden\n\n## Impact\n\n## Volgende stap\n- [ ] ",
  },
  {
    id: "klantdossier",
    title: "Klantdossier notitie",
    label: "Klantdossier",
    category: "LaventeCare",
    description: "Klantcontext, contactpersoon, signalen en acties bundelen.",
    icon: "business",
    tags: ["laventecare", "klantcontext"],
    symbol: "business",
    businessContext: LAVENTECARE_TEMPLATE_CONTEXT,
    content:
      "## Klant/context\n- Klant: \n- Contactpersoon: \n- Relatie: prospect / klant / partner / leverancier / eigen_project\n- Website: \n- Koppeling: klantdossier / project / opdracht\n\n" +
      "## Signaal\n\n" +
      "## Belangrijk\n\n" +
      "## Acties\n- [ ] \n",
  },
  {
    id: "project",
    title: "Projectnotitie",
    label: "Project",
    category: "LaventeCare",
    description: "Scope, fase, risico's en volgende stap voor klantwerk.",
    icon: "work",
    tags: ["laventecare", "project", "opdracht"],
    symbol: "work",
    businessContext: LAVENTECARE_TEMPLATE_CONTEXT,
    content:
      "## Project/opdracht\n- Klant: \n- Fase: intake / pilot / build / oplevering / beheer\n- Doel: \n- Deadline: \n\n" +
      "## Scope\n- In: \n- Uit: \n\n" +
      "## Risico's of keuzes\n\n" +
      "## Volgende stap\n- [ ] \n",
  },
  {
    id: "pilot",
    title: "Pilot en testfase",
    label: "Pilot",
    category: "LaventeCare",
    description: "Testscope, criteria en veilige toegang voor pilots.",
    icon: "radar",
    tags: ["laventecare", "pilot", "testfase"],
    priority: "hoog",
    symbol: "radar",
    businessContext: LAVENTECARE_TEMPLATE_CONTEXT,
    content:
      "## Pilot/testfase\n- Klant: \n- Omgeving: test / pilot / productie\n- Startdatum: \n- Feedbackmoment: \n\n" +
      "## Testscope\n- [ ] \n\n" +
      "## Acceptatiecriteria\n- [ ] Kernfunctionaliteit werkt\n- [ ] Gebruiksgemak is getest\n- [ ] Betrouwbaarheid is akkoord\n\n" +
      "## Toegang\n- Accounts vastgelegd: ja / nee\n- Veilig kanaal: \n- Let op: geen wachtwoorden in klantmail opnemen.\n\n" +
      "## Vervolg\n- [ ] \n",
  },
  {
    id: "mail-briefing",
    title: "Mailbriefing",
    label: "Mailbriefing",
    category: "LaventeCare",
    description: "Interne briefing voor AI-mail met relevante context.",
    icon: "mail",
    tags: ["laventecare", "mail", "briefing"],
    symbol: "mail",
    businessContext: LAVENTECARE_TEMPLATE_CONTEXT,
    content:
      "## Mailcontext\n- Klant: \n- Contactpersoon: \n- Template: intake / update / pilot / oplevering / follow-up\n- Doel van de mail: \n\n" +
      "## Interne bronnen\n- Notities: \n- Agenda: \n- Project/opdracht: \n\n" +
      "## Kernboodschap voor klant\n\n" +
      "## Niet meesturen naar klant\n- \n",
  },
  {
    id: "incident",
    title: "Support incident",
    label: "Incident",
    category: "LaventeCare",
    description: "Probleem, impact, diagnose en afronding bij klantissues.",
    icon: "alert",
    tags: ["laventecare", "support", "incident"],
    priority: "hoog",
    symbol: "alert",
    businessContext: LAVENTECARE_TEMPLATE_CONTEXT,
    content:
      "## Incident\n- Klant/context: \n- Ernst: laag / normaal / hoog\n- Start: \n- Impact: \n\n" +
      "## Diagnose\n\n" +
      "## Actie\n- [ ] \n\n" +
      "## Afronding\n- Oorzaak: \n- Oplossing: \n- Klant geinformeerd: ja / nee\n",
  },
  {
    id: "accounts",
    title: "Accountgegevens",
    label: "Accounts",
    category: "Veiligheid",
    description: "Pilotaccounts en toegangsbeheer zonder klantmail-lek.",
    icon: "shield",
    tags: ["laventecare", "accounts", "toegang", "veilig"],
    priority: "hoog",
    symbol: "shield",
    businessContext: LAVENTECARE_TEMPLATE_CONTEXT,
    content:
      "## Accountgegevens\n\n" +
      "## Context\n" +
      "- Klant/context: \n" +
      "- Project/pilot: \n" +
      "- Doel van toegang: \n" +
      "- Omgeving: test / pilot / productie\n" +
      "- Status: actief / tijdelijk / verlopen\n\n" +
      "## Accounts\n" +
      "### Account 1\n" +
      "- E-mail/gebruikersnaam: \n" +
      "- Rol/rechten: \n" +
      "- Wachtwoord/verwijzing: veilig kanaal / vault / tijdelijk\n" +
      "- 2FA/herstel: \n" +
      "- Eigenaar/contact: \n" +
      "- Laatst getest: \n\n" +
      "## Veilig delen\n" +
      "- Gevoelige gegevens alleen delen via afgesproken veilig kanaal.\n" +
      "- Laatst gecontroleerd: \n" +
      "- Vervaldatum / intrekken na pilot: \n\n" +
      "## Acties\n" +
      "- [ ] Toegang testen\n" +
      "- [ ] Klant bevestigen dat toegang werkt\n" +
      "- [ ] Na pilot toegang intrekken of omzetten\n",
  },
] as const;

const NOTE_TEMPLATE_GROUPS = NOTE_TEMPLATE_CATEGORIES.map((category) => ({
  category,
  templates: NOTE_TEMPLATES.filter((template) => template.category === category),
}));

type LinkSearchItem = {
  id?: string;
  titel?: string | null;
  inhoud?: string | null;
};

// A wiki-link resolves on the title or, for untitled notes, the first content
// line (matching the backend). Never offer a placeholder like "Zonder titel" as
// link text — it produces a [[link]] that can never resolve.
function noteLinkLabel(item: LinkSearchItem): string {
  const title = (item.titel ?? "").trim();
  if (title) return title;
  const firstLine = (item.inhoud ?? "").split("\n")[0] ?? "";
  return firstLine.trim().slice(0, 50);
}

type EventOptionGroup = {
  id: string;
  label: string;
  events: PersonalEvent[];
};

// ── Draft persistence (FH9) ──────────────────────────────────────────────────
// A tab-reload, PWA-kill or Android back press must never destroy a long
// unsaved note. While dirty, a snapshot of title+content is debounced into
// localStorage (per note id; "new-note" for a fresh editor) and offered back
// via an inline restore banner on the next open.
type NoteDraft = {
  titel: string;
  inhoud: string;
  savedAt: number;
  // Uitgebreid (low): ook tags/deadline/kleur overleven een hard kill.
  tags?: string[];
  deadline?: string;
  kleur?: string;
};

const DRAFT_KEY_PREFIX = "note-editor-draft:";

function draftStorageKey(noteId?: string | null) {
  return `${DRAFT_KEY_PREFIX}${noteId ?? "new-note"}`;
}

function readDraft(key: string): NoteDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NoteDraft>;
    if (typeof parsed.inhoud !== "string" || typeof parsed.savedAt !== "number") return null;
    return {
      titel: typeof parsed.titel === "string" ? parsed.titel : "",
      inhoud: parsed.inhoud,
      savedAt: parsed.savedAt,
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t): t is string => typeof t === "string") : undefined,
      deadline: typeof parsed.deadline === "string" ? parsed.deadline : undefined,
      kleur: typeof parsed.kleur === "string" ? parsed.kleur : undefined,
    };
  } catch {
    return null;
  }
}

function clearStoredDraft(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

type EditorPanel = "details" | "style" | "history";
type PendingEditorAction = "archive" | "complete" | "delete" | "pin" | null;
type NoteAction = (id: string) => void | Promise<void>;
type NoteEditorSnapshot = {
  titel: string;
  inhoud: string;
  tags: string[];
  kleur: string;
  deadline: string;
  linkedEventId: string;
  prioriteit: string;
  symbol: AppIconName;
  businessContextType: string;
  businessContextId: string;
  businessContextTitle: string;
};

interface NoteEditorProps {
  note?: NoteRecord | null;
  userId?: string;
  onSave: (data: NoteCreateData) => Promise<void>;
  onClose: () => void;
  onDelete?: NoteAction;
  onArchive?: NoteAction;
  onTogglePin?: NoteAction;
  onToggleComplete?: NoteAction;
  onLoadRevisions?: (id: string) => Promise<NoteRevisionRecord[]>;
  onRestoreRevision?: (id: string, revisionId: string) => Promise<NoteRecord>;
  eventOptions?: PersonalEvent[];
  initialDeadline?: string;
  initialLinkedEventId?: string;
  initialTags?: string[];
  initialTitle?: string;
  initialBusinessContext?: BusinessContextValue | null;
}

export function NoteEditor({
  note,
  userId,
  onSave,
  onClose,
  onDelete,
  onArchive,
  onTogglePin,
  onToggleComplete,
  onLoadRevisions,
  onRestoreRevision,
  eventOptions = [],
  initialDeadline,
  initialLinkedEventId,
  initialTags,
  initialTitle,
  initialBusinessContext,
}: NoteEditorProps) {
  const titleId = useId();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  // Tags the user explicitly removed (lower-cased) — auto-context-merge must not
  // re-add them, otherwise removing a context tag is impossible.
  const removedTagsRef = useRef<Set<string>>(new Set());
  const { openConfirm } = useConfirm();

  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingEditorAction>(null);
  const [saveError, setSaveError] = useState("");
  const [titel, setTitel] = useState(note?.titel ?? initialTitle ?? "");
  const [inhoud, setInhoud] = useState(note?.inhoud ?? "");
  const [tags, setTags] = useState<string[]>(() => normalizeTags(note?.tags ?? initialTags ?? []));
  const [kleur, setKleur] = useState(note?.kleur ?? "");
  const [tagInput, setTagInput] = useState("");
  const [deadline, setDeadline] = useState(note?.deadline ?? initialDeadline ?? "");
  const [linkedEventId, setLinkedEventId] = useState(note?.linkedEventId ?? note?.linked_event_id ?? initialLinkedEventId ?? "");
  const [prioriteit, setPrioriteit] = useState(note?.prioriteit ?? "normaal");
  const [symbol, setSymbol] = useState<AppIconName>(() => resolveAppIconName(note?.symbol, "note"));
  const [businessContext, setBusinessContext] = useState<BusinessContextValue | null>(() =>
    noteBusinessContext(note) ?? normalizeBusinessContext(initialBusinessContext),
  );
  const [businessContextTouched, setBusinessContextTouched] = useState(false);
  const [symbolTouched, setSymbolTouched] = useState(false);
  const [activePanel, setActivePanel] = useState<EditorPanel>("details");
  const [showTemplates, setShowTemplates] = useState(false);

  const [linkSearch, setLinkSearch] = useState("");
  const [linkActive, setLinkActive] = useState(false);
  const [linkCursorPos, setLinkCursorPos] = useState(0);
  const [linkResults, setLinkResults] = useState<{ id: string; titel: string }[]>([]);

  const [revisions, setRevisions] = useState<NoteRevisionRecord[]>([]);
  const [revisionLoading, setRevisionLoading] = useState(false);
  const [revisionError, setRevisionError] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  // M-K: welke revisie volledig uitgeklapt is (inhoud bekijken vóór herstellen).
  const [expandedRevisionId, setExpandedRevisionId] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<NoteEditorSnapshot>(() => buildInitialSnapshot(note, {
    initialDeadline,
    initialLinkedEventId,
    initialTags,
    initialTitle,
    initialBusinessContext,
  }));

  // FH9c: draft snapshot in localStorage. On open, offer restore when a draft
  // exists that is newer than the note's last save and differs from what the
  // editor already shows.
  const draftKey = draftStorageKey(note?.id);
  const [pendingDraft, setPendingDraft] = useState<NoteDraft | null>(() => {
    const draft = readDraft(draftStorageKey(note?.id));
    if (!draft) return null;
    const baseTitel = note?.titel ?? initialTitle ?? "";
    const baseInhoud = note?.inhoud ?? "";
    if (draft.titel === baseTitel && draft.inhoud === baseInhoud) return null;
    if (note?.gewijzigd && draft.savedAt <= new Date(note.gewijzigd).getTime()) return null;
    return draft;
  });

  const resolvedUserId = userId || note?.user_id;
  const isPinned = Boolean(note?.isPinned || note?.is_pinned);
  const isCompleted = Boolean(note?.isCompleted || note?.is_completed);
  const charCount = inhoud.length;
  const wordCount = inhoud.trim() ? inhoud.trim().split(/\s+/).length : 0;
  const lineCount = inhoud ? inhoud.split("\n").length : 0;

  const eventOptionGroups = useMemo(
    () => buildEventOptionGroups(eventOptions, linkedEventId),
    [eventOptions, linkedEventId],
  );
  const { options: laventeCareContextOptions } = useLaventeCareBusinessContextOptions();
  const eventById = useMemo(() => {
    const map = new Map<string, PersonalEvent>();
    for (const event of eventOptions) {
      if (event.eventId) map.set(event.eventId, event);
    }
    return map;
  }, [eventOptions]);
  const linkedEventExists = useMemo(
    () => Boolean(linkedEventId && eventOptionGroups.some((group) => group.events.some((event) => event.eventId === linkedEventId))),
    [eventOptionGroups, linkedEventId],
  );
  const selectedEvent = linkedEventId ? eventById.get(linkedEventId) : undefined;
  const selectedEventContextTags = useMemo(() => contextTagsFromEvent(selectedEvent), [selectedEvent]);
  const selectedEventBusinessContext = useMemo(() => businessContextFromEvent(selectedEvent), [selectedEvent]);
  const inferredBusinessContext = useMemo(
    () => resolveLaventeCareBusinessContextFromText(
      `${titel} ${inhoud} ${selectedEvent?.titel ?? ""} ${selectedEvent?.beschrijving ?? ""} ${selectedEvent?.locatie ?? ""}`,
      laventeCareContextOptions,
      businessContext,
    ),
    [businessContext, inhoud, laventeCareContextOptions, selectedEvent?.beschrijving, selectedEvent?.locatie, selectedEvent?.titel, titel],
  );
  const detectedContexts = useMemo(() => detectWorkspaceContexts(
    `${titel} ${inhoud} ${selectedEvent?.titel ?? ""} ${selectedEvent?.beschrijving ?? ""}`,
    mergeTags(tags, selectedEventContextTags, extractHashTags(`${titel} ${inhoud}`)),
  ), [inhoud, selectedEvent?.beschrijving, selectedEvent?.titel, selectedEventContextTags, tags, titel]);
  const primaryContext = detectedContexts[0] ?? null;
  const automaticBusinessContext = useMemo(() => {
    const selectedSpecific = isSpecificLaventeCareBusinessContext(selectedEventBusinessContext) ? selectedEventBusinessContext : null;
    return selectedSpecific
      ?? inferredBusinessContext
      ?? selectedEventBusinessContext
      ?? businessContextFromWorkspaceContext(primaryContext);
  }, [inferredBusinessContext, primaryContext, selectedEventBusinessContext]);
  const effectiveBusinessContext = useMemo(() => {
    if (businessContextTouched) return businessContext;
    if (!businessContext) return automaticBusinessContext;
    if (isGenericLaventeCareBusinessContext(businessContext) && isSpecificLaventeCareBusinessContext(automaticBusinessContext)) {
      return automaticBusinessContext;
    }
    return businessContext;
  }, [automaticBusinessContext, businessContext, businessContextTouched]);
  const showEventSelector = eventOptionGroups.length > 0 || Boolean(linkedEventId);
  const actionBusy = saving || pendingAction !== null || restoringId !== null;

  const currentSnapshot = useMemo<NoteEditorSnapshot>(() => normalizeEditorSnapshot({
    titel: titel.trim(),
    inhoud: inhoud.trimEnd(),
    tags,
    kleur,
    deadline,
    linkedEventId,
    prioriteit,
    symbol,
    businessContextType: businessContext?.type ?? "",
    businessContextId: businessContext?.id ?? "",
    businessContextTitle: businessContext?.title ?? "",
  }), [businessContext?.id, businessContext?.title, businessContext?.type, deadline, inhoud, kleur, linkedEventId, prioriteit, symbol, tags, titel]);
  const isDirty = useMemo(
    () => !sameEditorSnapshot(currentSnapshot, baseline),
    [baseline, currentSnapshot],
  );
  const checklistStats = useMemo(() => getChecklistStats(inhoud), [inhoud]);

  const hasContent = Boolean(titel.trim() || inhoud.trim());
  const canSave = hasContent && (!note || isDirty);

  const autoResize = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = typeof window !== "undefined" && window.innerWidth < 768 ? 360 : 560;
    el.style.height = `${Math.max(240, Math.min(el.scrollHeight, maxHeight))}px`;
  }, []);

  const applyContent = useCallback((next: string, cursorStart?: number, cursorEnd?: number) => {
    setInhoud(next);
    requestAnimationFrame(() => {
      const el = textRef.current;
      if (el && cursorStart != null) {
        el.setSelectionRange(cursorStart, cursorEnd ?? cursorStart);
        el.focus();
      }
      autoResize();
    });
  }, [autoResize]);

  const replaceSelection = useCallback((build: (selection: string) => { replacement: string; cursorOffset?: number; selectLength?: number }) => {
    const el = textRef.current;
    const start = el?.selectionStart ?? inhoud.length;
    const end = el?.selectionEnd ?? inhoud.length;
    const selection = inhoud.slice(start, end);
    const patch = build(selection);
    const cursorOffset = patch.cursorOffset ?? patch.replacement.length;
    const selectLength = patch.selectLength ?? 0;
    const next = inhoud.slice(0, start) + patch.replacement + inhoud.slice(end);
    const cursor = start + cursorOffset;
    applyContent(next, cursor, cursor + selectLength);
  }, [applyContent, inhoud]);

  const prefixSelectedLines = useCallback((prefix: string | ((index: number) => string)) => {
    const el = textRef.current;
    const start = el?.selectionStart ?? inhoud.length;
    const end = el?.selectionEnd ?? inhoud.length;
    const lineStart = inhoud.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const nextBreak = inhoud.indexOf("\n", end);
    const lineEnd = nextBreak === -1 ? inhoud.length : nextBreak;
    const block = inhoud.slice(lineStart, lineEnd);

    if (!block) {
      const value = typeof prefix === "function" ? prefix(0) : prefix;
      const before = inhoud.slice(0, start);
      const needsBreak = before.length > 0 && !before.endsWith("\n");
      const insert = `${needsBreak ? "\n" : ""}${value}`;
      applyContent(inhoud.slice(0, start) + insert + inhoud.slice(end), start + insert.length);
      return;
    }

    const transformed = block
      .split("\n")
      .map((line, index) => `${typeof prefix === "function" ? prefix(index) : prefix}${line}`)
      .join("\n");
    const next = inhoud.slice(0, lineStart) + transformed + inhoud.slice(lineEnd);
    applyContent(next, lineStart + transformed.length);
  }, [applyContent, inhoud]);

  const reloadRevisions = useCallback(async () => {
    if (!note?.id || !onLoadRevisions) return;
    setRevisionLoading(true);
    setRevisionError("");
    try {
      const rows = await onLoadRevisions(note.id);
      setRevisions(rows);
    } catch (err: unknown) {
      setRevisionError(err instanceof Error ? err.message : "Geschiedenis laden mislukt");
    } finally {
      setRevisionLoading(false);
    }
  }, [note?.id, onLoadRevisions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== "undefined" && window.innerWidth >= 640) {
        textRef.current?.focus();
      }
      autoResize();
    }, 120);
    return () => clearTimeout(timer);
  }, [autoResize]);

  useEffect(() => {
    autoResize();
  }, [autoResize, inhoud]);

  useEffect(() => {
    // Only merge tags from EXPLICIT context (a linked event / business context),
    // not from free-text #hashtags typed in the title/body — doing the latter on
    // every keystroke silently added tags the user never chose and kept the note
    // permanently "Onopgeslagen". Also skip any tag the user removed by hand.
    const suppressed = removedTagsRef.current;
    const contextTags = (primaryContext ? [primaryContext.tag] : []).filter((tag) => !suppressed.has(tag.toLowerCase()));
    const eventTags = selectedEventContextTags.filter((tag) => !suppressed.has(tag.toLowerCase()));
    const nextTags = mergeTags(tags, eventTags, contextTags);
    if (tagsKey(nextTags) !== tagsKey(tags)) {
      setTags(nextTags);
    }
  }, [primaryContext, selectedEventContextTags, tags]);

  useEffect(() => {
    if (businessContextTouched || !automaticBusinessContext) return;
    if (!businessContext || (isGenericLaventeCareBusinessContext(businessContext) && isSpecificLaventeCareBusinessContext(automaticBusinessContext))) {
      setBusinessContext(automaticBusinessContext);
    }
  }, [automaticBusinessContext, businessContext, businessContextTouched]);

  useEffect(() => {
    if (!effectiveBusinessContext?.type?.startsWith("laventecare")) return;
    if (removedTagsRef.current.has("laventecare")) return;
    setTags((current) => {
      const next = mergeTags(current, ["laventecare"]);
      return tagsKey(next) === tagsKey(current) ? current : next;
    });
    if (!symbolTouched && ["note", "pageNote", "calendar", "work"].includes(symbol)) {
      setSymbol("business");
    }
  }, [effectiveBusinessContext?.type, symbol, symbolTouched]);

  useEffect(() => {
    if (!primaryContext || symbolTouched) return;
    if (symbol !== primaryContext.noteSymbol) {
      setSymbol(primaryContext.noteSymbol);
    }
  }, [primaryContext, symbol, symbolTouched]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      const modal = scrollRef.current?.parentElement;
      if (modal) {
        modal.style.maxHeight = window.innerWidth < 640 ? `${vv.height}px` : `${vv.height - 16}px`;
      }
    };

    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    onResize();
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  useEffect(() => {
    if (!linkActive || !linkSearch || !resolvedUserId) {
      setLinkResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await getNotesSearch({ userId: resolvedUserId, q: linkSearch, limit: 5 });
        const items = getLinkSearchItems(results);
        setLinkResults(items
          .filter((item): item is LinkSearchItem & { id: string } => Boolean(item.id))
          .map((item) => ({ id: item.id, titel: noteLinkLabel(item) }))
          .filter((item) => item.titel.length > 0));
      } catch {
        setLinkResults([]);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [linkActive, linkSearch, resolvedUserId]);

  useEffect(() => {
    if (activePanel === "history") {
      void reloadRevisions();
    }
  }, [activePanel, reloadRevisions]);

  const handleContentChange = (val: string) => {
    setInhoud(val);

    const el = textRef.current;
    if (el) {
      const pos = el.selectionStart;
      const textBefore = val.slice(0, pos);
      const lastOpen = textBefore.lastIndexOf("[[");
      const lastClose = textBefore.lastIndexOf("]]");

      if (lastOpen > lastClose) {
        const searchTerm = textBefore.slice(lastOpen + 2);
        if (!searchTerm.includes("\n")) {
          setLinkActive(true);
          setLinkSearch(searchTerm);
          setLinkCursorPos(pos);
          return;
        }
      }
    }
    setLinkActive(false);
    setLinkSearch("");
  };

  const insertLink = useCallback((title: string) => {
    const el = textRef.current;
    if (!el) return;

    const before = inhoud.slice(0, linkCursorPos);
    const lastOpen = before.lastIndexOf("[[");
    const newText = inhoud.slice(0, lastOpen) + `[[${title}]]` + inhoud.slice(linkCursorPos);
    setInhoud(newText);
    setLinkActive(false);
    setLinkSearch("");

    requestAnimationFrame(() => {
      const newPos = lastOpen + title.length + 4;
      el.setSelectionRange(newPos, newPos);
      el.focus();
      autoResize();
    });
  }, [autoResize, inhoud, linkCursorPos]);

  // R4a: de history-sentinel wordt synchronic geconsumeerd in de sluit-paden
  // (close/save/delete/archive/complete) VÓÓR unmount — de unmount-cleanup was
  // te laat wanneer AnimatePresence de instantie nog ~200ms in leven hield en
  // lekte een verdwaalde entry bij in-app navigatie.
  const sentinelConsumedRef = useRef(false);
  const consumeHistorySentinel = useCallback(() => {
    if (sentinelConsumedRef.current) return;
    sentinelConsumedRef.current = true;
    if (typeof window !== "undefined" && window.history.state?.noteEditorGuard) {
      window.history.back();
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!canSave || actionBusy) return;
    setSaving(true);
    setSaveError("");
    try {
      const isEditing = Boolean(note);
      const cleanTitle = titel.trim();
      const cleanContent = inhoud.trimEnd();
      const cleanLinkedEventId = linkedEventId && eventById.has(linkedEventId) ? linkedEventId : "";
      const enriched = enrichNoteDraft({
        title: cleanTitle,
        content: `${cleanContent} ${selectedEvent?.titel ?? ""} ${selectedEvent?.beschrijving ?? ""}`,
        tags: mergeTags(tags, selectedEventContextTags),
        symbol,
        businessContext: effectiveBusinessContext,
      });
      await onSave({
        titel: cleanTitle || (isEditing ? "" : undefined),
        inhoud: cleanContent,
        // Persist exactly the tags shown in the UI (these already include explicit
        // event/business-context tags via the merge effect) — not enriched.tags,
        // which silently appended body-hashtag tags the user never saw and made
        // the stored record diverge from the baseline/dirty-state.
        tags: tags.length > 0 ? tags : isEditing ? [] : undefined,
        kleur: kleur || (isEditing ? "" : undefined),
        deadline: normalizeDeadlineForSave(deadline) || (isEditing ? "" : undefined),
        linkedEventId: cleanLinkedEventId || (isEditing ? "" : undefined),
        prioriteit,
        symbol: enriched.symbol,
        businessContextType: enriched.businessContext?.type || (isEditing ? "" : undefined),
        businessContextId: enriched.businessContext?.id || (isEditing ? "" : undefined),
        businessContextTitle: enriched.businessContext?.title || (isEditing ? "" : undefined),
      });
      setBaseline(currentSnapshot);
      // Successful save — the localStorage draft is now stale (FH9c).
      clearStoredDraft(draftKey);
      consumeHistorySentinel();
      onClose();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  }, [actionBusy, canSave, consumeHistorySentinel, currentSnapshot, deadline, draftKey, effectiveBusinessContext, eventById, inhoud, kleur, linkedEventId, note, onClose, onSave, prioriteit, selectedEvent?.beschrijving, selectedEvent?.titel, selectedEventContextTags, symbol, tags, titel]);

  // M-A: reentrancy-guard (HabitForm-patroon) — Escape in de discard-confirm
  // mag geen tweede confirm openen, en Ctrl+Enter mag niet opslaan terwijl de
  // confirm openstaat.
  const confirmingCloseRef = useRef(false);
  const handleCloseAttempt = useCallback(async () => {
    if (confirmingCloseRef.current) return;
    if (isDirty) {
      confirmingCloseRef.current = true;
      try {
        const confirmed = await openConfirm({
          title: "Wijzigingen sluiten?",
          message: "Je hebt nog onopgeslagen wijzigingen in deze notitie.",
          confirmLabel: "Sluiten",
          variant: "danger",
        });
        if (!confirmed) return;
      } finally {
        confirmingCloseRef.current = false;
      }
    }
    // Explicitly closed (clean, or discard confirmed) — drop the draft so the
    // restore banner doesn't resurrect content the user chose to throw away.
    clearStoredDraft(draftKey);
    consumeHistorySentinel();
    onClose();
  }, [consumeHistorySentinel, draftKey, isDirty, onClose, openConfirm]);

  // FH9a: warn before a tab-reload/close while there are unsaved changes.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // FH9c: while dirty, debounce a title/content snapshot into localStorage so
  // a hard kill (PWA swipe-away, crash) can still be recovered.
  useEffect(() => {
    if (!isDirty) return;
    const timer = window.setTimeout(() => {
      try {
        const draft: NoteDraft = {
          titel,
          inhoud,
          savedAt: Date.now(),
          tags,
          deadline: deadline || undefined,
          kleur: kleur || undefined,
        };
        window.localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch {}
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [deadline, draftKey, inhoud, isDirty, kleur, tags, titel]);

  // FH9b: push a history entry when the editor opens and intercept popstate so
  // the Android/browser back button routes through the dirty-confirm instead of
  // navigating away and destroying the draft.
  const handleCloseAttemptRef = useRef(handleCloseAttempt);
  useEffect(() => {
    handleCloseAttemptRef.current = handleCloseAttempt;
  }, [handleCloseAttempt]);

  const mountedAtRef = useRef(Date.now());
  useEffect(() => {
    // Preserve Next.js' own history state — only add our sentinel flag.
    window.history.pushState({ ...window.history.state, noteEditorGuard: true }, "");
    const onPopState = () => {
      // Onze eigen compensatie-back (sentinel al geconsumeerd via een van de
      // sluit-paden) — negeren, anders zou de sentinel opnieuw ge-armd worden.
      if (sentinelConsumedRef.current) return;
      // Back consumed the sentinel: re-arm it so the editor stays put.
      window.history.pushState({ ...window.history.state, noteEditorGuard: true }, "");
      // R4b: mount-grace — een popstate in de eerste ~300ms is vrijwel zeker
      // de cleanup-back van een vórige editor-instantie (close→reopen binnen
      // het AnimatePresence-venster), geen echte Back van de gebruiker. De
      // sentinel is hierboven al her-armd; niet sluiten.
      if (Date.now() - mountedAtRef.current < 300) return;
      void handleCloseAttemptRef.current();
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (sentinelConsumedRef.current) return;
      sentinelConsumedRef.current = true;
      if (window.history.state?.noteEditorGuard) {
        // Nog op de sentinel-entry (editor extern gesloten, bv. key-wissel):
        // consumeren zodat de volgende Back niet twee keer hoeft.
        window.history.back();
      } else {
        // R4c: in-app weggenavigeerd met open editor — de sentinel-entry ligt
        // onder de nieuwe route en kan niet meer veilig gepopt worden zonder
        // de navigatie terug te draaien. Best effort: strip alleen de
        // guard-vlag via replaceState. Bekend residu: één extra Back-druk kan
        // nodig zijn om voorbij de verweesde entry te komen.
        try {
          const state = { ...((window.history.state ?? {}) as Record<string, unknown>) };
          delete state.noteEditorGuard;
          window.history.replaceState(state, "");
        } catch {}
      }
    };
  }, []);

  const restoreDraft = useCallback(() => {
    if (!pendingDraft) return;
    setTitel(pendingDraft.titel);
    setInhoud(pendingDraft.inhoud);
    // Uitgebreide draft-velden (low): alleen toepassen wanneer aanwezig, oude
    // drafts zonder deze velden herstellen zoals voorheen.
    if (pendingDraft.tags) setTags(normalizeTags(pendingDraft.tags));
    if (pendingDraft.deadline !== undefined) setDeadline(pendingDraft.deadline);
    if (pendingDraft.kleur !== undefined) setKleur(pendingDraft.kleur);
    setPendingDraft(null);
    requestAnimationFrame(() => {
      textRef.current?.focus();
      autoResize();
    });
  }, [autoResize, pendingDraft]);

  const discardDraft = useCallback(() => {
    clearStoredDraft(draftKey);
    setPendingDraft(null);
  }, [draftKey]);

  const handleDeleteClick = useCallback(async () => {
    if (!onDelete || !note || actionBusy) return;
    const confirmed = await openConfirm({
      title: "Notitie verwijderen?",
      message: "Deze notitie en de bijbehorende geschiedenis worden permanent verwijderd.",
      confirmLabel: "Verwijderen",
      variant: "danger",
    });
    if (!confirmed) return;
    setPendingAction("delete");
    setSaveError("");
    try {
      await onDelete(note.id);
      clearStoredDraft(draftKey);
      consumeHistorySentinel();
      onClose();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Verwijderen mislukt");
      setPendingAction(null);
    }
  }, [actionBusy, consumeHistorySentinel, draftKey, note, onClose, onDelete, openConfirm]);

  const handleArchiveClick = useCallback(async () => {
    if (!onArchive || !note || actionBusy) return;
    setPendingAction("archive");
    setSaveError("");
    try {
      await onArchive(note.id);
      consumeHistorySentinel();
      onClose();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Archiveren mislukt");
      setPendingAction(null);
    }
  }, [actionBusy, consumeHistorySentinel, note, onArchive, onClose]);

  const handleCompleteClick = useCallback(async () => {
    if (!onToggleComplete || !note || actionBusy || isDirty) return;
    setPendingAction("complete");
    setSaveError("");
    try {
      await onToggleComplete(note.id);
      consumeHistorySentinel();
      onClose();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Afronden mislukt");
      setPendingAction(null);
    }
  }, [actionBusy, consumeHistorySentinel, isDirty, note, onClose, onToggleComplete]);

  const handlePinClick = useCallback(async () => {
    if (onTogglePin && note && !actionBusy) {
      setPendingAction("pin");
      setSaveError("");
      try {
        await onTogglePin(note.id);
      } catch (err: unknown) {
        setSaveError(err instanceof Error ? err.message : "Pinnen mislukt");
      } finally {
        setPendingAction(null);
      }
    }
  }, [actionBusy, note, onTogglePin]);

  const applySnapshot = useCallback((snapshot: NoteEditorSnapshot) => {
    setTitel(snapshot.titel);
    setInhoud(snapshot.inhoud);
    setTags(snapshot.tags);
    setKleur(snapshot.kleur);
    setDeadline(snapshot.deadline);
    setLinkedEventId(snapshot.linkedEventId);
    setPrioriteit(snapshot.prioriteit);
    setSymbol(snapshot.symbol);
    setBusinessContext(normalizeBusinessContext({
      type: snapshot.businessContextType,
      id: snapshot.businessContextId,
      title: snapshot.businessContextTitle,
    }));
    setBusinessContextTouched(false);
    requestAnimationFrame(() => {
      textRef.current?.focus();
      autoResize();
    });
  }, [autoResize]);

  const handleResetChanges = useCallback(async () => {
    if (!isDirty || actionBusy) return;
    const confirmed = await openConfirm({
      title: "Wijzigingen terugzetten?",
      message: "De editor gaat terug naar de laatst opgeslagen versie.",
      confirmLabel: "Terugzetten",
    });
    if (!confirmed) return;
    applySnapshot(baseline);
  }, [actionBusy, applySnapshot, baseline, isDirty, openConfirm]);

  const handleRestoreRevision = useCallback(async (revision: NoteRevisionRecord) => {
    if (!note?.id || !onRestoreRevision) return;
    const confirmed = await openConfirm({
      title: "Versie herstellen?",
      message: "De huidige inhoud wordt eerst als nieuwe versie bewaard, daarna wordt deze versie teruggezet.",
      confirmLabel: "Herstellen",
    });
    if (!confirmed) return;

    setRestoringId(revision.id);
    setSaveError("");
    try {
      const restored = await onRestoreRevision(note.id, revision.id);
      const restoredSnapshot = snapshotFromNote(restored);
      applySnapshot(restoredSnapshot);
      setBaseline(restoredSnapshot);
      await reloadRevisions();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Herstellen mislukt");
    } finally {
      setRestoringId(null);
    }
  }, [applySnapshot, note?.id, onRestoreRevision, openConfirm, reloadRevisions]);

  useEffect(() => {
    // Remember whatever triggered the editor so focus can return there on close
    // (mirrors the shared useFocusTrap behaviour for keyboard users).
    const previousFocus = document.activeElement as HTMLElement | null;

    const handler = (event: KeyboardEvent) => {
      // M-A: terwijl de discard-confirm openstaat hoort géén editor-shortcut te
      // vuren — Escape zou de confirm opnieuw openen (loop) en Ctrl+Enter zou
      // onder de confirm door opslaan. De focus-trap laat de confirm ook met
      // rust.
      if (confirmingCloseRef.current) return;

      if (event.key === "Tab") {
        const modal = modalRef.current;
        if (!modal) return;

        const focusable = Array.from(
          modal.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
          ),
        ).filter(isFocusableElement);

        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const activeElement = document.activeElement;

        if (!activeElement || !modal.contains(activeElement)) {
          event.preventDefault();
          first.focus();
          return;
        }

        if (event.shiftKey && activeElement === first) {
          event.preventDefault();
          last.focus();
          return;
        }

        if (!event.shiftKey && activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }

      if (event.key === "Escape") {
        event.preventDefault();
        void handleCloseAttempt();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      // Return focus to the originating card/button when the editor closes.
      previousFocus?.focus?.();
    };
  }, [handleCloseAttempt, handleSave]);

  const insertChecklist = () => prefixSelectedLines("- [ ] ");
  const insertBulletList = () => prefixSelectedLines("- ");
  const insertNumberedList = () => prefixSelectedLines((index) => `${index + 1}. `);
  const insertHeading = () => prefixSelectedLines("## ");
  const insertQuote = () => prefixSelectedLines("> ");
  const insertWikiLink = () => replaceSelection((selection) => {
    const label = selection.trim() || "Nieuwe notitie";
    return {
      replacement: `[[${label}]]`,
      cursorOffset: selection.trim() ? label.length + 4 : 2,
      selectLength: selection.trim() ? 0 : label.length,
    };
  });
  const insertTimestamp = () => replaceSelection(() => {
    const value = formatDutchDateTime(new Date().toISOString());
    return { replacement: value };
  });

  const applyTemplate = (template: NoteTemplate) => {
    const prefix = inhoud.trim() ? "\n\n" : "";
    setInhoud(`${inhoud}${prefix}${template.content}`);
    if (!titel.trim()) setTitel(template.title);
    const templateTags = template.tags ?? [];
    if (templateTags.length) setTags((current) => normalizeTags([...current, ...templateTags]));
    if (template.priority) setPrioriteit(template.priority);
    if (template.symbol) {
      setSymbolTouched(true);
      setSymbol(template.symbol);
    }
    if (template.businessContext && !businessContext) setBusinessContext(template.businessContext);
    setShowTemplates(false);
    requestAnimationFrame(() => {
      textRef.current?.focus();
      autoResize();
    });
  };

  const addTag = () => {
    const added = tagInput.split(",").map((t) => t.trim()).filter(Boolean);
    // A re-added tag is no longer "removed" — let auto-context manage it again.
    for (const tag of added) removedTagsRef.current.delete(tag.toLowerCase());
    const nextTags = normalizeTags([...tags, ...added]);
    if (nextTags.length !== tags.length || tagsKey(nextTags) !== tagsKey(tags)) {
      setTags(nextTags);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    removedTagsRef.current.add(tag.toLowerCase());
    setTags(tags.filter((item) => item !== tag));
  };

  // Amsterdam-gepind (low): "Vandaag 17:00" moet 17:00 Amsterdamse tijd zijn,
  // ook wanneer het device in een andere tijdzone staat.
  const setQuickDeadline = (days: number, hour = 9) => {
    setDeadline(amsterdamQuickDeadlineIso(days, hour));
  };

  const handleEventChange = (nextEventId: string) => {
    setLinkedEventId(nextEventId);
    const event = eventById.get(nextEventId);
    const eventContext = businessContextFromEvent(event);
    if (eventContext && !businessContextTouched && (!businessContext || isSpecificLaventeCareBusinessContext(eventContext) || isGenericLaventeCareBusinessContext(businessContext))) {
      setBusinessContext(eventContext);
    }
    if (!deadline && nextEventId) {
      const eventDeadline = event ? eventToDeadline(event) : "";
      if (eventDeadline) setDeadline(eventDeadline);
    }
  };

  const editorModal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-app-modal="note-editor"
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
    >
      <div
        className="absolute inset-0 cursor-pointer bg-black/65 backdrop-blur-sm"
        onClick={() => void handleCloseAttempt()}
      />

      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, y: 48, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 48, scale: 0.98 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-app-modal="note-editor"
        className="relative flex h-[100dvh] w-full flex-col overflow-hidden rounded-none border-0 border-[var(--color-border)] shadow-2xl shadow-black/40 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-5xl sm:rounded-2xl sm:border"
        style={{
          maxHeight: "100dvh",
          background: kleur
            ? `linear-gradient(145deg, ${kleur}12 0%, var(--color-surface) 48%)`
            : "var(--color-surface)",
        }}
      >
        <div className="flex justify-center pb-0 pt-[max(0.5rem,env(safe-area-inset-top))] sm:hidden">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <AppIcon name={symbol} tone="amber" size="md" framed active />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase text-[var(--color-text-subtle)]">
                {note ? "Notitie bewerken" : "Nieuwe notitie"}
              </p>
              <h2 id={titleId} className="truncate text-base font-bold text-[var(--color-text)] sm:text-lg">
                {titel.trim() || note?.titel || "Naamloze notitie"}
              </h2>
              {primaryContext && (
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-200">
                    <AppIcon name={primaryContext.noteSymbol} tone="cyan" size="xs" />
                    <span className="truncate">{primaryContext.label}</span>
                    <span className="text-cyan-300/70">#{primaryContext.tag}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <span
              className={`hidden rounded-full border px-2.5 py-1 text-xs font-medium sm:inline-flex ${
                isDirty
                  ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
                  : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              }`}
            >
              {isDirty ? "Onopgeslagen" : "Opgeslagen"}
            </span>
            {note && onTogglePin && (
              <button
                type="button"
                onClick={() => void handlePinClick()}
                disabled={actionBusy}
                className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 transition-colors ${
                  isPinned
                    ? "text-amber-300 hover:bg-amber-500/10"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                } disabled:cursor-not-allowed disabled:opacity-45`}
                title={isPinned ? "Ontpinnen" : "Pinnen"}
                aria-label={isPinned ? "Ontpinnen" : "Pinnen"}
                aria-pressed={isPinned}
              >
                <Pin size={18} className={isPinned ? "fill-amber-300" : ""} />
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleCloseAttempt()}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
              aria-label="Sluiten"
            >
              <X size={19} />
            </button>
          </div>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          <div className="grid min-h-full gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="min-w-0 space-y-3">
              {pendingDraft && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2">
                  <p className="min-w-0 flex-1 text-xs font-medium text-amber-200">
                    Onopgeslagen concept gevonden ({formatDutchDateTime(new Date(pendingDraft.savedAt).toISOString())})
                  </p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={restoreDraft}
                      className="inline-flex h-8 items-center rounded-lg border border-amber-500/30 bg-amber-500/15 px-2.5 text-xs font-bold text-amber-200 transition-colors hover:bg-amber-500/25"
                    >
                      Herstellen
                    </button>
                    <button
                      type="button"
                      onClick={discardDraft}
                      className="inline-flex h-8 items-center rounded-lg border border-[var(--color-border)] px-2.5 text-xs font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                    >
                      Verwijderen
                    </button>
                  </div>
                </div>
              )}
              <input
                type="text"
                placeholder="Titel"
                aria-label="Titel"
                value={titel}
                onChange={(event) => setTitel(event.target.value)}
                className="min-h-[48px] w-full rounded-xl border border-transparent bg-transparent px-1 text-xl font-bold text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-border)] focus:bg-black/10 focus:px-3 sm:text-2xl"
              />

              <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-black/10">
                <div className="flex flex-wrap items-center gap-1 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]/70 px-2 py-2">
                  <ToolbarButton icon={ListChecks} label="Checklist" onClick={insertChecklist} />
                  <ToolbarButton icon={List} label="Opsomming" onClick={insertBulletList} />
                  <ToolbarButton icon={ListOrdered} label="Genummerde lijst" onClick={insertNumberedList} />
                  <ToolbarButton icon={Heading1} label="Kop" onClick={insertHeading} />
                  <ToolbarButton icon={Quote} label="Quote" onClick={insertQuote} />
                  <ToolbarButton icon={Link2} label="Wiki-link" onClick={insertWikiLink} />
                  <ToolbarButton icon={Clock} label="Tijdstempel" onClick={insertTimestamp} />
                  <ToolbarButton icon={Sparkles} label="Templates" onClick={() => setShowTemplates((value) => !value)} active={showTemplates} />
                  <div className="ml-auto flex min-h-[40px] items-center gap-2 px-2 text-[11px] text-[var(--color-text-subtle)]">
                    <Clock size={12} />
                    <span>{wordCount}w</span>
                    <span>{charCount}c</span>
                  </div>
                </div>

                <AnimatePresence>
                  {showTemplates && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-b border-[var(--color-border)]"
                    >
                      <div className="max-h-[min(56dvh,560px)] overflow-y-auto p-3">
                        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase text-amber-300">
                              Templatebibliotheek
                            </p>
                            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                              Kies een vaste structuur met tags, prioriteit en context.
                            </p>
                          </div>
                          <span className="text-xs text-[var(--color-text-subtle)]">{NOTE_TEMPLATES.length} templates</span>
                        </div>

                        <div className="space-y-4">
                          {NOTE_TEMPLATE_GROUPS.map((group) => (
                            <section key={group.category} className="space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-[11px] font-semibold uppercase text-[var(--color-text-subtle)]">
                                  {group.category}
                                </p>
                                <span className="h-px flex-1 bg-[var(--color-border)]" />
                              </div>
                              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                                {group.templates.map((template) => (
                                  <button
                                    key={template.id}
                                    type="button"
                                    onClick={() => applyTemplate(template)}
                                    aria-label={`${template.label} template invoegen`}
                                    className="flex min-h-[112px] min-w-0 flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left transition-colors hover:border-amber-500/35 hover:bg-amber-500/10 focus:outline-none focus:ring-2 focus:ring-amber-500/35"
                                  >
                                    <span className="flex min-w-0 items-center gap-3">
                                      <AppIcon name={template.icon} tone="amber" size="sm" framed active />
                                      <span className="min-w-0 truncate text-sm font-semibold text-[var(--color-text)]">
                                        {template.label}
                                      </span>
                                    </span>
                                    <span className="line-clamp-2 min-h-[34px] text-xs leading-relaxed text-[var(--color-text-muted)]">
                                      {template.description}
                                    </span>
                                    <span className="mt-auto flex min-w-0 flex-wrap gap-1.5">
                                      {template.priority && (
                                        <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-200">
                                          {template.priority}
                                        </span>
                                      )}
                                      {template.tags?.slice(0, 2).map((tag) => (
                                        <span
                                          key={tag}
                                          className="max-w-full truncate rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]"
                                        >
                                          #{tag}
                                        </span>
                                      ))}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </section>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative">
                  <textarea
                    ref={textRef}
                    placeholder="Schrijf je notitie..."
                    aria-label="Notitie-inhoud"
                    value={inhoud}
                    onChange={(event) => handleContentChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
                        const el = event.currentTarget;
                        const pos = el.selectionStart;
                        const lineStart = inhoud.lastIndexOf("\n", pos - 1) + 1;
                        const currentLine = inhoud.slice(lineStart, pos);
                        const match = /^- \[[ x]\] /.exec(currentLine);
                        if (match) {
                          if (currentLine.trim() === "- [ ]") {
                            event.preventDefault();
                            applyContent(inhoud.slice(0, lineStart) + inhoud.slice(pos), lineStart);
                            return;
                          }
                          event.preventDefault();
                          const insert = "\n- [ ] ";
                          applyContent(inhoud.slice(0, pos) + insert + inhoud.slice(pos), pos + insert.length);
                        }
                      }
                    }}
                    className="block w-full resize-none bg-transparent px-4 py-4 text-base leading-relaxed text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)] sm:text-sm"
                    style={{ minHeight: 280 }}
                  />

                  <AnimatePresence>
                    {linkActive && linkResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute left-3 right-3 top-3 z-20 max-h-[220px] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-lg shadow-black/30"
                      >
                        {linkResults.map((result) => (
                          <button
                            key={result.id}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              insertLink(result.titel);
                            }}
                            className="flex min-h-[44px] w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
                          >
                            <Link2 size={14} className="shrink-0 text-amber-400/70" />
                            <span className="truncate">{result.titel}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </section>

            <aside className="min-w-0 space-y-3">
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1">
                <PanelButton icon={CalendarDays} label="Details" active={activePanel === "details"} onClick={() => setActivePanel("details")} />
                <PanelButton icon={Palette} label="Stijl" active={activePanel === "style"} onClick={() => setActivePanel("style")} />
                <PanelButton icon={History} label="Historie" active={activePanel === "history"} onClick={() => setActivePanel("history")} />
              </div>

              {/* popLayout i.p.v. wait (K4): geen lege-aside-flits terwijl het
                  vorige paneel eerst uit-animeert. */}
              <AnimatePresence mode="popLayout">
                {activePanel === "details" && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-3"
                  >
                    <PanelSection title="Planning">
                      <div className="grid grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-2">
                        <Clock size={15} className="text-[var(--color-text-subtle)]" />
                        <input
                          type="datetime-local"
                          aria-label="Deadline"
                          value={formatDeadlineForInput(deadline)}
                          onChange={(event) => setDeadline(event.target.value ? localDateTimeToIso(event.target.value) : "")}
                          className="min-h-[44px] min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none [color-scheme:dark]"
                        />
                        <button
                          type="button"
                          onClick={() => setDeadline("")}
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                          aria-label="Deadline verwijderen"
                          title="Deadline verwijderen"
                        >
                          <X size={15} />
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        <QuickButton label="Vandaag" onClick={() => setQuickDeadline(0, 17)} />
                        <QuickButton label="Morgen" onClick={() => setQuickDeadline(1, 9)} />
                        <QuickButton label="+7d" onClick={() => setQuickDeadline(7, 9)} />
                        <QuickButton label="Wissen" onClick={() => setDeadline("")} />
                      </div>
                    </PanelSection>

                    <PanelSection title="Prioriteit">
                      <div className="grid grid-cols-3 gap-1.5">
                        {PRIORITEITEN.map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setPrioriteit(item.value)}
                            className={`flex min-h-[42px] min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold transition-colors ${
                              prioriteit === item.value
                                ? "border-white/15 bg-white/10 text-[var(--color-text)]"
                                : "border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                            }`}
                          >
                            <span className={`h-2 w-2 shrink-0 rounded-full ${item.dot}`} />
                            <span className="truncate">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </PanelSection>

                    <PanelSection title="Zakelijk">
                      <BusinessContextPicker
                        value={businessContext}
                        onChange={(value) => {
                          setBusinessContextTouched(true);
                          setBusinessContext(value);
                        }}
                        compact
                      />
                    </PanelSection>

                    <PanelSection title="Afspraak">
                      {showEventSelector ? (
                        <EventLinkPicker
                          groups={eventOptionGroups}
                          selectedEvent={selectedEvent}
                          selectedEventId={linkedEventId}
                          linkedEventExists={linkedEventExists}
                          onChange={handleEventChange}
                        />
                      ) : (
                        <p className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
                          Geen afspraken beschikbaar.
                        </p>
                      )}
                    </PanelSection>
                  </motion.div>
                )}

                {activePanel === "style" && (
                  <motion.div
                    key="style"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-3"
                  >
                    <PanelSection title="Symbool">
                      <SymbolPicker
                        value={symbol}
                        options={NOTE_SYMBOL_OPTIONS}
                        onChange={(value) => {
                          setSymbolTouched(true);
                          setSymbol(value);
                        }}
                        tone="amber"
                        fallback="note"
                        className="border-0 bg-transparent p-0"
                        gridClassName="grid-cols-2"
                      />
                    </PanelSection>

                    <PanelSection title="Kleur">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setKleur("")}
                          className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all ${
                            !kleur
                              ? "border-white/30 bg-[var(--color-surface-hover)]"
                              : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-white/20"
                          }`}
                          aria-label="Geen kleur"
                          title="Geen kleur"
                        >
                          {!kleur && <X size={14} className="text-[var(--color-text-muted)]" />}
                        </button>
                        {KLEUREN.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setKleur(item)}
                            className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 transition-all ${
                              kleur === item ? "scale-105 border-white/60" : "border-transparent hover:scale-105"
                            }`}
                            style={{ background: item }}
                            aria-label={`Kleur ${item}`}
                            title={`Kleur ${item}`}
                          >
                            {kleur === item && <Check size={15} className="text-white drop-shadow" />}
                          </button>
                        ))}
                      </div>
                    </PanelSection>

                    <PanelSection title="Tags">
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className="inline-flex min-h-[38px] min-w-0 items-center gap-1 rounded-lg border border-amber-500/15 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-300/85 transition-colors hover:border-red-500/25 hover:bg-red-500/15 hover:text-red-300"
                            onClick={() => removeTag(tag)}
                            aria-label={`Tag ${tag} verwijderen`}
                            title={`Tag ${tag} verwijderen`}
                          >
                            <Tag size={11} />
                            <span className="max-w-[9rem] truncate">{tag}</span>
                            <X size={11} />
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                        <div className="grid min-h-[44px] grid-cols-[1rem_minmax(0,1fr)] items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3">
                          <Hash size={14} className="text-[var(--color-text-subtle)]" />
                          <input
                            type="text"
                            placeholder="Nieuwe tag"
                            aria-label="Nieuwe tag"
                            value={tagInput}
                            onChange={(event) => setTagInput(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === ",") {
                                event.preventDefault();
                                addTag();
                              }
                            }}
                            className="min-w-0 bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={addTag}
                          className="min-h-[44px] rounded-xl border border-[var(--color-border)] px-3 text-sm font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                        >
                          Toevoegen
                        </button>
                      </div>
                    </PanelSection>
                  </motion.div>
                )}

                {activePanel === "history" && (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-3"
                  >
                    <PanelSection
                      title="Geschiedenis"
                      action={note && onLoadRevisions ? (
                        <button
                          type="button"
                          onClick={() => void reloadRevisions()}
                          disabled={revisionLoading}
                          className="flex min-h-[34px] min-w-[34px] items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:opacity-45"
                          aria-label="Geschiedenis vernieuwen"
                          title="Geschiedenis vernieuwen"
                        >
                          <RefreshCw size={13} className={revisionLoading ? "animate-spin" : ""} />
                        </button>
                      ) : null}
                    >
                      {!note ? (
                        <p className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
                          Geschiedenis start na de eerste opslag.
                        </p>
                      ) : !onLoadRevisions ? (
                        <p className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
                          Geschiedenis is niet beschikbaar in deze context.
                        </p>
                      ) : revisionLoading ? (
                        <p className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
                          Versies laden...
                        </p>
                      ) : revisionError ? (
                        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                          {revisionError}
                        </p>
                      ) : revisions.length === 0 ? (
                        <p className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
                          Nog geen eerdere versies.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {revisions.map((revision) => {
                            const expanded = expandedRevisionId === revision.id;
                            return (
                              <div
                                key={revision.id}
                                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                                      {revision.titel || firstContentLine(revision.inhoud) || "Naamloze versie"}
                                    </p>
                                    <p className="mt-0.5 text-xs text-[var(--color-text-subtle)]">
                                      {formatDutchDateTime(revision.aangemaakt)}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => void handleRestoreRevision(revision)}
                                    disabled={!onRestoreRevision || actionBusy}
                                    className="flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 text-xs font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:opacity-50"
                                  >
                                    <RotateCcw size={13} />
                                    {restoringId === revision.id ? "..." : "Herstel"}
                                  </button>
                                </div>
                                {/* M-K: volledige inhoud inzien vóór herstellen */}
                                {expanded ? (
                                  <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--color-border)] bg-black/15 px-2.5 py-2 font-mono text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                                    {revision.inhoud || "Geen inhoud"}
                                  </pre>
                                ) : (
                                  <p className="mt-2 line-clamp-2 break-words text-xs leading-relaxed text-[var(--color-text-muted)]">
                                    {revision.inhoud || "Geen inhoud"}
                                  </p>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedRevisionId(expanded ? null : revision.id)
                                  }
                                  aria-expanded={expanded}
                                  className="mt-1.5 flex min-h-[34px] items-center gap-1 rounded-lg px-1.5 text-xs font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                                >
                                  <ChevronDown
                                    size={13}
                                    className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                                  />
                                  {expanded ? "Inhoud verbergen" : "Volledige inhoud bekijken"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </PanelSection>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-2 sm:grid-cols-4 lg:grid-cols-2">
                <Metric label="Woorden" value={wordCount} />
                <Metric label="Regels" value={lineCount} />
                <Metric label="Acties" value={checklistStats.total ? `${checklistStats.done}/${checklistStats.total}` : "0"} />
                <Metric label="Versies" value={revisions.length} />
              </div>
            </aside>
          </div>
        </div>

        <footer className="relative z-10 shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:px-6">
          {saveError && (
            <p role="alert" className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {saveError}
            </p>
          )}
          {note && onToggleComplete && isDirty && (
            <p className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300 sm:hidden">
              Sla je wijzigingen eerst op om deze notitie af te ronden.
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className={`grid gap-2 sm:flex sm:w-auto ${note ? "grid-cols-3" : "grid-cols-2"}`}>
              {isDirty && (
                <button
                  type="button"
                  onClick={() => void handleResetChanges()}
                  disabled={actionBusy}
                  className={`flex min-h-[44px] min-w-0 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-3 text-sm font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-45 sm:col-auto ${
                    note ? "col-span-3" : "col-span-2"
                  }`}
                >
                  <RotateCcw size={16} />
                  <span className="truncate">Terugzetten</span>
                </button>
              )}
              {note && onDelete && (
                <button
                  type="button"
                  onClick={() => void handleDeleteClick()}
                  disabled={actionBusy}
                  className="flex min-h-[44px] min-w-0 items-center justify-center gap-2 rounded-xl border border-red-500/20 px-3 text-sm font-semibold text-red-400 transition-colors hover:border-red-500/35 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Trash2 size={16} />
                  <span className="truncate sm:hidden">{pendingAction === "delete" ? "..." : "Wissen"}</span>
                  <span className="hidden truncate sm:inline">{pendingAction === "delete" ? "Bezig..." : "Verwijderen"}</span>
                </button>
              )}
              {note && onArchive && (
                <button
                  type="button"
                  onClick={() => void handleArchiveClick()}
                  disabled={actionBusy}
                  className="flex min-h-[44px] min-w-0 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-3 text-sm font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Archive size={16} />
                  <span className="truncate sm:hidden">
                    {pendingAction === "archive" ? "..." : note.isArchived ? "Terug" : "Archief"}
                  </span>
                  <span className="hidden truncate sm:inline">
                    {pendingAction === "archive" ? "Bezig..." : note.isArchived ? "Dearchiveren" : "Archiveren"}
                  </span>
                </button>
              )}
              {note && onToggleComplete && (
                <button
                  type="button"
                  onClick={() => void handleCompleteClick()}
                  disabled={actionBusy || isDirty}
                  title={isDirty ? "Sla wijzigingen eerst op" : isCompleted ? "Heropenen" : "Afronden"}
                  className="flex min-h-[44px] min-w-0 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 px-3 text-sm font-semibold text-emerald-300 transition-colors hover:border-emerald-500/35 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <CheckCircle2 size={16} />
                  <span className="truncate sm:hidden">
                    {pendingAction === "complete" ? "..." : isCompleted ? "Open" : "Klaar"}
                  </span>
                  <span className="hidden truncate sm:inline">
                    {pendingAction === "complete" ? "Bezig..." : isCompleted ? "Heropenen" : "Afronden"}
                  </span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
              <button
                type="button"
                onClick={() => void handleCloseAttempt()}
                disabled={actionBusy}
                className="min-h-[44px] min-w-0 rounded-xl border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:opacity-50 sm:min-w-[112px]"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!canSave || actionBusy}
                className="min-h-[44px] min-w-0 rounded-xl bg-amber-500 px-4 text-sm font-bold text-[var(--color-primary-foreground)] transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-35 sm:min-w-[120px]"
              >
                {saving ? "Opslaan..." : note ? canSave ? "Opslaan" : "Opgeslagen" : "Aanmaken"}
              </button>
            </div>
          </div>
        </footer>
      </motion.div>
    </motion.div>
  );

  return typeof document === "undefined" ? editorModal : createPortal(editorModal, document.body);
}

function isFocusableElement(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    element.getBoundingClientRect().width > 0 &&
    element.getBoundingClientRect().height > 0
  );
}

function EventLinkPicker({
  groups,
  selectedEvent,
  selectedEventId,
  linkedEventExists,
  onChange,
}: {
  groups: EventOptionGroup[];
  selectedEvent?: PersonalEvent;
  selectedEventId: string;
  linkedEventExists: boolean;
  onChange: (eventId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const root = rootRef.current;
      if (root && event.target instanceof Node && !root.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      rootRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 40);
    return () => window.clearTimeout(timer);
  }, [open]);

  const filteredGroups = useMemo(() => {
    const defaultLimit = 6;
    const searchLimit = 12;

    return groups
      .map((group) => {
        const groupLimit = group.id === "history" && !normalizedQuery ? 4 : defaultLimit;
        const matches = normalizedQuery
          ? group.events.filter((event) => eventMatchesQuery(event, normalizedQuery))
          : group.events;
        return {
          ...group,
          events: matches.slice(0, normalizedQuery ? searchLimit : groupLimit),
          hiddenCount: Math.max(0, matches.length - (normalizedQuery ? searchLimit : groupLimit)),
        };
      })
      .filter((group) => group.events.length > 0);
  }, [groups, normalizedQuery]);

  const selectedLabel = selectedEvent
    ? `${formatDateRange(selectedEvent)} · ${getTimeLabel(selectedEvent)}`
    : selectedEventId && !linkedEventExists
      ? `Huidige koppeling ${shortEventId(selectedEventId)}`
      : "Geen afspraak gekoppeld";

  const clearSelection = () => {
    onChange("");
    setQuery("");
    setOpen(false);
  };

  const selectEvent = (eventId: string) => {
    onChange(eventId);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="space-y-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-haspopup="listbox"
          className="flex min-h-[54px] min-w-0 items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-left transition-colors hover:border-cyan-500/25 hover:bg-cyan-500/[0.04]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-200">
            <CalendarDays size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[var(--color-text)]">
              {selectedEvent?.titel ?? "Geen afspraak gekoppeld"}
            </span>
            <span className="mt-0.5 block truncate text-xs text-[var(--color-text-muted)]">
              {selectedLabel}
            </span>
          </span>
          <ChevronDown
            size={16}
            className={`shrink-0 text-[var(--color-text-subtle)] transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {selectedEventId && (
          <button
            type="button"
            onClick={clearSelection}
            className="flex min-h-[54px] min-w-[46px] items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-300"
            aria-label="Afspraak ontkoppelen"
            title="Afspraak ontkoppelen"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="overflow-hidden rounded-xl border border-cyan-500/15 bg-[var(--color-surface)] shadow-xl shadow-black/25"
          >
            <div className="border-b border-[var(--color-border)] p-2">
              <div className="flex min-h-[42px] items-center gap-2 rounded-lg border border-[var(--color-border)] bg-black/15 px-3">
                <Search size={14} className="shrink-0 text-[var(--color-text-subtle)]" />
                <input
                  type="search"
                  aria-label="Zoek een afspraak om te koppelen"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setOpen(false);
                    }
                  }}
                  placeholder="Zoek op titel, datum of kalender..."
                  className="min-w-0 flex-1 bg-transparent text-base text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)] sm:text-sm"
                  autoFocus
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                    aria-label="Zoekterm wissen"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[min(48dvh,360px)] overflow-y-auto p-2" role="listbox">
              <button
                type="button"
                onClick={clearSelection}
                className={`mb-2 flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold transition-colors ${
                  !selectedEventId
                    ? "bg-amber-500/15 text-amber-200"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                }`}
              >
                <X size={14} />
                Geen afspraak koppelen
              </button>

              {filteredGroups.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-5 text-center text-sm text-[var(--color-text-muted)]">
                  Geen afspraken gevonden.
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredGroups.map((group) => (
                    <div key={group.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 px-1">
                        <p className="text-[11px] font-bold uppercase text-[var(--color-text-subtle)]">
                          {group.label}
                        </p>
                        {group.hiddenCount > 0 && (
                          <span className="text-[10px] text-[var(--color-text-subtle)]">
                            +{group.hiddenCount} meer
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {group.events.map((event) => (
                          <EventOptionButton
                            key={event.eventId}
                            event={event}
                            active={selectedEventId === event.eventId}
                            onSelect={() => selectEvent(event.eventId)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedEventId && !linkedEventExists && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-3 py-2">
          <p className="text-xs font-semibold text-amber-200">Koppeling niet meer beschikbaar</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
            Deze notitie verwijst naar een afspraak of dienst die niet meer in de agenda staat. Bij opslaan wordt de koppeling opgeschoond.
          </p>
          <button
            type="button"
            onClick={clearSelection}
            className="mt-2 inline-flex h-8 items-center justify-center rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/15"
          >
            Nu ontkoppelen
          </button>
        </div>
      )}
    </div>
  );
}

function EventOptionButton({
  event,
  active,
  onSelect,
}: {
  event: PersonalEvent;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onSelect}
      className={`flex min-h-[54px] w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
        active
          ? "border-cyan-500/30 bg-cyan-500/12 text-cyan-100"
          : "border-transparent text-[var(--color-text)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]"
      }`}
    >
      <AppIcon name={resolveAppIconName(event.symbol, "agenda")} tone={active ? "cyan" : "slate"} size="sm" framed />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{event.titel}</span>
        <span className="mt-0.5 block truncate text-xs text-[var(--color-text-muted)]">
          {formatDateRange(event)} · {getTimeLabel(event)} · {event.kalender}
        </span>
      </span>
      {active && <Check size={15} className="shrink-0 text-cyan-200" />}
    </button>
  );
}

function eventMatchesQuery(event: PersonalEvent, query: string) {
  return normalizeEventSearchText(formatEventOption(event)).includes(query);
}

function normalizeEventSearchText(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  active = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg p-2 transition-colors ${
        active
          ? "bg-amber-500/15 text-amber-300"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
      }`}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      <Icon size={16} />
    </button>
  );
}

function PanelButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[42px] min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors ${
        active
          ? "bg-amber-500/15 text-amber-200"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
      }`}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      <Icon size={14} />
      <span className="truncate">{label}</span>
    </button>
  );
}

function PanelSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3">
      <div className="flex min-h-[34px] items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase text-[var(--color-text-subtle)]">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function QuickButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[38px] min-w-0 rounded-lg border border-[var(--color-border)] px-2 text-xs font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
    >
      <span className="truncate">{label}</span>
    </button>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg bg-black/10 px-2 py-2 text-center">
      <p className="truncate text-[10px] uppercase text-[var(--color-text-subtle)]">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-[var(--color-text)]">{value}</p>
    </div>
  );
}

function formatEventOption(event: PersonalEvent) {
  const source = event.kalender === "Rooster" ? "Dienst" : event.kalender;
  return `${formatDateRange(event)} - ${getTimeLabel(event)} - ${event.titel} (${source})`;
}

function buildEventOptionGroups(events: PersonalEvent[], selectedEventId?: string): EventOptionGroup[] {
  const unique = new Map<string, PersonalEvent>();
  for (const event of events) {
    if (!event.eventId || isDeletedEvent(event)) continue;
    unique.set(event.eventId, event);
  }

  const personal: PersonalEvent[] = [];
  const roster: PersonalEvent[] = [];
  const history: PersonalEvent[] = [];
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });

  for (const event of unique.values()) {
    const selected = Boolean(selectedEventId && event.eventId === selectedEventId);
    const past = isPastEventOption(event, today);
    if (!selected && isLowSignalEventOption(event)) continue;

    if (past && !selected) {
      history.push(event);
    } else if (event.kalender !== "Rooster") {
      personal.push(event);
    } else {
      roster.push(event);
    }
  }

  return [
    { id: "personal", label: "Eigen afspraken", events: personal.sort(compareEventOptions).slice(0, 80) },
    { id: "roster", label: "Diensten", events: roster.sort(compareEventOptions).slice(0, 80) },
    { id: "history", label: "Recent voorbij", events: history.sort(compareEventOptions).reverse().slice(0, 30) },
  ].filter((group) => group.events.length > 0);
}

function compareEventOptions(a: PersonalEvent, b: PersonalEvent) {
  return eventOptionSortKey(a).localeCompare(eventOptionSortKey(b)) || a.titel.localeCompare(b.titel, "nl");
}

function eventOptionSortKey(event: PersonalEvent) {
  return `${event.startDatum || "9999-12-31"}T${event.startTijd || "00:00"}`;
}

function isPastEventOption(event: PersonalEvent, todayIso: string) {
  if (event.status === "Voorbij") return true;
  const endDate = event.eindDatum || event.startDatum;
  return Boolean(endDate && endDate < todayIso);
}

function isLowSignalEventOption(event: PersonalEvent) {
  return /feestdagen/i.test(event.kalender);
}

function eventToDeadline(event: PersonalEvent) {
  if (!event.startDatum) return "";
  const time = event.startTijd || "09:00";
  const value = `${event.startDatum}T${time}`;
  return localDateTimeToIso(value);
}

function isDeletedEvent(event: PersonalEvent) {
  return event.status === "VERWIJDERD" || event.status === "cancelled" || event.status === "PendingDelete";
}

function shortEventId(eventId: string) {
  return eventId.length > 12 ? `${eventId.slice(0, 12)}...` : eventId;
}

function formatDeadlineForInput(value?: string | null): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T09:00`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) return value.slice(0, 16);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-") + `T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function localDateTimeToIso(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

/**
 * ISO-instant voor "vandaag + N dagen om HH:00" op de Europe/Amsterdam-kalender,
 * onafhankelijk van de device-tijdzone (deadline quick-buttons, low).
 */
function amsterdamQuickDeadlineIso(daysFromToday: number, hour: number): string {
  const todayAms = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  const base = new Date(`${todayAms}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + daysFromToday);
  const dateIso = base.toISOString().slice(0, 10);
  // Start met een UTC-gok en corrigeer op het uur dat Amsterdam werkelijk toont
  // (dekking voor CET/CEST; kantoor-uren 9/17 wrappen nooit over middernacht).
  const guess = new Date(`${dateIso}T${String(hour).padStart(2, "0")}:00:00Z`);
  const amsHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Amsterdam",
      hour: "2-digit",
      hour12: false,
    }).format(guess),
  );
  guess.setUTCHours(guess.getUTCHours() + (hour - amsHour));
  return guess.toISOString();
}

function normalizeDeadlineForSave(value: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    return localDateTimeToIso(value);
  }
  return value;
}

function getLinkSearchItems(results: unknown): LinkSearchItem[] {
  if (Array.isArray(results)) return results as LinkSearchItem[];
  if (!results || typeof results !== "object") return [];
  const data = (results as { data?: unknown }).data;
  return Array.isArray(data) ? data as LinkSearchItem[] : [];
}

function buildInitialSnapshot(
  note: NoteRecord | null | undefined,
  options: {
    initialDeadline?: string;
    initialLinkedEventId?: string;
    initialTags?: string[];
    initialTitle?: string;
    initialBusinessContext?: BusinessContextValue | null;
  },
): NoteEditorSnapshot {
  if (note) return snapshotFromNote(note);
  const initialContext = normalizeBusinessContext(options.initialBusinessContext);
  return normalizeEditorSnapshot({
    titel: options.initialTitle ?? "",
    inhoud: "",
    tags: options.initialTags ?? [],
    kleur: "",
    deadline: options.initialDeadline ?? "",
    linkedEventId: options.initialLinkedEventId ?? "",
    prioriteit: "normaal",
    symbol: "note",
    businessContextType: initialContext?.type ?? "",
    businessContextId: initialContext?.id ?? "",
    businessContextTitle: initialContext?.title ?? "",
  });
}

function snapshotFromNote(note: NoteRecord): NoteEditorSnapshot {
  const context = noteBusinessContext(note);
  return normalizeEditorSnapshot({
    titel: note.titel ?? "",
    inhoud: note.inhoud ?? "",
    tags: note.tags ?? [],
    kleur: note.kleur ?? "",
    deadline: note.deadline ?? "",
    linkedEventId: note.linkedEventId ?? note.linked_event_id ?? "",
    prioriteit: note.prioriteit ?? "normaal",
    symbol: resolveAppIconName(note.symbol, "note"),
    businessContextType: context?.type ?? "",
    businessContextId: context?.id ?? "",
    businessContextTitle: context?.title ?? "",
  });
}

function sameEditorSnapshot(a: NoteEditorSnapshot, b: NoteEditorSnapshot) {
  return (
    a.titel === b.titel &&
    a.inhoud === b.inhoud &&
    tagsKey(a.tags) === tagsKey(b.tags) &&
    a.kleur === b.kleur &&
    a.deadline === b.deadline &&
    a.linkedEventId === b.linkedEventId &&
    a.prioriteit === b.prioriteit &&
    a.symbol === b.symbol &&
    a.businessContextType === b.businessContextType &&
    a.businessContextId === b.businessContextId &&
    a.businessContextTitle === b.businessContextTitle
  );
}

function tagsKey(values?: string[]) {
  return normalizeTags(values ?? []).join(",");
}

function normalizeEditorSnapshot(snapshot: NoteEditorSnapshot): NoteEditorSnapshot {
  return {
    titel: snapshot.titel.trim(),
    inhoud: snapshot.inhoud.trimEnd(),
    tags: normalizeTags(snapshot.tags),
    kleur: snapshot.kleur,
    deadline: snapshot.deadline,
    linkedEventId: snapshot.linkedEventId,
    prioriteit: snapshot.prioriteit || "normaal",
    symbol: snapshot.symbol,
    businessContextType: snapshot.businessContextType,
    businessContextId: snapshot.businessContextId,
    businessContextTitle: snapshot.businessContextTitle,
  };
}

function noteBusinessContext(note?: NoteRecord | null): BusinessContextValue | null {
  return normalizeBusinessContext({
    type: note?.businessContextType ?? note?.business_context_type,
    id: note?.businessContextId ?? note?.business_context_id,
    title: note?.businessContextTitle ?? note?.business_context_title,
  });
}

function normalizeTags(values: string[]) {
  return [...new Set(values.map(cleanTag).filter(Boolean))].sort();
}

function cleanTag(value: string) {
  return value.trim().replace(/^#+/, "").replace(/\s+/g, "-").toLowerCase();
}

function getChecklistStats(value: string) {
  const matches = value.match(/^- \[[ xX]\] /gm) ?? [];
  const done = matches.filter((match) => /^- \[[xX]\] /.test(match)).length;
  return { total: matches.length, done };
}

function firstContentLine(value?: string | null) {
  return (value ?? "").split("\n").map((line) => line.trim()).find(Boolean) ?? "";
}

function formatDutchDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
