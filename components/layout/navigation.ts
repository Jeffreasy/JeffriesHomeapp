import type { NavigationIconName } from "@/components/layout/NavigationIcon";

export type NavigationSectionId = "start" | "planning" | "persoonlijk" | "relaties" | "bedrijf" | "systeem";
export type NavigationPrefetchPolicy = "automatic" | "intent";

export interface NavigationItem {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: NavigationIconName;
  section: NavigationSectionId;
  mobile: "primary" | "more";
  /**
   * Heavy workspaces are only prefetched after pointer or keyboard intent.
   * This keeps the persistent navigation from eagerly downloading every route.
   */
  prefetch: NavigationPrefetchPolicy;
}

export const NAVIGATION_SECTIONS: Array<{ id: NavigationSectionId; label: string }> = [
  { id: "start", label: "Start" },
  { id: "planning", label: "Planning" },
  { id: "persoonlijk", label: "Persoonlijk" },
  { id: "relaties", label: "Relaties" },
  { id: "bedrijf", label: "Bedrijf" },
  { id: "systeem", label: "Systeem" },
];

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    href: "/",
    label: "Dashboard",
    shortLabel: "Home",
    description: "Dagoverzicht en slimme signalen",
    icon: "home",
    section: "start",
    mobile: "primary",
    prefetch: "automatic",
  },
  {
    href: "/lampen",
    label: "Lampen",
    shortLabel: "Lampen",
    description: "Kamers, scenes en bediening",
    icon: "lights",
    section: "start",
    mobile: "primary",
    prefetch: "automatic",
  },
  {
    href: "/rooster",
    label: "Rooster",
    shortLabel: "Rooster",
    description: "Diensten, uren en planning",
    icon: "roster",
    section: "planning",
    mobile: "primary",
    prefetch: "intent",
  },
  {
    href: "/agenda",
    label: "Agenda",
    shortLabel: "Agenda",
    description: "Afspraken en Google sync",
    icon: "agenda",
    section: "planning",
    mobile: "primary",
    prefetch: "intent",
  },
  {
    href: "/automations",
    label: "Automatisch",
    shortLabel: "Auto",
    description: "Regels, scenes en routines",
    icon: "automations",
    section: "planning",
    mobile: "more",
    prefetch: "intent",
  },
  {
    href: "/finance",
    label: "Finance",
    shortLabel: "Finance",
    description: "Transacties en salaris",
    icon: "finance",
    section: "persoonlijk",
    mobile: "more",
    prefetch: "intent",
  },
  {
    href: "/notities",
    label: "Notities",
    shortLabel: "Notities",
    description: "Capture, lijsten en geheugen",
    icon: "notes",
    section: "persoonlijk",
    mobile: "more",
    prefetch: "intent",
  },
  {
    href: "/habits",
    label: "Habits",
    shortLabel: "Habits",
    description: "Gewoontes, streaks en XP",
    icon: "habit",
    section: "persoonlijk",
    mobile: "more",
    prefetch: "intent",
  },
  {
    href: "/contacten",
    label: "Contacten",
    shortLabel: "Relaties",
    description: "Familie, vrienden, collega's en zakelijk",
    icon: "relations",
    section: "relaties",
    mobile: "more",
    prefetch: "intent",
  },
  {
    href: "/laventecare",
    label: "LaventeCare",
    shortLabel: "Bedrijf",
    description: "Bedrijfsbrein, funnel en delivery",
    icon: "business",
    section: "bedrijf",
    mobile: "more",
    prefetch: "intent",
  },
  {
    href: "/settings",
    label: "Instellingen",
    shortLabel: "Instel.",
    description: "Accounts, koppelingen en beheer",
    icon: "settings",
    section: "systeem",
    mobile: "more",
    prefetch: "intent",
  },
];

export const MOBILE_PRIMARY_ITEMS = NAVIGATION_ITEMS.filter((item) => item.mobile === "primary");
export const MOBILE_MORE_ITEMS = NAVIGATION_ITEMS.filter((item) => item.mobile === "more");

export function isNavigationItemActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getActiveNavigationItem(pathname: string) {
  return NAVIGATION_ITEMS.find((item) => isNavigationItemActive(pathname, item.href));
}
