"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppIcon } from "@/components/ui/AppIcon";
import { cn } from "@/lib/utils";

const FOCUS_AUTO_STORAGE_KEY = "homeapp_focus_auto_enabled";
const FOCUS_AUTO_EVENT = "homeapp-focus-auto-change";
const FOCUS_IDLE_MS = 60_000;
const EXCLUDED_PREFIXES = ["/focus", "/sign-in", "/sign-up"];

function readAutoEnabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(FOCUS_AUTO_STORAGE_KEY) === "1";
}

function writeAutoEnabled(value: boolean) {
  window.localStorage.setItem(FOCUS_AUTO_STORAGE_KEY, value ? "1" : "0");
  window.dispatchEvent(new CustomEvent(FOCUS_AUTO_EVENT, { detail: value }));
}

function subscribeToFocusPreference(callback: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === FOCUS_AUTO_STORAGE_KEY) callback();
  };
  const handleLocalChange = () => callback();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(FOCUS_AUTO_EVENT, handleLocalChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(FOCUS_AUTO_EVENT, handleLocalChange);
  };
}

function isExcludedRoute(pathname: string) {
  return EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function hasActiveEditingSurface() {
  const active = document.activeElement;
  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    active instanceof HTMLSelectElement ||
    active?.getAttribute("contenteditable") === "true"
  ) {
    return true;
  }

  return Boolean(document.querySelector('[role="dialog"], [aria-modal="true"]'));
}

export function useFocusModePreference() {
  const autoEnabled = useSyncExternalStore(subscribeToFocusPreference, readAutoEnabled, () => false);

  const setAutoEnabled = (value: boolean) => {
    writeAutoEnabled(value);
  };

  return { autoEnabled, setAutoEnabled };
}

export function FocusModeAutoRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  const { autoEnabled } = useFocusModePreference();

  useEffect(() => {
    if (!autoEnabled || isExcludedRoute(pathname)) return;

    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (isExcludedRoute(window.location.pathname) || hasActiveEditingSurface()) {
          schedule();
          return;
        }
        router.push("/focus");
      }, FOCUS_IDLE_MS);
    };

    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart", "wheel", "scroll"];
    events.forEach((eventName) => window.addEventListener(eventName, schedule, { passive: true }));
    schedule();

    return () => {
      window.clearTimeout(timer);
      events.forEach((eventName) => window.removeEventListener(eventName, schedule));
    };
  }, [autoEnabled, pathname, router]);

  return null;
}

export function FocusModeShortcut({ variant = "sidebar" }: { variant?: "sidebar" | "mobile" }) {
  const router = useRouter();
  const { autoEnabled, setAutoEnabled } = useFocusModePreference();

  if (variant === "mobile") {
    return (
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <button
          type="button"
          onClick={() => router.push("/focus")}
          className="flex min-h-12 min-w-0 items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.12] px-3 text-left text-amber-100 transition-colors active:bg-amber-500/[0.18]"
        >
          <AppIcon name="radar" tone="amber" size="sm" framed active />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">Focus mode</span>
            <span className="block truncate text-[11px] text-amber-100/60">Tablet dashboard openen</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setAutoEnabled(!autoEnabled)}
          aria-pressed={autoEnabled}
          className={cn(
            "flex min-h-12 min-w-[74px] flex-col items-center justify-center rounded-xl border px-2 text-xs font-bold transition-colors",
            autoEnabled
              ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
              : "border-white/10 bg-white/[0.035] text-slate-400",
          )}
        >
          Auto
          <span className="text-[10px] font-semibold opacity-70">{autoEnabled ? "1m aan" : "1m uit"}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-lg border border-white/10 bg-white/[0.035] p-2">
      <button
        type="button"
        onClick={() => router.push("/focus")}
        className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 text-left text-amber-100 transition-colors hover:bg-amber-500/15"
      >
        <AppIcon name="radar" tone="amber" size="sm" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold">Focus mode</span>
          <span className="block truncate text-[10px] text-amber-100/55">Schermvullend dashboard</span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => setAutoEnabled(!autoEnabled)}
        aria-pressed={autoEnabled}
        className={cn(
          "mt-2 flex h-9 w-full items-center justify-between rounded-lg border px-3 text-xs font-bold transition-colors",
          autoEnabled
            ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
            : "border-white/10 bg-black/15 text-slate-400 hover:bg-white/[0.05]",
        )}
      >
        <span>Auto focus na 1 minuut</span>
        <span className={cn("rounded-md px-2 py-0.5", autoEnabled ? "bg-emerald-400/15" : "bg-white/[0.06]")}>
          {autoEnabled ? "Aan" : "Uit"}
        </span>
      </button>
    </div>
  );
}
