"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useHabits } from "@/hooks/useHabits";
import { BADGE_DEFINITIONS } from "@/lib/habit-constants";

/**
 * BadgeShowcase — Grid of badges with locked/unlocked states.
 * Mobile-first: 3-column grid, touch-friendly, glow on recent badge.
 */
export function BadgeShowcase() {
  const { badges } = useHabits();

  const badgeSet = new Set(badges.map((b) => b.badgeId));
  const recentBadge = badges.length > 0 ? badges[0] : null;
  // Tap-to-detail (R3): title-tooltips don't exist on touch, so a tapped badge
  // reveals its criteria in a line below the grid — locked badges too.
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const selectedBadge =
    BADGE_DEFINITIONS.find((d) => d.id === selectedBadgeId) ?? null;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-orange-400" />
          <h3 className="text-sm font-bold text-slate-200">Badges</h3>
        </div>
        <span className="text-[10px] text-slate-500 font-medium">
          {badges.length}/{BADGE_DEFINITIONS.length}
        </span>
      </div>

      {/* Recent badge highlight */}
      {recentBadge && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-xl"
          style={{
            background: "rgba(249,115,22,0.08)",
            border: "1px solid rgba(249,115,22,0.15)",
          }}
        >
          <p className="text-[10px] text-orange-400/70 mb-1">Laatst behaald</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{recentBadge.emoji}</span>
            <div>
              <p className="text-sm font-bold text-slate-200">
                {recentBadge.naam}
              </p>
              <p className="text-[10px] text-slate-500">
                {recentBadge.beschrijving}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Badge grid — 3 columns on mobile, 4 on desktop */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {BADGE_DEFINITIONS.map((def) => {
          const unlocked = badgeSet.has(def.id);
          const isNew = recentBadge?.badgeId === def.id;

          const isSelected = selectedBadgeId === def.id;
          return (
            <motion.button
              type="button"
              key={def.id}
              onClick={() =>
                setSelectedBadgeId((prev) => (prev === def.id ? null : def.id))
              }
              title={`${def.naam} — ${def.beschrijving}${unlocked ? "" : " (nog vergrendeld)"}`}
              aria-label={`${unlocked ? "Behaald" : "Vergrendeld"}: ${def.naam}. ${def.beschrijving}`}
              aria-pressed={isSelected}
              className="relative flex flex-col items-center p-3 rounded-xl transition-all min-h-[80px] justify-center cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
              style={{
                background: unlocked
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(255,255,255,0.01)",
                border: isSelected
                  ? "1px solid rgba(251,191,36,0.5)"
                  : isNew
                    ? "1px solid rgba(249,115,22,0.25)"
                    : unlocked
                      ? "1px solid rgba(255,255,255,0.06)"
                      : "1px solid rgba(255,255,255,0.03)",
                boxShadow: isNew ? "0 0 20px rgba(249,115,22,0.1)" : "none",
              }}
              whileHover={unlocked ? { scale: 1.05 } : {}}
            >
              {/* Emoji or lock */}
              <span
                className="text-2xl mb-1"
                style={{
                  filter: unlocked ? "none" : "grayscale(1) opacity(0.3)",
                }}
              >
                {unlocked ? def.emoji : "🔒"}
              </span>

              <span
                className="text-[9px] font-medium text-center leading-tight"
                style={{
                  color: unlocked
                    ? "rgba(255,255,255,0.7)"
                    : "rgba(255,255,255,0.45)",
                }}
              >
                {def.naam}
              </span>

              {/* XP bonus */}
              {unlocked && (
                <span className="text-[8px] text-orange-400/50 mt-0.5">
                  +{def.xpBonus} XP
                </span>
              )}

              {/* New badge glow */}
              {isNew && (
                <motion.div
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)",
                  }}
                  animate={{ opacity: [0.5, 1, 0.5, 0] }}
                  transition={{ duration: 2, repeat: 0 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Tapped-badge detail (R3): criteria of any badge, locked or not. */}
      {selectedBadge && (
        <p
          className="mt-3 rounded-lg border border-amber-500/15 bg-amber-500/[0.06] px-3 py-2 text-[11px] text-slate-300"
          role="status"
          aria-live="polite"
        >
          <span className="mr-1.5">
            {badgeSet.has(selectedBadge.id) ? selectedBadge.emoji : "🔒"}
          </span>
          <span className="font-semibold text-slate-200">{selectedBadge.naam}</span>
          {" — "}
          {selectedBadge.beschrijving} · +{selectedBadge.xpBonus} XP
        </p>
      )}
    </div>
  );
}
