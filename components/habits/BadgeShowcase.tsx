"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useHabits } from "@/hooks/useHabits";
import { BADGE_DEFINITIONS } from "@/lib/habit-constants";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { Surface, surfaceVariants } from "@/components/ui/Surface";
import { SurfaceHeader } from "@/components/ui/SurfaceHeader";
import { uiMotion } from "@/lib/ui/motion";
import { cn } from "@/lib/utils";

export function BadgeShowcase() {
  const { badges } = useHabits();
  const badgeSet = new Set(badges.map((badge) => badge.badgeId));
  const recentBadge = badges.length > 0 ? badges[0] : null;
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const selectedBadge = BADGE_DEFINITIONS.find((definition) => definition.id === selectedBadgeId) ?? null;

  return (
    <Surface padding="sm">
      <SurfaceHeader
        icon={<Trophy size={16} className="text-[var(--color-warning)]" />}
        title="Badges"
        action={<Badge size="sm">{badges.length}/{BADGE_DEFINITIONS.length}</Badge>}
        headingLevel={3}
        compact
      />

      {recentBadge && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <Surface tone="accent" radius="md" padding="sm">
            <p className="mb-1 text-micro text-[var(--color-warning)]">Laatst behaald</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">{recentBadge.emoji}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[var(--color-text)]">{recentBadge.naam}</p>
                <p className="line-clamp-2 text-micro text-[var(--color-text-subtle)]">{recentBadge.beschrijving}</p>
              </div>
            </div>
          </Surface>
        </motion.div>
      )}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {BADGE_DEFINITIONS.map((definition) => {
          const unlocked = badgeSet.has(definition.id);
          const isNew = recentBadge?.badgeId === definition.id;
          const isSelected = selectedBadgeId === definition.id;

          return (
            <motion.button
              type="button"
              key={definition.id}
              onClick={() => setSelectedBadgeId((previous) => previous === definition.id ? null : definition.id)}
              title={`${definition.naam} — ${definition.beschrijving}${unlocked ? "" : " (nog vergrendeld)"}`}
              aria-label={`${unlocked ? "Behaald" : "Vergrendeld"}: ${definition.naam}. ${definition.beschrijving}`}
              aria-pressed={isSelected}
              className={cn(
                buttonVariants({ variant: isSelected ? "primary" : "secondary" }),
                surfaceVariants({ tone: isSelected ? "accent" : unlocked ? "subtle" : "default", radius: "sm", padding: "sm" }),
                "relative h-auto min-h-20 flex-col justify-center gap-0 overflow-hidden",
                !unlocked && "opacity-60",
                isNew && "shadow-[var(--shadow-surface)] ring-1 ring-[var(--color-primary-border)]",
              )}
              whileHover={unlocked ? { scale: 1.05 } : undefined}
            >
              <span className={cn("mb-1 text-2xl", !unlocked && "grayscale")} aria-hidden="true">
                {unlocked ? definition.emoji : "🔒"}
              </span>
              <span className={cn("text-center text-micro font-medium leading-tight", unlocked ? "text-[var(--color-text-muted)]" : "text-[var(--color-text-subtle)]")}>
                {definition.naam}
              </span>
              {unlocked && <span className="mt-0.5 text-micro text-[var(--color-primary-hover)]">+{definition.xpBonus} XP</span>}
              {isNew && (
                <motion.span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[var(--color-primary-subtle)]"
                  animate={{ opacity: [0.2, 0.45, 0.2, 0] }}
                  transition={{ duration: uiMotion.durationSeconds.celebration, repeat: 0 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {selectedBadge && (
        <Surface tone="accent" radius="sm" padding="xs" className="mt-3 text-micro text-[var(--color-text)]" role="status" aria-live="polite">
          <span className="mr-1.5" aria-hidden="true">{badgeSet.has(selectedBadge.id) ? selectedBadge.emoji : "🔒"}</span>
          <span className="font-semibold">{selectedBadge.naam}</span>
          {" — "}{selectedBadge.beschrijving} · +{selectedBadge.xpBonus} XP
        </Surface>
      )}
    </Surface>
  );
}