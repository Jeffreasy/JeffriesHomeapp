"use client";

import { useId, useState, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { UiTone } from "@/lib/ui/tones";
import { reducedMotionTransition, uiMotion } from "@/lib/ui/motion";
import { cn } from "@/lib/utils";

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

export interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  tone?: UiTone;
  headingLevel?: HeadingLevel;
  className?: string;
  contentClassName?: string;
  keepMounted?: boolean;
}

const collapsibleToneClasses: Record<
  UiTone,
  { header: string; icon: string; activeBorder: string }
> = {
  neutral: {
    header: "border-transparent hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-hover)]",
    icon: "text-[var(--color-text-muted)]",
    activeBorder: "border-[var(--color-border-strong)]",
  },
  accent: {
    header: "border-transparent hover:border-[var(--color-primary-border)] hover:bg-[var(--color-primary-subtle)]",
    icon: "text-[var(--color-primary)]",
    activeBorder: "border-[var(--color-primary-border)]",
  },
  info: {
    header: "border-transparent hover:border-[var(--color-info-border)] hover:bg-[var(--color-info-subtle)]",
    icon: "text-[var(--color-info)]",
    activeBorder: "border-[var(--color-info-border)]",
  },
  success: {
    header: "border-transparent hover:border-[var(--color-success-border)] hover:bg-[var(--color-success-subtle)]",
    icon: "text-[var(--color-success)]",
    activeBorder: "border-[var(--color-success-border)]",
  },
  warning: {
    header: "border-transparent hover:border-[var(--color-warning-border)] hover:bg-[var(--color-warning-subtle)]",
    icon: "text-[var(--color-warning)]",
    activeBorder: "border-[var(--color-warning-border)]",
  },
  danger: {
    header: "border-transparent hover:border-[var(--color-danger-border)] hover:bg-[var(--color-danger-subtle)]",
    icon: "text-[var(--color-danger)]",
    activeBorder: "border-[var(--color-danger-border)]",
  },
};

const headingTags = {
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
} as const;

export function CollapsibleSection({
  title,
  subtitle,
  icon,
  children,
  defaultOpen = false,
  tone = "accent",
  headingLevel = 3,
  className,
  contentClassName,
  keepMounted = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();
  const currentTone = collapsibleToneClasses[tone];
  const HeadingTag = headingTags[headingLevel];
  const reduceMotion = useReducedMotion();
  // Under prefers-reduced-motion, collapse the height/opacity spring to a
  // near-instant tween so the section just snaps open/closed (R3).
  const expandTransition = reduceMotion ? reducedMotionTransition : uiMotion.spring.disclosure;
  const chevronTransition = reduceMotion ? reducedMotionTransition : uiMotion.spring.disclosureIcon;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border bg-[var(--color-surface-muted)] shadow-[var(--shadow-surface)] transition-colors duration-[var(--motion-standard)] motion-reduce:duration-0",
        isOpen ? currentTone.activeBorder : "border-[var(--color-border)]",
        className,
      )}
    >
      <HeadingTag className="m-0">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className={cn(
            "flex w-full items-center justify-between gap-3 border p-4 text-left transition-[background-color,border-color,color] duration-[var(--motion-fast)] motion-reduce:duration-0 sm:px-6",
            isOpen
              ? "border-transparent bg-[var(--color-surface-hover)]"
              : currentTone.header,
          )}
        >
          <span className="flex min-w-0 items-center gap-3 sm:gap-4">
            {icon ? (
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]",
                  currentTone.icon,
                )}
              >
                {icon}
              </span>
            ) : null}
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-base font-semibold tracking-tight text-[var(--color-text)]">
                {title}
              </span>
              {subtitle ? (
                <span className="mt-0.5 line-clamp-1 text-xs font-normal text-[var(--color-text-muted)]">
                  {subtitle}
                </span>
              ) : null}
            </span>
          </span>

          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors duration-[var(--motion-fast)] motion-reduce:duration-0",
              isOpen && "bg-[var(--color-surface-active)] text-[var(--color-text)]",
            )}
          >
            <motion.span
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={chevronTransition}
            >
              <ChevronDown size={18} aria-hidden="true" />
            </motion.span>
          </span>
        </button>
      </HeadingTag>

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
          <div
            className={cn(
              "border-t border-[var(--color-border)] p-4 pt-2 sm:px-6 sm:pb-6",
              contentClassName,
              !isOpen && "pointer-events-none",
            )}
          >
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
              <div
                className={cn("border-t border-[var(--color-border)] p-4 pt-2 sm:px-6 sm:pb-6", contentClassName)}
              >
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
