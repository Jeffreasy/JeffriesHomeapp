"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, Archive, CalendarClock, CheckCircle2, Inbox, Link2, NotebookPen, Pin, Plus, Sparkles } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { NoteCard, type NoteBacklink } from "./NoteCard";
import { SectionTitle } from "./NotesPrimitives";
import type { NoteRecord } from "@/hooks/useNotes";
import type { BoardMode, ViewMode, SortMode, NoteScope, Tone } from "./NotesUtils";
import { getDeadlineState, isAttentionNote, SCOPE_OPTIONS, SORT_OPTIONS, VIEW_OPTIONS, toneClasses } from "./NotesUtils";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { surfaceVariants } from "@/components/ui/Surface";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
export function NotesList({
  displayed,
  isLoading,
  isError,
  onRetry,
  viewMode,
  boardMode,
  sortMode,
  search,
  tagFilter,
  noteScope,
  privacyOn,
  handleNew,
  clearFilters,
  handleEdit,
  togglePin,
  toggleComplete,
  archive,
  handleDelete,
  handleUpdateContent,
  handleNavigateToNote,
  eventLabelById,
  backlinksById,
}: {
  displayed: NoteRecord[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  viewMode: ViewMode;
  boardMode: BoardMode;
  sortMode: SortMode;
  search: string;
  tagFilter: string | null;
  noteScope: NoteScope;
  privacyOn: boolean;
  handleNew: () => void;
  clearFilters: () => void;
  handleEdit: (note: NoteRecord) => void;
  togglePin: (id: string) => void | Promise<void>;
  toggleComplete: (id: string) => void | Promise<void>;
  archive: (id: string) => void | Promise<void>;
  handleDelete: (id: string) => void | Promise<void>;
  handleUpdateContent: (id: string, inhoud: string, expectedGewijzigd?: string) => void | Promise<void>;

  handleNavigateToNote: (title: string) => void;
  eventLabelById?: Map<string, string>;
  backlinksById?: Map<string, NoteBacklink[]>;
}) {
  // Minute-tick (low): deadline-chips ("Vandaag"/"Verlopen") en boardgroepen
  // zijn dagafhankelijk — één re-render per minuut laat ze om middernacht
  // doorrollen zonder interactie.
  const [, setMinuteTick] = useState(0);
  useEffect(() => {
    const interval = window.setInterval(() => setMinuteTick((tick) => tick + 1), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const activeSort = SORT_OPTIONS.find((option) => option.id === sortMode) ?? SORT_OPTIONS[0];
  const boardGroups = buildBoardGroups(displayed, viewMode, noteScope);
  const mobileBoardGroups = boardGroups.filter((group) => group.notes.length > 0);
  // K7: popLayout exit-animaties worden merkbaar traag op grote lijsten —
  // boven ~60 zichtbare kaarten renderen we zonder AnimatePresence. (Volledige
  // lijst-virtualisatie blijft een open punt.)
  const animateCards = displayed.length <= 60;

  return (
    <section className="min-w-0 space-y-4">
      <div className={`${surfaceVariants({ padding: "none" })} p-3 sm:p-4`}>
        <SectionTitle
          icon={NotebookPen}
          title={viewMode === "active" ? "Notitie-board" : viewMode === "completed" ? "Afgeronde notities" : "Archief"}
          subtitle={
            isLoading
              ? "Laden…"
              : `${displayed.length} zichtbaar · ${boardMode === "board" ? "board · gegroepeerd" : `grid · ${activeSort.label.toLowerCase()}`}`
          }
          action={
            <Button
              variant="primary"
              onClick={handleNew}
              className="w-full sm:w-auto"
            >
              <Plus size={16} />
              Nieuwe notitie
            </Button>
          }
        />
      </div>

      {isError ? (
        <FeedbackState
          tone="error"
          icon={AlertTriangle}
          title="Notities konden niet geladen worden"
          description="Controleer je verbinding en probeer het opnieuw."
          actionLabel={onRetry ? "Opnieuw proberen" : undefined}
          onAction={onRetry}
        />
      ) : isLoading ? (
        <FeedbackState
          tone="loading"
          title="Notities laden"
          description="Je notitie-board wordt bijgewerkt."
        />
      ) : displayed.length === 0 ? (
        (() => {
          // Branch the empty state on the engaged view + scope + filters so the
          // message and CTA match the real reason the list is empty (not a blanket
          // "Nog geen notities" while the user has plenty in another view/filter).
          const hasNarrowing = Boolean(search || tagFilter || noteScope !== "all");
          const scopeLabel = SCOPE_OPTIONS.find((option) => option.id === noteScope)?.label;
          const viewLabel = VIEW_OPTIONS.find((option) => option.id === viewMode)?.label?.toLowerCase();
          let title: string;
          let subtitle: string;
          if (hasNarrowing) {
            title = "Geen notities gevonden";
            subtitle =
              noteScope !== "all" && !search && !tagFilter
                ? `Geen notities in "${scopeLabel}" binnen ${viewLabel}.`
                : "Pas je zoekterm, tag of scope aan om meer notities te zien.";
          } else if (viewMode === "archived") {
            title = "Archief is leeg";
            subtitle = "Gearchiveerde notities bewaar je hier, buiten je actieve lijst.";
          } else if (viewMode === "completed") {
            title = "Nog niets afgerond";
            subtitle = "Afgevinkte notities verschijnen hier — vindbaar, maar uit de weg.";
          } else {
            title = "Nog geen notities";
            subtitle = "Maak je eerste notitie en leg losse gedachten meteen vast.";
          }
          return (
            <FeedbackState
              icon={Sparkles}
              title={title}
              description={subtitle}
              actionLabel={hasNarrowing ? "Filters wissen" : viewMode === "active" ? "Eerste notitie maken" : undefined}
              onAction={hasNarrowing ? clearFilters : viewMode === "active" ? handleNew : undefined}
            />
          );
        })()
      ) : boardMode === "board" ? (
        <>
          <div className="space-y-3 md:hidden">
            {mobileBoardGroups.map((group) => (
              <section
                key={group.id}
                className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3"
              >
                <BoardGroupHeader group={group} />
                <div className="mt-3 space-y-2.5">
                  <CardsPresence animate={animateCards}>
                    {group.notes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        density="compact"
                        onEdit={handleEdit}
                        onTogglePin={togglePin}
                        onToggleComplete={toggleComplete}
                        onArchive={archive}
                        onDelete={handleDelete}
                        onUpdateContent={handleUpdateContent}
                        onNavigateToNote={handleNavigateToNote}
                        linkedEventLabel={getLinkedEventLabel(note, eventLabelById)}
                        backlinks={backlinksById?.get(note.id)}
                        masked={privacyOn}
                      />
                    ))}
                  </CardsPresence>
                </div>
              </section>
            ))}
          </div>

          <div className="hidden grid-cols-1 gap-3 md:grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {boardGroups.map((group) => (
              <section
                key={group.id}
                className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3"
              >
                <BoardGroupHeader group={group} />

                <div className="mt-3 space-y-3">
                  <CardsPresence animate={animateCards}>
                    {group.notes.length > 0 ? (
                      group.notes.map((note) => (
                        <NoteCard
                          key={note.id}
                          note={note}
                          density="compact"
                          onEdit={handleEdit}
                          onTogglePin={togglePin}
                          onToggleComplete={toggleComplete}
                          onArchive={archive}
                          onDelete={handleDelete}
                          onUpdateContent={handleUpdateContent}
                          onNavigateToNote={handleNavigateToNote}
                          linkedEventLabel={getLinkedEventLabel(note, eventLabelById)}
                          backlinks={backlinksById?.get(note.id)}
                          masked={privacyOn}
                        />
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-6 text-center text-xs text-[var(--color-text-subtle)]">
                        Geen notities in deze kolom.
                      </div>
                    )}
                  </CardsPresence>
                </div>
              </section>
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <CardsPresence animate={animateCards}>
            {displayed.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={handleEdit}
                onTogglePin={togglePin}
                onToggleComplete={toggleComplete}
                onArchive={archive}
                onDelete={handleDelete}
                onUpdateContent={handleUpdateContent}
                onNavigateToNote={handleNavigateToNote}
                linkedEventLabel={getLinkedEventLabel(note, eventLabelById)}
                backlinks={backlinksById?.get(note.id)}
                masked={privacyOn}
              />
            ))}
          </CardsPresence>
        </div>
      )}
    </section>
  );
}

// K7: boven ~60 kaarten de popLayout exit-animaties overslaan.
function CardsPresence({ animate, children }: { animate: boolean; children: ReactNode }) {
  if (!animate) return <>{children}</>;
  return <AnimatePresence mode="popLayout">{children}</AnimatePresence>;
}

function BoardGroupHeader({ group }: { group: BoardGroup }) {
  const toneClass = toneClasses[group.tone];
  return (
    <div className="flex min-h-[38px] items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", toneClass.surface)}>
          <group.icon size={15} className={toneClass.icon} />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-[var(--color-text)]">{group.title}</h3>
          <p className="truncate text-xs text-[var(--color-text-muted)]">{group.subtitle}</p>
        </div>
      </div>
      <Badge tone="neutral" size="sm" className="tabular-nums">
        {group.notes.length}
      </Badge>
    </div>
  );
}

