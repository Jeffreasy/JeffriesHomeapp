"use client";

import { Clock, MapPin, Timer, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { type DienstRow, shiftTypeColor } from "@/lib/schedule";
import { type PersonalEvent } from "@/hooks/usePersonalEvents";
import { cn } from "@/lib/utils";

/** Format ISO date string (YYYY-MM-DD) → DD-MM-YYYY veilig. */
function formatDate(iso: string, style: "compact" | "full" = "full"): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return style === "compact" ? `${day}-${month}` : `${day}-${month}-${year}`;
}

/** Bereken menselijke relatieve datum. */
function getRelativeDay(iso: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + "T00:00:00");
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "vandaag";
  if (diff === 1) return "morgen";
  if (diff === 2) return "overmorgen";
  if (diff < 0)  return `${Math.abs(diff)}d geleden`;
  return `over ${diff} dagen`;
}

interface NextShiftCardProps {
  dienst:     DienstRow | null;
  compact?:   boolean;
  onImport?:  () => void;
  afspraken?: PersonalEvent[];
}

export function NextShiftCard({ dienst, compact, onImport, afspraken = [] }: NextShiftCardProps) {
  if (!dienst) {
    return (
      <div className={cn(
        "glass rounded-xl border border-white/5 flex items-center justify-center",
        compact ? "px-4 py-3" : "px-6 py-8"
      )}>
        <div className="text-center">
          <p className="text-sm text-slate-500">Geen aankomende diensten</p>
          {onImport && (
            <button
              onClick={onImport}
              className="mt-2 text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 mx-auto"
            >
              <Upload size={10} /> Rooster importeren
            </button>
          )}
        </div>
      </div>
    );
  }

  const colors      = shiftTypeColor(dienst.shiftType);
  const isBezig      = dienst.status === "Bezig";
  const relativeDay  = getRelativeDay(dienst.startDatum);
  const isToday      = relativeDay === "vandaag";
  const isTomorrow   = relativeDay === "morgen";
  const isZondag     = dienst.dag === "Zondag";
  const isZaterdag   = dienst.dag === "Zaterdag";

  // ── Compact card (dashboard) ──────────────────────────────────────────────────
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("rounded-xl px-4 py-3 border border-white/10", colors.bg)}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-0.5">
              {isBezig ? "🟢 Nu bezig" : "⏰ Volgende dienst"}
            </p>
            <p className={cn("text-sm font-bold", colors.text)}>
              {dienst.dag} · {formatDate(dienst.startDatum, "compact")}
            </p>
            <p className="text-xs text-slate-400">
              {dienst.startTijd}–{dienst.eindTijd} · {dienst.shiftType} · {dienst.duur}u
            </p>
            {!isBezig && (
              <p className={cn(
                "text-[10px] font-semibold mt-0.5",
                isToday ? "text-green-400" : isTomorrow ? "text-amber-400" : "text-slate-500"
              )}>
                {isToday ? "🟢 Vandaag" : `📅 ${relativeDay.charAt(0).toUpperCase() + relativeDay.slice(1)}`}
              </p>
            )}
            {isZondag && (
              <p className="text-[10px] font-bold text-yellow-400 mt-0.5">💰 +ORT toeslag</p>
            )}
            {isZaterdag && (
              <p className="text-[10px] font-medium text-yellow-600 mt-0.5">📅 Weekend</p>
            )}
            {afspraken.length > 0 && (
              <div className="mt-1.5 space-y-0.5">
                {afspraken.map(evt => {
                  // Determine conflict level inline
                  const isHeledag = evt.heledag || !evt.startTijd;
                  const hasTimeOverlap = !isHeledag && evt.startTijd && evt.eindTijd && dienst
                    && evt.startTijd < dienst.eindTijd && evt.eindTijd > dienst.startTijd;
                  
                  const levelColor = hasTimeOverlap ? "text-red-400" : isHeledag ? "text-amber-400" : "text-blue-400";
                  const icon = hasTimeOverlap ? "⚠" : isHeledag ? "📅" : "ℹ";
                  const timeLabel = isHeledag ? "hele dag" : `${evt.startTijd}–${evt.eindTijd}`;
                  const suffix = hasTimeOverlap ? " — overlapt!" : "";

                  return (
                    <p key={evt.eventId} className={`text-[10px] font-medium ${levelColor}`}>
                      {icon} {evt.titel} · {timeLabel}{suffix}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: colors.accent + "22", border: `1px solid ${colors.accent}44` }}
          >
            <Clock size={18} style={{ color: colors.accent }} />
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Full card ─────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${colors.accent}18 0%, ${colors.accent}08 100%)`,
        border: `1px solid ${colors.accent}30`,
      }}
    >
      {/* Status banner */}
      <div
        className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest flex items-center gap-2"
        style={{ background: colors.accent + "20", color: colors.accent }}
      >
        {isBezig ? "🟢 Bezig" : "⏰ Volgende dienst"}
        {isZondag && <span className="ml-2 text-yellow-400">💰 +ORT</span>}
        {isZaterdag && <span className="ml-2 text-yellow-600">weekend</span>}
        <span className="ml-auto font-normal normal-case tracking-normal opacity-70">
          {dienst.shiftType}
          {!isBezig && (
            <span className="ml-2 font-semibold">
              · {relativeDay}
            </span>
          )}
        </span>
      </div>

      <div className="p-5">
        {/* Date + time */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-2xl font-bold text-white">{dienst.dag}</p>
            <p className="text-sm text-slate-400">{formatDate(dienst.startDatum, "full")}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: colors.accent }}>
              {dienst.startTijd}
            </p>
            <p className="text-sm text-slate-400">tot {dienst.eindTijd}</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-sm">
          {dienst.locatie && (
            <div className="flex items-center gap-2 text-slate-300">
              <MapPin size={13} className="text-slate-500 flex-shrink-0" />
              <span className="truncate">{dienst.locatie}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-slate-300">
            <Timer size={13} className="text-slate-500 flex-shrink-0" />
            <span>{dienst.duur} uur · Team {dienst.team || "?"}</span>
          </div>
        </div>

        {/* Afspraken overlap waarschuwing */}
        {afspraken.length > 0 && (
          <div className="mt-3 space-y-1">
            {afspraken.map(evt => {
              const isHeledag = evt.heledag || !evt.startTijd;
              const hasTimeOverlap = !isHeledag && evt.startTijd && evt.eindTijd && dienst
                && evt.startTijd < dienst.eindTijd && evt.eindTijd > dienst.startTijd;

              const bgColor = hasTimeOverlap
                ? "rgba(239,68,68,0.10)" : isHeledag
                ? "rgba(245,158,11,0.10)" : "rgba(96,165,250,0.08)";
              const borderColor = hasTimeOverlap
                ? "rgba(239,68,68,0.25)" : isHeledag
                ? "rgba(245,158,11,0.25)" : "rgba(96,165,250,0.20)";
              const textColor = hasTimeOverlap
                ? "#ef4444" : isHeledag
                ? "#f59e0b" : "#60a5fa";
              const icon = hasTimeOverlap ? "⚠" : isHeledag ? "📅" : "ℹ";
              const timeLabel = isHeledag ? "hele dag" : `${evt.startTijd}–${evt.eindTijd}`;
              const suffix = hasTimeOverlap ? " — overlapt!" : "";

              return (
                <div key={evt.eventId}
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl"
                  style={{ background: bgColor, border: `1px solid ${borderColor}`, color: textColor }}
                >
                  <span>{icon}</span>
                  <span>{evt.titel} · {timeLabel}{suffix}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
