"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { personalEventsApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, CalendarDays, AlertTriangle, Trash2, Loader2, X, Check, Pencil } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { type ConflictInfo } from "@/lib/conflictDetection";
import { AppIcon } from "@/components/ui/AppIcon";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/Badge";
import { resolveAppIconName } from "@/lib/symbols";
import { cn } from "@/lib/utils";
import { uiMotion } from "@/lib/ui/motion";
import {
  applyEventStatusToCache,
  type PersonalEvent,
  formatDateRange,
  getTimeLabel,
  isMultiDay,
} from "@/hooks/usePersonalEvents";
import {
  conflictPresentation,
  scheduleToneVars,
  shiftPresentation,
  statusPresentation,
  teamPresentation,
  tonePresentation,
} from "./schedulePresentation";

interface PersonalEventItemProps {
  event:        PersonalEvent;
  isToday?:     boolean;
  onEdit?:      (event: PersonalEvent) => void;
  onRefetch?:   () => void | Promise<void>;
  conflictInfo?: ConflictInfo;
  compact?:     boolean;
}

function statusBadge(event: PersonalEvent) {
  const label =
    event.status === "PendingCreate" ? "Nieuw"
    : event.status === "PendingUpdate" ? "Wijziging"
    : event.status === "PendingDelete" ? "Verwijderen"
    : event.status === "Bezig" ? "Bezig"
    : event.status === "Voorbij" ? "Voorbij"
    : event.kalender === "Rooster" ? "Dienst"
    : null;
  if (!label) return null;
  return {
    label,
    presentation: statusPresentation(event.kalender === "Rooster" ? "Rooster" : event.status),
  };
}