function getLinkedEventLabel(note: NoteRecord, eventLabelById?: Map<string, string>) {
  const linkedId = note.linkedEventId ?? note.linked_event_id;
  return linkedId ? eventLabelById?.get(linkedId) : undefined;
}

type BoardGroup = {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tone: Tone;
  notes: NoteRecord[];
};

function buildBoardGroups(notes: NoteRecord[], viewMode: ViewMode, noteScope: NoteScope = "all"): BoardGroup[] {
  // When a scope filter is active, re-bucketing by the exclusive priority chain
  // would contradict the filter (a pinned-with-deadline note matching scope
  // "Deadlines" still lands in "Vastgezet"). Show one coherent column instead so
  // the board and the scope chip never disagree.
  if (viewMode === "active" && noteScope !== "all") {
    const option = SCOPE_OPTIONS.find((scope) => scope.id === noteScope);
    return [{
      id: noteScope,
      title: option?.label ?? "Resultaten",
      subtitle: "Gefilterd op scope",
      icon: option?.icon ?? Inbox,
      tone: "accent",
      notes,
    }];
  }

  if (viewMode === "archived") {
    return [{
      id: "archive",
      title: "Archief",
      subtitle: "Bewaard buiten actief",
      icon: Archive,
      tone: "neutral",
      notes,
    }];
  }

  if (viewMode === "completed") {
    return [{
      id: "completed",
      title: "Afgerond",
      subtitle: "Klaar, maar vindbaar",
      icon: CheckCircle2,
      tone: "success",
      notes,
    }];
  }

  const groups: BoardGroup[] = [
    {
      id: "pinned",
      title: "Vastgezet",
      subtitle: "Blijft bovenaan",
      icon: Pin,
      tone: "accent",
      notes: [],
    },
    {
      id: "attention",
      title: "Aandacht",
      subtitle: "Hoog, vandaag of verlopen",
      icon: AlertTriangle,
      tone: "danger",
      notes: [],
    },
    {
      id: "planned",
      title: "Gepland",
      subtitle: "Met deadline",
      icon: CalendarClock,
      tone: "info",
      notes: [],
    },
    {
      id: "linked",
      title: "Agenda",
      subtitle: "Gekoppelde afspraken",
      icon: Link2,
      tone: "info",
      notes: [],
    },
    {
      id: "other",
      title: "Overig",
      subtitle: "Vrije notities",
      icon: Inbox,
      tone: "neutral",
      notes: [],
    },
  ];

  const byId = new Map(groups.map((group) => [group.id, group]));
  for (const note of notes) {
    if (note.isPinned || note.is_pinned) {
      byId.get("pinned")?.notes.push(note);
    } else if (isAttentionNote(note)) {
      byId.get("attention")?.notes.push(note);
    } else if (getDeadlineState(note.deadline).hasDeadline) {
      byId.get("planned")?.notes.push(note);
    } else if (note.linkedEventId || note.linked_event_id) {
      byId.get("linked")?.notes.push(note);
    } else {
      byId.get("other")?.notes.push(note);
    }
  }

  return groups;
}
