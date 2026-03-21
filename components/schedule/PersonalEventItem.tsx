"use client";

import { motion } from "framer-motion";
import { MapPin, Clock, CalendarDays, AlertTriangle } from "lucide-react";
import {
  type PersonalEvent,
  formatDateRange,
  getTimeLabel,
  isMultiDay,
} from "@/hooks/usePersonalEvents";

interface PersonalEventItemProps {
  event:   PersonalEvent;
  isToday?: boolean;
}

export function PersonalEventItem({ event, isToday }: PersonalEventItemProps) {
  const hasConflict = !!event.conflictMetDienst;
  const multiDay    = isMultiDay(event);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all"
      style={
        hasConflict
          ? { background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }
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

        {/* Conflict badge */}
        {hasConflict && (
          <p className="flex items-center gap-1 text-[10px] text-amber-400 mt-1">
            <AlertTriangle size={9} />
            {event.conflictMetDienst}
          </p>
        )}
      </div>

      {/* Badge: VANDAAG */}
      {isToday && !hasConflict && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
          style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8" }}>
          VANDAAG
        </span>
      )}
    </motion.div>
  );
}
