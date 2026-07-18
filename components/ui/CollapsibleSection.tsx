"use client";

import { useId, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
  const contentId = useId();
  const currentTheme = themeClasses[theme];
  const reduceMotion = useReducedMotion();
  // Under prefers-reduced-motion, collapse the height/opacity spring to a
  // near-instant tween so the section just snaps open/closed (R3).
  const expandTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 300, damping: 25, mass: 0.8 };
  const chevronTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 300, damping: 20 };

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border bg-[var(--color-surface)]/40 backdrop-blur-md transition-colors duration-300",
        isOpen ? currentTheme.activeBorder : "border-white/5",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className={cn(
          "flex w-full items-center justify-between gap-3 border p-4 text-left transition-all duration-300 sm:px-6",
          isOpen ? "bg-white/[0.02] border-transparent" : currentTheme.header
        )}
      >
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          {icon && (
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5", currentTheme.icon)}>
              {icon}
            </div>
          )}
          <div className="flex min-w-0 flex-col">
            <h3 className="truncate text-base font-semibold tracking-tight text-white">{title}</h3>
            {subtitle && (
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{subtitle}</p>
            )}
          </div>
        </div>
        
        <div className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
          isOpen ? "bg-white/10 text-white" : "text-slate-400"
        )}>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={chevronTransition}
          >
            <ChevronDown size={18} />
          </motion.div>
        </div>
      </button>

      {keepMounted ? (
        <motion.div
          id={contentId}
          aria-hidden={!isOpen}
          inert={isOpen ? undefined : true}
          initial={false}
          animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
          transition={expandTransition}
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
              id={contentId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={expandTransition}
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
