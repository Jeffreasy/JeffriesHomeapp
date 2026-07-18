"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NavigationIcon } from "@/components/layout/NavigationIcon";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";

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
        <Button
          onClick={() => router.push("/focus")}
          variant="primary"
          fullWidth
          className="min-h-12 justify-start px-3 text-left"
        >
          <NavigationIcon name="radar" tone="accent" size="sm" framed active />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">Focus mode</span>
            <span className="block truncate text-micro opacity-70">Tablet dashboard openen</span>
          </span>
        </Button>
        <Button
          onClick={() => setAutoEnabled(!autoEnabled)}
          aria-pressed={autoEnabled}
          variant={autoEnabled ? "success" : "secondary"}
          className="min-h-12 min-w-[74px] flex-col gap-0 px-2 text-xs"
        >
          Auto
          <span className="text-micro font-semibold opacity-70">{autoEnabled ? "1m aan" : "1m uit"}</span>
        </Button>
      </div>
    );
  }

  return (
    <Surface tone="subtle" radius="sm" padding="xs" className="mb-3">
      <Button
        onClick={() => router.push("/focus")}
        variant="primary"
        fullWidth
        className="justify-start px-3 text-left"
      >
        <NavigationIcon name="radar" tone="accent" size="sm" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold">Focus mode</span>
          <span className="block truncate text-micro opacity-70">Schermvullend dashboard</span>
        </span>
      </Button>
      <Button
        onClick={() => setAutoEnabled(!autoEnabled)}
        aria-pressed={autoEnabled}
        variant={autoEnabled ? "success" : "secondary"}
        size="sm"
        fullWidth
        className="mt-2 justify-between"
      >
        <span>Auto focus na 1 minuut</span>
        <span className="rounded-md bg-current/10 px-2 py-0.5">{autoEnabled ? "Aan" : "Uit"}</span>
      </Button>
    </Surface>
  );
}
