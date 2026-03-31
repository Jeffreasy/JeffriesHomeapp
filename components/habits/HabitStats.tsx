"use client";

import { motion } from "framer-motion";
import { TrendingUp, Flame, Target, Award } from "lucide-react";
import { useHabits } from "@/hooks/useHabits";
import { formatXP, formatStreak, formatLevel } from "@/lib/habit-constants";

/**
 * HabitStats — Statistics dashboard.
 * Mobile-first: stacked cards, XP progress bar, streak leaderboard.
 */
export function HabitStats() {
  const { stats, level, badges } = useHabits();

  if (!stats) {
    return (
      <div className="glass rounded-2xl p-4 animate-pulse">
        <div className="h-5 w-24 bg-white/5 rounded mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* XP / Level card */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award size={16} className="text-orange-400" />
            <h3 className="text-sm font-bold text-slate-200">
              {formatLevel(level.level, level.titel)}
            </h3>
          </div>
          <span className="text-xs font-bold text-orange-400">{formatXP(stats.totaalXP)}</span>
        </div>

        {/* XP Progress bar */}
        <div className="mb-2">
          <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #f97316, #f59e0b)" }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(level.progress * 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[11px] text-slate-500">
              {level.nextXP > 0 ? `Nog ${level.nextXP} XP voor Lv.${level.level + 1}` : "Max level! 🌟"}
            </span>
            <span className="text-[11px] text-slate-500">{Math.round(level.progress * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Stats grid — 2x2 on mobile */}
      <div className="grid grid-cols-2 gap-2">
        <StatMiniCard
          icon={<Target size={14} className="text-blue-400" />}
          label="Totaal Habits"
          value={stats.totaalHabits.toString()}
          accent="blue"
        />
        <StatMiniCard
          icon={<TrendingUp size={14} className="text-green-400" />}
          label="Totaal Voltooid"
          value={stats.totaalVoltooid.toString()}
          accent="green"
        />
        <StatMiniCard
          icon={<Flame size={14} className="text-orange-400" />}
          label="Langste Streak"
          value={`${stats.langsteStreakOoit}d`}
          accent="orange"
        />
        <StatMiniCard
          icon={<Award size={14} className="text-amber-400" />}
          label="Badges"
          value={stats.badgeCount.toString()}
          accent="amber"
        />
      </div>

      {/* Top Streaks leaderboard */}
      {stats.topStreaks.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
            <Flame size={13} className="text-orange-400" /> Actieve Streaks
          </h4>
          <div className="space-y-2">
            {stats.topStreaks.map((s: { naam: string; emoji: string; streak: number }, i: number) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 w-4">#{i + 1}</span>
                  <span className="text-sm">{s.emoji}</span>
                  <span className="text-xs text-slate-300">{s.naam}</span>
                </div>
                <span className="text-xs font-bold text-orange-400">
                  {formatStreak(s.streak)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatMiniCard({ icon, label, value, accent }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  const bgMap: Record<string, string> = {
    blue:   "rgba(59,130,246,0.08)",
    green:  "rgba(34,197,94,0.08)",
    orange: "rgba(249,115,22,0.08)",
    amber:  "rgba(245,158,11,0.08)",
  };
  const borderMap: Record<string, string> = {
    blue:   "rgba(59,130,246,0.12)",
    green:  "rgba(34,197,94,0.12)",
    orange: "rgba(249,115,22,0.12)",
    amber:  "rgba(245,158,11,0.12)",
  };

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-1.5"
      style={{
        background: bgMap[accent] ?? bgMap.orange,
        border: `1px solid ${borderMap[accent] ?? borderMap.orange}`,
      }}
    >
      {icon}
      <span className="text-lg font-extrabold text-slate-200 leading-none">{value}</span>
      <span className="text-[9px] text-slate-500">{label}</span>
    </div>
  );
}
