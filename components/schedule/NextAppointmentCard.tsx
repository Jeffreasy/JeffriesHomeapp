"use client";

import { Calendar, ArrowRight, AlertTriangle, Clock } from "lucide-react";
import {
  type PersonalEvent,
  formatDateRange,
  getTimeLabel,
} from "@/hooks/usePersonalEvents";

interface NextAppointmentCardProps {
  event: PersonalEvent | null;
}

export function NextAppointmentCard({ event }: NextAppointmentCardProps) {
  if (!event) return null;

  const hasConflict = !!event.conflictMetDienst;
  const accent      = hasConflict ? "#f59e0b" : "#6366f1";
  const accentBg    = hasConflict ? "rgba(245,158,11,0.08)" : "rgba(99,102,241,0.08)";
  const borderColor = hasConflict ? "rgba(245,158,11,0.3)" : "rgba(99,102,241,0.2)";

  return (
    <div
      className="rounded-2xl p-4 border"
      style={{ background: accentBg, borderColor }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        {hasConflict ? (
          <AlertTriangle size={14} style={{ color: accent }} />
        ) : (
          <Calendar size={14} style={{ color: accent }} />
        )}
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>
          {hasConflict ? "Volgende afspraak — conflict!" : "Volgende afspraak"}
        </p>
      </div>

      {/* Content */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-white truncate">{event.titel}</p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <ArrowRight size={10} />
              {formatDateRange(event)}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock size={10} />
              {getTimeLabel(event)}
            </span>
          </div>

          {/* Conflict details */}
          {hasConflict && (
            <p className="flex items-center gap-1 text-xs text-amber-400 mt-2 font-medium">
              <AlertTriangle size={11} />
              {event.conflictMetDienst}
            </p>
          )}
        </div>

        {/* Grote datum indicator */}
        <div className="text-center shrink-0">
          <p className="text-3xl font-black leading-none" style={{ color: accent }}>
            {event.startDatum.slice(8)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {new Date(event.startDatum + "T12:00:00").toLocaleDateString("nl-NL", {
              month: "short",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
