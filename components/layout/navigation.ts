import {
  Calendar,
  CalendarClock,
  Home,
  Landmark,
  Lightbulb,
  Settings,
  StickyNote,
  Target,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type NavigationSectionId = "start" | "planning" | "persoonlijk" | "systeem";

export interface NavigationItem {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  section: NavigationSectionId;
  mobile: "primary" | "more";
}

export const NAVIGATION_SECTIONS: Array<{ id: NavigationSectionId; label: string }> = [
  { id: "start", label: "Start" },
  { id: "planning", label: "Planning" },
  { id: "persoonlijk", label: "Persoonlijk" },
  { id: "systeem", label: "Systeem" },
];

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    href: "/",
    label: "Dashboard",
    shortLabel: "Home",
    description: "Dagoverzicht en slimme signalen",
    icon: Home,
    section: "start",
    mobile: "primary",
  },
  {
    href: "/lampen",
    label: "Lampen",
    shortLabel: "Lampen",
    description: "Kamers, scenes en bediening",
    icon: Lightbulb,
    section: "start",
    mobile: "primary",
  },
  {
    href: "/rooster",
    label: "Rooster",
    shortLabel: "Rooster",
    description: "Diensten, uren en planning",
    icon: Calendar,
    section: "planning",
    mobile: "primary",
  },
  {
    href: "/agenda",
    label: "Agenda",
    shortLabel: "Agenda",
    description: "Afspraken en Google sync",
    icon: CalendarClock,
    section: "planning",
    mobile: "primary",
  },
  {
    href: "/automations",
    label: "Automatisch",
    shortLabel: "Auto",
    description: "Regels, scenes en routines",
    icon: Zap,
    section: "planning",
    mobile: "more",
  },
  {
    href: "/finance",
    label: "Finance",
    shortLabel: "Finance",
    description: "Transacties en salaris",
    icon: Landmark,
    section: "persoonlijk",
    mobile: "more",
  },
  {
    href: "/notities",
    label: "Notities",
    shortLabel: "Notities",
    description: "Capture, lijsten en geheugen",
    icon: StickyNote,
    section: "persoonlijk",
    mobile: "more",
  },
  {
    href: "/habits",
    label: "Habits",
    shortLabel: "Habits",
    description: "Gewoontes, streaks en XP",
    icon: Target,
    section: "persoonlijk",
    mobile: "more",
  },
  {
    href: "/settings",
    label: "Instellingen",
    shortLabel: "Instel.",
    description: "Accounts, koppelingen en beheer",
    icon: Settings,
    section: "systeem",
    mobile: "more",
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
