"use client";

import { motion } from "framer-motion";
import { Sunrise, Moon, Briefcase, Loader2 } from "lucide-react";
import { type ShiftType } from "@/lib/automations";
import { cn } from "@/lib/utils";

interface WekkerPack {
  type: ShiftType;
  label: string;
  sub: string;
  accent: string;
  hasIt: boolean;
}

interface DienstWekkerSectionProps {
  packs: WekkerPack[];
  onInstall: (type: ShiftType) => void;
  installingType?: ShiftType | null;
}

const PACK_ICONS: Record<string, React.ReactNode> = {
  Vroeg: <Sunrise size={16} />,
  Laat: <Moon size={16} />,
  Dienst: <Briefcase size={16} />,
};

export function DienstWekkerSection({ packs, onInstall, installingType }: DienstWekkerSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">
          Dienst-Wekker Routines
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {packs.map(({ type, label, sub, accent, hasIt }) => (
          <motion.button
            key={type}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onInstall(type)}
            disabled={installingType === type}
            aria-label={`${label} routine ${hasIt ? "opnieuw instellen" : "installeren"}`}
            className="relative flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all disabled:opacity-50"
            style={{
              background: accent + "10",
              borderColor: hasIt ? accent + "60" : accent + "25",
            }}
          >
            {hasIt && (
              <span
                className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: accent + "20", color: accent }}
                aria-label="Geïnstalleerd"
              >
                ✓
              </span>
            )}
            <span style={{ color: accent }}>{PACK_ICONS[type]}</span>
            <div>
              <p className="text-xs font-semibold text-slate-200">{label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>
            </div>
            <div className="flex items-center gap-1 text-[10px]" style={{ color: accent }}>
              {installingType === type ? (
                <>
                  <Loader2 size={10} className="animate-spin" />
                  <span>Bezig...</span>
                </>
              ) : hasIt ? (
                "Opnieuw instellen"
              ) : (
                "Installeren →"
              )}
            </div>
          </motion.button>
        ))}
      </div>
      <p className="text-[10px] text-slate-600 mt-2">
        Fires automatisch alleen op dagen met een matching dienst in je rooster
      </p>
    </section>
  );
}