export function PersonalEventItem({ event, isToday, onEdit, onRefetch, conflictInfo, compact = false }: PersonalEventItemProps) {
  const hasConflict = !!conflictInfo;
  const multiDay    = isMultiDay(event);
  const isRooster   = event.kalender === "Rooster";
  const isPendingDelete = event.status === "PendingDelete";
  const canEdit = Boolean(onEdit && !isRooster && !isPendingDelete);
  const keyboardEditable = canEdit && compact;
  const badge = statusBadge(event);
  const shiftColors = isRooster && event.shiftType ? shiftPresentation(event.shiftType) : null;
  const team = isRooster && event.team ? teamPresentation(event.team) : null;
  const conflictTone = conflictInfo ? conflictPresentation(conflictInfo.level) : tonePresentation("neutral");
  const accent = conflictInfo
    ? conflictTone
    : isToday
      ? tonePresentation("accent")
      : shiftColors ?? tonePresentation("neutral");
  const symbol = resolveAppIconName(event.symbol, isRooster ? "roster" : "agenda");

  const { success, error, toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 6000);
      return;
    }

    setIsDeleting(true);
    // Optimistic: de rij verdwijnt direct uit de lijst; bij een fout wordt de
    // cache-snapshot teruggezet (audit M16).
    const nextStatus = event.status === "PendingCreate" ? "VERWIJDERD" : "PendingDelete";
    const rollback = applyEventStatusToCache(queryClient, event.userId, event.eventId, nextStatus);
    try {
      const result = await personalEventsApi.updateStatus(event.userId, event.eventId, nextStatus);
      if (result.instantSync || nextStatus === "VERWIJDERD") {
        success(nextStatus === "PendingDelete" ? "Afspraak direct verwijderd uit Google Calendar" : "Afspraak verwijderd");
      } else if (result.permanent) {
        error("Kan niet worden verwijderd via Google (vermoedelijk een automatisch Google-event, zoals een verjaardag). Pas dit aan in Google Agenda/Contacten zelf.");
      } else {
        toast(result.syncError
          ? "Afspraak gemarkeerd; verwijderen blijft in de wachtrij."
          : "Verwijderen staat in de Google Calendar wachtrij.",
        "info");
      }
      await onRefetch?.();
    } catch (e) {
      rollback();
      error(`Mislukt: ${e instanceof Error ? e.message : "onbekende fout"}`);
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    if (canEdit) onEdit?.(event);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: uiMotion.durationSeconds.fast }}
      onClick={handleEdit}
      onKeyDown={(event) => {
        if (!keyboardEditable || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        handleEdit();
      }}
      role={keyboardEditable ? "button" : undefined}
      tabIndex={keyboardEditable ? 0 : undefined}
      className={cn(
        "group relative flex items-start rounded-xl border border-l-2 border-[var(--color-border)] border-l-[var(--schedule-accent)] bg-[var(--color-surface-muted)] transition-[background-color,border-color,opacity] duration-[var(--motion-fast)] ease-[var(--ease-standard)]",
        compact ? "gap-2 px-2.5 py-2.5" : "gap-3 px-3 py-3",
        isPendingDelete && "opacity-70",
        canEdit ? "cursor-pointer hover:bg-[var(--color-surface-hover)]" : "cursor-default",
      )}
      style={scheduleToneVars(accent.tone)}
    >
      <AppIcon
        name={symbol}
        tone={hasConflict ? conflictTone.tone : isToday ? "accent" : "info"}
        size="sm"
        framed
        active={isToday}
        className={`${compact ? "h-8 w-8" : "h-9 w-9"} mt-0.5 rounded-lg`}
      />

      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Title + Time row */}
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {isRooster && event.team && team && (
            <Badge tone={team.tone} size="sm" className="shrink-0 uppercase tracking-wider">
              {event.team}
            </Badge>
          )}
          <p className={`min-w-0 flex-1 break-words font-semibold text-[var(--color-text)] sm:truncate ${compact ? "text-xs leading-4" : "text-[13px] leading-5"}`}>
            {event.titel}
          </p>
          {badge && (
            <Badge tone={badge.presentation.tone} size="sm" className="hidden shrink-0 uppercase tracking-wider sm:inline-flex">
              {badge.label}
            </Badge>
          )}
          {isRooster && event.shiftType && shiftColors && (
            <Badge tone={shiftColors.tone} size="sm" className="shrink-0 uppercase tracking-widest">
              {event.shiftType}
            </Badge>
          )}
        </div>

        {/* Meta row — location, multi-day, conflict */}
        <div className={`mt-1 flex flex-wrap items-center ${compact ? "gap-x-2 gap-y-1" : "gap-2"}`}>
          <span className="flex items-center gap-1 text-micro text-[var(--color-text-muted)]">
            <Clock size={9} className="text-[var(--color-text-subtle)]" />
            {getTimeLabel(event)}
          </span>

          <span className="flex items-center gap-1 text-micro text-[var(--color-text-subtle)]">
            <CalendarDays size={9} />
            {formatDateRange(event)}
          </span>

          {multiDay && (
            <span className="flex items-center gap-1 text-micro text-[var(--color-text-subtle)]">
              <CalendarDays size={9} />
              meerdaags
            </span>
          )}

          {event.locatie && (
            <span className="flex min-w-0 max-w-full items-center gap-1 truncate text-micro text-[var(--color-text-muted)] sm:max-w-[220px]">
              <MapPin size={9} className="shrink-0" />
              {event.locatie}
            </span>
          )}

          {badge && (
            <Badge tone={badge.presentation.tone} size="sm" className="uppercase tracking-wider sm:hidden">
              {badge.label}
            </Badge>
          )}

          {conflictInfo && (
            <span className={cn("flex items-center gap-1 text-micro font-medium", conflictTone.text)}>
              <AlertTriangle size={9} />
              {conflictInfo.message}
            </span>
          )}
        </div>
      </div>

      {/* Actions — altijd op touch, hover-reveal op desktop. Ook in compact
          modus (mobiele weeklijst) zichtbaar zodat verwijderen/wijzigen daar
          niet onbereikbaar is (audit K13). group-focus-within houdt de knoppen
          zichtbaar zodra ze per toetsenbord gefocust zijn (audit F4). */}
      {!isRooster && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <AnimatePresence mode="wait">
            {isDeleting ? (
              <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Loader2 size={14} className="animate-spin text-[var(--color-text-muted)] motion-reduce:animate-none" />
              </motion.div>
            ) : confirmDelete ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-0.5 bg-[var(--color-danger-subtle)] border border-[var(--color-danger-border)] rounded-md px-1.5 py-0.5"
              >
                <span className="text-micro text-[var(--color-danger)] font-medium mr-0.5">Verwijderen?</span>
                <IconButton
                  label="Verwijderen bevestigen"
                  variant="danger"
                  icon={<Check size={14} />}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete();
                  }}
                />
                <IconButton
                  label="Verwijderen annuleren"
                  variant="secondary"
                  icon={<X size={14} />}
                  onClick={(event) => {
                    event.stopPropagation();
                    setConfirmDelete(false);
                  }}
                />
              </motion.div>
            ) : (
              <>
                {onEdit && !isPendingDelete && (
                  <IconButton
                    label="Afspraak wijzigen"
                    title="Wijzigen"
                    icon={<Pencil size={13} />}
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      onEdit(event);
                    }}
                    className="hover:text-[var(--color-info)]"
                  />
                )}
                <IconButton
                  label="Afspraak verwijderen"
                  title="Verwijderen"
                  variant="danger"
                  icon={<Trash2 size={13} />}
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    handleDelete();
                  }}
                />
              </>
            )}
          </AnimatePresence>
        </div>
      )}

      {isToday && !hasConflict && !isRooster && (
        <span className="absolute right-2 bottom-1 hidden text-micro font-bold uppercase tracking-wider text-[var(--color-primary-hover)] sm:inline">
          vandaag
        </span>
      )}
    </motion.div>
  );
}
