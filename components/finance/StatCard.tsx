"use client";

import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: boolean;
  warning?: boolean;
  className?: string;
}

export function StatCard({ label, value, sub, icon: Icon, accent = false, warning = false, className = "" }: StatCardProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={["finance-stat", accent && "finance-stat--accent", warning && "finance-stat--warning", className].filter(Boolean).join(" ")}>
      <div className="finance-stat__icon"><Icon size={20} /></div>
      <div className="finance-stat__body">
        <span className="finance-stat__value">{value}</span>
        <span className="finance-stat__label">{label}</span>
        {sub && <span className="finance-stat__sub">{sub}</span>}
      </div>
    </motion.div>
  );
}
