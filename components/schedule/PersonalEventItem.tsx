"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, CalendarDays, AlertTriangle, Info, Trash2, Loader2, X, Check, Pencil } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/convex/_generated/api";
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
  conflictInfo?: ConflictInfo;
}

export function PersonalEventItem({ event, isToday, onEdit, conflictInfo }: PersonalEventItemProps) {
  const hasConflict = !!conflictInfo;
  const multiDay    = isMultiDay(event);

  // Relatieve datum helper
  const getRelativeTag = (): string | null => {
    const today  = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(event.startDatum + "T00:00:00"); target.setHours(0, 0, 0, 0);
    const diff   = Math.round((target.getTime() - today.getTime()) / 86_400_000);
    if (diff === 0) return null; // isToday badge handles this
    if (diff === 1) return "morgen";
    if (diff === 2) return "overmrgn";
    if (diff > 2 && diff <= 7) return `${diff}d`;
    return null;
  };
  const relTag = getRelativeTag();

  const { success, error } = useToast();
  const deleteAction = useAction(api.actions.deletePersonalEvent.deleteEvent);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      // Reset de confirm na 3 sec
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteAction({ userId: event.userId, eventId: event.eventId });
      if (res.ok) {
        success("Afspraak verwijderd");
      } else {
        error(`Fout bij verwijderen: ${res.message}`);
      }
    } catch (e: any) {
      error(`Mislukt: ${e.message}`);
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all"
      style={
        conflictInfo?.level === "hard"
          ? { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }
          : conflictInfo?.level === "soft"
          ? { background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }
          : conflictInfo?.level === "info"
          ? { background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)" }
          : isToday
          ? { background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)" }
          : { background: "rgba(255,255,255,0.03)",  border: "1px solid transparent" }
      }
    >
      {/* Datum */}
      <div className="w-10 text-center shrink-0 pt-0.5">
        <p className="text-xs font-bold text-slate-300">{event.startDatum.slice(8)}</p>
        <p className="text-[10px] text-slate-600">
          {new Date(event.startDatum + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "short" })}
        </p>
        {relTag && (
          <p className="text-[8px] font-semibold text-indigo-400/70 mt-0.5">{relTag}</p>
        )}
      </div>

      {/* Kalender dot */}
      <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
        style={{ background: hasConflict ? "#f59e0b" : "#6366f1" }} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-200 truncate">{event.titel}</p>

        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {/* Tijd / Hele dag */}
          <span className="flex items-center gap-1 text-[10px] text-slate-500">
            <Clock size={9} />
            {getTimeLabel(event)}
          </span>

          {/* Multi-dag bereik */}
          {multiDay && (
            <span className="flex items-center gap-1 text-[10px] text-slate-600">
              <CalendarDays size={9} />
              {formatDateRange(event)}
            </span>
          )}

          {/* Locatie */}
          {event.locatie && (
            <span className="flex items-center gap-1 text-[10px] text-slate-600 truncate max-w-[140px]">
              <MapPin size={9} />
              {event.locatie}
            </span>
          )}
        </div>

        {/* Smart conflict badge */}
        {conflictInfo && (
          <p className={`flex items-center gap-1 text-[10px] mt-1 ${
            conflictInfo.level === "hard" ? "text-red-400"
            : conflictInfo.level === "soft" ? "text-amber-400"
            : "text-blue-400"
          }`}>
            {conflictInfo.level === "info" ? <Info size={9} /> : <AlertTriangle size={9} />}
            {conflictInfo.message}
          </p>
        )}
      </div>

      {/* Acties / Badges Container */}
      <div className="flex flex-col items-end gap-2 shrink-0 pt-0.5">
        <div className="flex items-center gap-1.5 h-6">
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
                className="flex items-center gap-1 bg-red-950/40 border border-red-500/20 rounded pl-1.5 pr-1 py-0.5"
              >
                <span className="text-[10px] text-red-400 font-medium mr-1">Zeker?</span>
                <button onClick={handleDelete} className="p-0.5 hover:bg-red-500/20 rounded text-red-500">
                  <Check size={12} />
                </button>
                <button onClick={() => setConfirmDelete(false)} className="p-0.5 hover:bg-slate-700/50 rounded text-slate-400">
                  <X size={12} />
                </button>
              </motion.div>
            ) : (
              <>
                {onEdit && (
                  <motion.button
                    key="edit"
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    onClick={() => onEdit(event)}
                    className="p-2.5 -m-1.5 hover:bg-slate-500/10 rounded-md text-slate-500 hover:text-indigo-400 transition-colors"
                    title="Afspraak wijzigen"
                  >
                    <Pencil size={13} />
                  </motion.button>
                )}
                <motion.button
                  key="trash"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  onClick={handleDelete}
                  className="p-2.5 -m-1.5 hover:bg-red-500/10 rounded-md text-slate-500 hover:text-red-400 transition-colors"
                  title="Verwijder afspraak"
                >
                  <Trash2 size={13} />
                </motion.button>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Badge: VANDAAG */}
        {isToday && !hasConflict && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8" }}>
            VANDAAG
          </span>
        )}
      </div>
    </motion.div>
  );
}
