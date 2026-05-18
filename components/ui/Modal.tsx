"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  className?: string;
  theme?: "primary" | "sky" | "emerald" | "rose" | "violet" | "slate" | "amber";
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
};

const themeClasses = {
  primary: "border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)]",
  sky: "border-sky-500/20 bg-sky-500/10",
  emerald: "border-emerald-500/20 bg-[#022c22]/90",
  rose: "border-rose-500/20 bg-rose-500/10",
  violet: "border-violet-500/20 bg-violet-500/10",
  slate: "border-slate-500/20 bg-slate-500/10",
  amber: "border-amber-500/20 bg-amber-500/10",
};

export function Modal({
  isOpen,
  onClose,
  title,
  icon,
  children,
  maxWidth = "2xl",
  className,
  theme = "primary",
}: ModalProps) {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className={cn(
              "relative w-full glass rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-full",
              maxWidthClasses[maxWidth],
              themeClasses[theme],
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                {icon && <div className="text-white/80">{icon}</div>}
                <h2 id="modal-title" className="text-lg font-bold text-white tracking-tight">
                  {title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 -mr-1.5 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                aria-label="Sluiten"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
