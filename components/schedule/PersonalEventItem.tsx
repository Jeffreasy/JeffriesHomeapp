"use client";

import { useState } from "react";
import { personalEventsApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, CalendarDays, AlertTriangle, Trash2, Loader2, X, Check, Pencil } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { type ConflictInfo } from "@/lib/conflictDetection";
import { AppIcon } from "@/components/ui/AppIcon";
import { resolveAppIconName } from "@/lib/symbols";
import {
  type PersonalEvent,
  formatDateRange,
  getTimeLabel,
  isMultiDay,
} from "@/hooks/usePersonalEvents";
import { shiftTypeColor } from "@/lib/schedule";

interface PersonalEventItemProps {
  event:        PersonalEvent;
  isToday?:     boolean;
  onEdit?:      (event: PersonalEvent) => void;
  onRefetch?:   () => void | Promise<void>;
  conflictInfo?: ConflictInfo;
}

function statusBadge(event: PersonalEvent) {
  if (event.status === "PendingCreate") return { label: "Nieuw", className: "bg-sky-500/10 text-sky-300 border-sky-500/20" };
  if (event.status === "PendingUpdate") return { label: "Wijziging", className: "bg-violet-500/10 text-violet-300 border-violet-500/20" };
  if (event.status === "PendingDelete") return { label: "Verwijderen", className: "bg-red-500/10 text-red-300 border-red-500/20" };
  if (event.status === "Voorbij") return { label: "Voorbij", className: "bg-slate-500/10 text-slate-500 border-slate-500/15" };
  if (event.kalender === "Rooster") return { label: "Dienst", className: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" };
  return null;
}

export function PersonalEventItem({ event, isToday, onEdit, onRefetch, conflictInfo }: PersonalEventItemProps) {
  const hasConflict = !!conflictInfo;
  const multiDay    = isMultiDay(event);
  const isRooster   = event.kalender === "Rooster";
  const isPendingDelete = event.status === "PendingDelete";
  const canEdit = Boolean(onEdit && !isRooster && !isPendingDelete);
  const badge = statusBadge(event);
  const shiftColors = isRooster && event.shiftType ? shiftTypeColor(event.shiftType) : null;
  const symbol = resolveAppIconName(event.symbol, isRooster ? "roster" : "agenda");

  const { success, error, toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }

    setIsDeleting(true);
    try {
      const nextStatus = event.status === "PendingCreate" ? "VERWIJDERD" : "PendingDelete";
      const result = await personalEventsApi.updateStatus(event.userId, event.eventId, nextStatus);
      if (result.instantSync || nextStatus === "VERWIJDERD") {
        success(nextStatus === "PendingDelete" ? "Afspraak direct verwijderd uit Google Calendar" : "Afspraak verwijderd");
      } else {
        toast(result.syncError
          ? "Afspraak gemarkeerd; verwijderen blijft in de wachtrij."
          : "Verwijderen staat in de Google Calendar wachtrij.",
        "info");
      }
      await onRefetch?.();
    } catch (e) {
      error(`Mislukt: ${e instanceof Error ? e.message : "onbekende fout"}`);
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    if (canEdit) onEdit?.(event);
  };

  // Conflict border color
  const borderLeft = hasConflict
    ? conflictInfo.level === "hard"
      ? "border-l-red-500/60"
      : conflictInfo.level === "soft"
        ? "border-l-amber-500/60"
        : "border-l-sky-500/40"
    : isToday
      ? "border-l-emerald-500/40"
      : isRooster
        ? shiftColors
          ? ""
          : "border-l-slate-600/40"
        : "border-l-transparent";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      onClick={handleEdit}
      className={`
        group relative flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent
        border-l-2 ${borderLeft}
        ${isPendingDelete ? "opacity-70" : ""}
        ${canEdit ? "hover:bg-white/[0.04] cursor-pointer" : "cursor-default"}
        transition-colors
      `}
      style={
        !hasConflict && !isToday && shiftColors
          ? { borderLeftColor: shiftColors.accent }
          : undefined
      }
    >
      <AppIcon
        name={symbol}
        tone={hasConflict ? "amber" : isRooster ? "indigo" : "cyan"}
        size="sm"
        framed
        active={isToday}
        className="h-8 w-8 rounded-lg"
      />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Title + Time row */}
        <div className="flex items-center gap-2 min-w-0">
          {isRooster && event.team && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded border bg-indigo-500/10 text-indigo-300 border-indigo-500/20 shrink-0 uppercase tracking-wider">
              {event.team}
            </span>
          )}
          <p className="text-[13px] font-semibold text-slate-200 truncate">{event.titel}</p>
          <span className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
            <Clock size={10} className="text-slate-600" />
            {getTimeLabel(event)}
          </span>
          {badge && (
            <span className={`hidden sm:inline-flex shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badge.className}`}>
              {badge.label}
            </span>
          )}
          {isRooster && event.shiftType && (
            <span
              className="text-[9px] font-black px-1.5 py-0.5 rounded border shrink-0 uppercase tracking-widest"
              style={{
                background: shiftColors ? shiftColors.accent + "15" : "rgba(255,255,255,0.05)",
                color: shiftColors ? shiftColors.accent : "#94a3b8",
                borderColor: shiftColors ? shiftColors.accent + "30" : "rgba(255,255,255,0.1)",
              }}
            >
              {event.shiftType}
            </span>
          )}
        </div>

        {/* Meta row — location, multi-day, conflict */}
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {multiDay && (
            <span className="flex items-center gap-1 text-[10px] text-slate-600">
              <CalendarDays size={9} />
              {formatDateRange(event)}
            </span>
          )}

          {event.locatie && (
            <span className="flex items-center gap-1 text-[10px] text-slate-500 truncate max-w-[160px]">
              <MapPin size={9} className="shrink-0" />
              {event.locatie}
            </span>
          )}

          {badge && (
            <span className={`inline-flex sm:hidden rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badge.className}`}>
              {badge.label}
            </span>
          )}

          {conflictInfo && (
            <span className={`flex items-center gap-1 text-[10px] font-medium ${
              conflictInfo.level === "hard" ? "text-red-400"
              : conflictInfo.level === "soft" ? "text-amber-400"
              : "text-sky-400"
            }`}>
              <AlertTriangle size={9} />
              {conflictInfo.message}
            </span>
          )}
        </div>
      </div>

      {/* Actions — visible on hover */}
      {!isRooster && (
        <div className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <AnimatePresence mode="wait">
            {isDeleting ? (
              <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Loader2 size={14} className="animate-spin text-slate-500" />
              </motion.div>
            ) : confirmDelete ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-0.5 bg-red-950/50 border border-red-500/20 rounded-md px-1.5 py-0.5"
              >
                <span className="text-[10px] text-red-400 font-medium mr-0.5">Zeker?</span>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="p-0.5 hover:bg-red-500/20 rounded text-red-500 cursor-pointer">
                  <Check size={12} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }} className="p-0.5 hover:bg-slate-700/50 rounded text-slate-400 cursor-pointer">
                  <X size={12} />
                </button>
              </motion.div>
            ) : (
              <>
                {onEdit && !isPendingDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(event); }}
                    className="p-1.5 hover:bg-white/[0.06] rounded-md text-slate-600 hover:text-indigo-400 transition-colors cursor-pointer"
                    title="Wijzigen"
                  >
                    <Pencil size={13} />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                  className="p-1.5 hover:bg-red-500/10 rounded-md text-slate-600 hover:text-red-400 transition-colors cursor-pointer"
                  title="Verwijderen"
                >
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </AnimatePresence>
        </div>
      )}

      {isToday && !hasConflict && !isRooster && (
        <span className="absolute right-2 bottom-1 hidden text-[8px] font-bold uppercase tracking-wider text-emerald-500/50 sm:inline">
          vandaag
        </span>
      )}
    </motion.div>
  );
}
