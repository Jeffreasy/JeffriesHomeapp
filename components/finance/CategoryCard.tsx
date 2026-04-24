"use client";

import { motion } from "framer-motion";
import { eur, getCatColor } from "@/lib/finance-constants";

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
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`category-card ${isActive ? "category-card--active" : ""}`}
      onClick={onClick}
      style={{ "--cat-color": color } as React.CSSProperties}
    >
      <div className="category-card__bar" style={{ width: `${Math.min(percentage, 100)}%`, background: color }} />
      <div className="category-card__content">
        <span className="category-card__name">{categorie}</span>
        <span className="category-card__amount">{amountLabel ?? eur(bedrag)}</span>
      </div>
      <div className="category-card__meta">
        <span>{count}x</span>
        <span>{percentage}%</span>
      </div>
    </motion.button>
  );
}
