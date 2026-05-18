"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  theme?: "primary" | "sky" | "emerald" | "rose" | "violet" | "amber" | "slate";
  className?: string;
  contentClassName?: string;
  keepMounted?: boolean;
}

const themeClasses = {
  primary: {
    header: "hover:bg-[var(--color-primary-subtle)] border-transparent hover:border-[var(--color-primary-border)]",
    icon: "text-[var(--color-primary)]",
    activeBorder: "border-[var(--color-primary-border)]",
  },
  sky: {
    header: "hover:bg-sky-500/10 border-transparent hover:border-sky-500/20",
    icon: "text-sky-400",
    activeBorder: "border-sky-500/20",
  },
  emerald: {
    header: "hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20",
    icon: "text-emerald-400",
    activeBorder: "border-emerald-500/20",
  },
  violet: {
    header: "hover:bg-violet-500/10 border-transparent hover:border-violet-500/20",
    icon: "text-violet-400",
    activeBorder: "border-violet-500/20",
  },
  amber: {
    header: "hover:bg-amber-500/10 border-transparent hover:border-amber-500/20",
    icon: "text-amber-400",
    activeBorder: "border-amber-500/20",
  },
  rose: {
    header: "hover:bg-rose-500/10 border-transparent hover:border-rose-500/20",
    icon: "text-rose-400",
    activeBorder: "border-rose-500/20",
  },
  slate: {
    header: "hover:bg-slate-500/10 border-transparent hover:border-slate-500/20",
    icon: "text-slate-400",
    activeBorder: "border-slate-500/20",
  },
};

export function CollapsibleSection({
  title,
  subtitle,
  icon,
  children,
  defaultOpen = false,
  theme = "primary",
  className,
  contentClassName,
  keepMounted = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const currentTheme = themeClasses[theme];

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border bg-[var(--color-surface)]/40 backdrop-blur-md transition-colors duration-300 overflow-hidden",
        isOpen ? currentTheme.activeBorder : "border-white/5",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full p-4 sm:px-6 transition-all duration-300 text-left rounded-2xl border",
          isOpen ? "bg-white/[0.02] border-transparent" : currentTheme.header
        )}
      >
        <div className="flex items-center gap-4">
          {icon && (
            <div className={cn("flex items-center justify-center h-10 w-10 rounded-xl bg-white/5 border border-white/10", currentTheme.icon)}>
              {icon}
            </div>
          )}
          <div className="flex flex-col">
            <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        
        <div className={cn(
          "flex items-center justify-center h-8 w-8 rounded-lg transition-colors",
          isOpen ? "bg-white/10 text-white" : "text-slate-400"
        )}>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <ChevronDown size={18} />
          </motion.div>
        </div>
      </button>

      {keepMounted ? (
        <motion.div
          initial={false}
          animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.8 }}
          className="overflow-hidden"
        >
          <div className={cn("p-4 sm:px-6 sm:pb-6 pt-2 border-t border-white/5", contentClassName, !isOpen && "pointer-events-none")}>
            {children}
          </div>
        </motion.div>
      ) : (
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.8 }}
              className="overflow-hidden"
            >
              <div className={cn("p-4 sm:px-6 sm:pb-6 pt-2 border-t border-white/5", contentClassName)}>
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
