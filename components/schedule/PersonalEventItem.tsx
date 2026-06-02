"use client";

import { useState } from "react";
import { personalEventsApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, CalendarDays, AlertTriangle, Trash2, Loader2, X, Check, Pencil } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { type ConflictInfo } from "@/lib/conflictDetection";
import {
  type PersonalEvent,
  formatDateRange,
  getTimeLabel,
  isMultiDay,
} from "@/hooks/usePersonalEvents";

interface PersonalEventItemProps {
  event:        PersonalEvent;
  isToday?:     boolean;
  onEdit?:      (event: PersonalEvent) => void;
  onRefetch?:   () => void;
  conflictInfo?: ConflictInfo;
}

export function PersonalEventItem({ event, isToday, onEdit, onRefetch, conflictInfo }: PersonalEventItemProps) {
  const hasConflict = !!conflictInfo;
  const multiDay    = isMultiDay(event);

  const { success, error } = useToast();
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
      await personalEventsApi.updateStatus(event.userId, event.eventId, "cancelled");
      success("Afspraak verwijderd");
      onRefetch?.();
    } catch (e: any) {
      error(`Mislukt: ${e.message}`);
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
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
      : "border-l-transparent";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={`
        group relative flex items-center gap-3 px-3 py-2.5 rounded-lg
        border-l-2 ${borderLeft}
        hover:bg-white/[0.04] transition-colors cursor-default
      `}
    >
      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Title + Time row */}
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-[13px] font-semibold text-slate-200 truncate">{event.titel}</p>
          <span className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
            <Clock size={10} className="text-slate-600" />
            {getTimeLabel(event)}
          </span>
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
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
              <button onClick={handleDelete} className="p-0.5 hover:bg-red-500/20 rounded text-red-500 cursor-pointer">
                <Check size={12} />
              </button>
              <button onClick={() => setConfirmDelete(false)} className="p-0.5 hover:bg-slate-700/50 rounded text-slate-400 cursor-pointer">
                <X size={12} />
              </button>
            </motion.div>
          ) : (
            <>
              {onEdit && (
                <button
                  onClick={() => onEdit(event)}
                  className="p-1.5 hover:bg-white/[0.06] rounded-md text-slate-600 hover:text-indigo-400 transition-colors cursor-pointer"
                  title="Wijzigen"
                >
                  <Pencil size={13} />
                </button>
              )}
              <button
                onClick={handleDelete}
                className="p-1.5 hover:bg-red-500/10 rounded-md text-slate-600 hover:text-red-400 transition-colors cursor-pointer"
                title="Verwijderen"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Today indicator */}
      {isToday && !hasConflict && (
        <span className="absolute right-2 bottom-1 text-[8px] font-bold uppercase tracking-wider text-emerald-500/50">
          nu
        </span>
      )}
    </motion.div>
  );
}
