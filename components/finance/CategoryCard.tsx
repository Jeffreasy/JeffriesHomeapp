"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { surfaceVariants } from "@/components/ui/Surface";
import { eur, getCatColor } from "@/lib/finance-constants";
import { cn } from "@/lib/utils";

interface CategoryCardProps {
  categorie: string;
  bedrag: number;
  count: number;
  percentage: number;
  amountLabel?: string;
  onClick: () => void;
  isActive: boolean;
}

export function CategoryCard({ categorie, bedrag, count, percentage, amountLabel, onClick, isActive }: CategoryCardProps) {
  const color = getCatColor(categorie);
  const share = Math.min(percentage, 100) + "%";

  return (
    <motion.button
      type="button"
      aria-pressed={isActive}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        surfaceVariants({ tone: isActive ? "accent" : "subtle", radius: "md", padding: "sm" }),
        "relative min-h-24 overflow-hidden text-left transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-[var(--category-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]",
        isActive && "border-[var(--category-accent)]",
      )}
      onClick={onClick}
      style={{
        "--category-accent": color,
        "--category-share": share,
      } as CSSProperties}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1 w-[var(--category-share)] bg-[var(--category-accent)]"
      />
      <div className="relative flex items-start justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-semibold text-[var(--color-text)]">
          {categorie}
        </span>
        <span className="shrink-0 text-sm font-bold tabular-nums text-[var(--color-text)]">
          {amountLabel ?? eur(bedrag)}
        </span>
      </div>
      <div className="relative mt-3 flex items-center justify-between text-xs font-medium text-[var(--color-text-subtle)]">
        <span>{count}x</span>
        <span>{percentage}%</span>
      </div>
    </motion.button>
  );
}
