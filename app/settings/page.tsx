"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAction, useMutation as useConvexMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  CalendarClock,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  Eye,
  EyeOff,
  FileJson,
  Gauge,
  Home,
  Hourglass,
  KeyRound,
  Lightbulb,
  Loader2,
  Lock,
  Mail,
  Network,
  PlugZap,
  RadioTower,
  RefreshCw,
  Server,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  StickyNote,
  Target,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDevices } from "@/hooks/useDevices";
import { useRooms, useDeleteRoom } from "@/hooks/useRooms";
import { usePrivacy } from "@/hooks/usePrivacy";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { DeviceRow } from "@/components/settings/DeviceRow";
import { AddDeviceForm } from "@/components/settings/AddDeviceForm";
import { AddRoomForm } from "@/components/settings/AddRoomForm";
import { RoomRow } from "@/components/settings/RoomRow";
import { DeviceDiscoveryPanel } from "@/components/settings/DeviceDiscoveryPanel";
import { type Room } from "@/lib/api";
import { cn } from "@/lib/utils";

type Tone = "amber" | "green" | "rose" | "sky" | "indigo" | "slate";
type SyncTarget = "calendar" | "gmail" | "all";
type PrivacyScope = "finance" | "habits" | "notes" | "email" | "account";
type SyncStatusView = {
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  result: string | null;
};
type TelegramStatusResult = {
  ok: boolean;
  bot: { username: string; first_name: string; id: number };
  ownerConfigured: boolean;
  ownerChatSuffix: string | null;
  webhookSecretConfigured: boolean;
  webhook: {
    configured: boolean;
    urlHost: string | null;
    pendingUpdateCount: number;
    lastErrorDate: number | null;
    lastErrorMessage: string | null;
    maxConnections: number | null;
  };
};

const toneClasses: Record<Tone, { border: string; surface: string; icon: string; text: string }> = {
  amber: {
    border: "border-amber-500/25",
    surface: "bg-amber-500/10",
    icon: "text-amber-300",
    text: "text-amber-200",
  },
  green: {
    border: "border-emerald-500/20",
    surface: "bg-emerald-500/10",
    icon: "text-emerald-300",
    text: "text-emerald-200",
  },
  rose: {
    border: "border-rose-500/20",
    surface: "bg-rose-500/10",
    icon: "text-rose-300",
    text: "text-rose-200",
  },
  sky: {
    border: "border-sky-500/20",
    surface: "bg-sky-500/10",
    icon: "text-sky-300",
    text: "text-sky-200",
  },
  indigo: {
    border: "border-indigo-500/20",
    surface: "bg-indigo-500/10",
    icon: "text-indigo-300",
    text: "text-indigo-200",
  },
  slate: {
    border: "border-white/10",
    surface: "bg-white/[0.04]",
    icon: "text-slate-300",
    text: "text-slate-200",
  },
};

const routeTiles: Array<{ href: string; label: string; meta: string; icon: LucideIcon; tone: Tone }> = [
  { href: "/lampen", label: "Verlichting", meta: "Lampen bedienen", icon: Lightbulb, tone: "amber" },
  { href: "/rooster", label: "Rooster", meta: "Diensten en agenda", icon: CalendarClock, tone: "sky" },
  { href: "/finance", label: "Finance", meta: "Transacties", icon: Database, tone: "green" },
  { href: "/notities", label: "Notities", meta: "Knowledge base", icon: StickyNote, tone: "indigo" },
  { href: "/habits", label: "Habits", meta: "Privacygevoelig", icon: Target, tone: "rose" },
];

function formatDateTime(iso?: string | null) {
  if (!iso) return "Nog niet gesynct";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Onbekend";
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatHost(value?: string) {
  if (!value) return "Niet ingesteld";
  try {
    return new URL(value).host;
  } catch {
    return value;
  }
}

function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

export default function SettingsPage() {
  const { data: devices = [], isLoading: devicesLoading } = useDevices();
  const { data: rooms = [], isLoading: roomsLoading } = useRooms();
  const overview = useQuery(api.settings.getOverview);
  const { mutate: deleteRoom, isPending: deletingRoom } = useDeleteRoom();
  const { openConfirm } = useConfirm();
  const { success, error: toastError } = useToast();
  const { user, isLoaded: userLoaded } = useUser();
  const { hidden: privacyOn, toggle: togglePrivacy, mask } = usePrivacy();
  const syncSchedule = useAction(api.actions.syncSchedule.syncNow);
  const syncPersonal = useAction(api.actions.syncPersonalEvents.syncPersonalNow);
  const syncGmail = useAction(api.actions.syncGmail.syncNow);
  const confirmPendingAction = useAction(api.ai.grok.pendingActions.confirmForUser);
  const telegramStatusAction = useAction(api.telegram.bot.status);
  const cancelPendingAction = useConvexMutation(api.ai.grok.pendingActions.cancelForUser);
  const updatePrivacySettings = useConvexMutation(api.privacySettings.updateForUser);
  const pendingActions = useQuery(api.ai.grok.pendingActions.listForUser, { limit: 8 }) ?? [];
  const auditLogs = useQuery(api.auditLogs.listForUser, { limit: 8 }) ?? [];
  const grokCapabilities = useQuery(api.ai.grok.capabilities.listForUser);
  const privacySettings = useQuery(api.privacySettings.getForUser);

  const [syncing, setSyncing] = useState<SyncTarget | null>(null);
  const [pendingBusyId, setPendingBusyId] = useState<Id<"aiPendingActions"> | null>(null);
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatusResult | null>(null);
  const [telegramChecking, setTelegramChecking] = useState(false);
  const [backupRequested, setBackupRequested] = useState(false);
  const backupData = useQuery(api.backup.exportForUser, backupRequested ? {} : "skip");

  const onlineDevices = devices.filter((device) => device.status === "online").length;
  const activeDevices = devices.filter((device) => device.current_state?.on).length;
  const overviewDevices = overview?.devices ?? {
    total: devices.length,
    online: onlineDevices,
    offline: Math.max(0, devices.length - onlineDevices),
    on: activeDevices,
  };
  const overviewRooms = overview?.rooms ?? {
    total: rooms.length,
    unassignedDevices: devices.filter((device) => !device.room_id).length,
  };
  const deviceHealth =
    overviewDevices.total === 0
      ? 0
      : Math.round((overviewDevices.online / overviewDevices.total) * 100);
  const isLoading = devicesLoading || roomsLoading || overview === undefined;
  const accountName = user?.fullName ?? overview?.account.name ?? "Jeffries Home";
  const accountEmail = user?.primaryEmailAddress?.emailAddress ?? overview?.account.email ?? "Clerk account";
  const convexHost = formatHost(process.env.NEXT_PUBLIC_CONVEX_URL);
  const localApiHost = formatHost(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1");
  const syncMap = (overview?.sync ?? {}) as Record<string, SyncStatusView | undefined>;

  const roomRows = useMemo(() => {
    return rooms.map((room) => ({
      room,
      devices: devices.filter((device) => device.room_id === room.id),
    }));
  }, [devices, rooms]);

  useEffect(() => {
    if (!backupRequested || !backupData) return;
    const json = JSON.stringify(backupData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `jeffries-homeapp-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setBackupRequested(false);
    success("Backup export klaargezet");
  }, [backupData, backupRequested, success]);

  const runSync = async (target: SyncTarget, task: () => Promise<void>, doneMessage: string) => {
    setSyncing(target);
    try {
      await task();
      success(doneMessage);
    } catch (err) {
      const message = err instanceof Error ? err.message : "onbekende fout";
      toastError(`Sync mislukt: ${message}`);
    } finally {
      setSyncing(null);
    }
  };

  const handleCalendarSync = () =>
    runSync(
      "calendar",
      async () => {
        const [scheduleResult, personalResult] = await Promise.allSettled([syncSchedule({}), syncPersonal({})]);
        if (scheduleResult.status === "rejected" && personalResult.status === "rejected") {
          throw new Error("rooster en agenda konden niet worden opgehaald");
        }
        if (scheduleResult.status === "rejected" || personalResult.status === "rejected") {
          success("Gedeeltelijke sync: een agenda bron faalde.");
        }
      },
      "Rooster en agenda gesynchroniseerd"
    );

  const handleGmailSync = () =>
    runSync(
      "gmail",
      async () => {
        await syncGmail({});
      },
      "Gmail metadata gesynchroniseerd"
    );

  const handleAllSync = () =>
    runSync(
      "all",
      async () => {
        const results = await Promise.allSettled([syncSchedule({}), syncPersonal({}), syncGmail({})]);
        if (results.every((result) => result.status === "rejected")) {
          throw new Error("geen enkele bron kon worden opgehaald");
        }
      },
      "Belangrijkste databronnen gesynchroniseerd"
    );

  const handleDeleteRoom = async (room: Room) => {
    const lampenCount = devices.filter((device) => device.room_id === room.id).length;
    const confirmed = await openConfirm({
      title: "Kamer verwijderen",
      message: `Kamer '${room.name}' verwijderen?${lampenCount > 0 ? ` ${plural(lampenCount, "lamp", "lampen")} wordt ontkoppeld.` : ""}`,
      confirmLabel: "Verwijderen",
      variant: "danger",
    });
    if (!confirmed) return;

    deleteRoom(room.id, {
      onSuccess: (result) => {
        const detached = result?.detachedDevices ?? 0;
        success(detached > 0 ? `Kamer verwijderd, ${plural(detached, "lamp", "lampen")} ontkoppeld` : "Kamer verwijderd");
      },
      onError: (err) => toastError(err instanceof Error ? err.message : "Verwijderen mislukt"),
    });
  };

  const handleConfirmPending = async (id: Id<"aiPendingActions">) => {
    setPendingBusyId(id);
    try {
      const result = await confirmPendingAction({ id }) as { summary?: string };
      success(result.summary ?? "Actie uitgevoerd");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Bevestigen mislukt");
    } finally {
      setPendingBusyId(null);
    }
  };

  const handleCancelPending = async (id: Id<"aiPendingActions">) => {
    setPendingBusyId(id);
    try {
      await cancelPendingAction({ id });
      success("Actie geannuleerd");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Annuleren mislukt");
    } finally {
      setPendingBusyId(null);
    }
  };

  const handleTelegramCheck = async () => {
    setTelegramChecking(true);
    try {
      setTelegramStatus(await telegramStatusAction({}) as TelegramStatusResult);
      success("Telegram status bijgewerkt");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Telegram check mislukt");
    } finally {
      setTelegramChecking(false);
    }
  };

  const togglePrivacyScope = async (scope: PrivacyScope) => {
    const current = privacySettings?.[scope] ?? true;
    try {
      await updatePrivacySettings({ [scope]: !current } as Partial<Record<PrivacyScope, boolean>>);
      success("Privacy voorkeur bijgewerkt");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Privacy voorkeur opslaan mislukt");
    }
  };

  if (overview === null) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] px-4 py-12 text-slate-100">
        <div className="mx-auto max-w-lg rounded-lg border border-white/10 bg-white/[0.035] p-6 text-center">
          <ShieldCheck size={34} className="mx-auto text-amber-300" />
          <h1 className="mt-4 text-xl font-bold text-white">Instellingen vergrendeld</h1>
          <p className="mt-2 text-sm text-slate-500">Log in om je lokale Homeapp configuratie te beheren.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-28 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10">
              <Settings size={20} className="text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-slate-500">System cockpit</p>
              <h1 className="mt-1 truncate text-2xl font-bold text-white">Instellingen</h1>
              <p className="mt-1 text-sm text-slate-500">
                {isLoading
                  ? "Configuratie laden"
                  : `${plural(overviewDevices.total, "lamp", "lampen")} - ${plural(overviewRooms.total, "kamer", "kamers")} - Convex live`}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={togglePrivacy}
              title={privacyOn ? "Details tonen" : "Details verbergen"}
              aria-label={privacyOn ? "Details tonen" : "Details verbergen"}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
                privacyOn
                  ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-200"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
              )}
            >
              {privacyOn ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className="hidden sm:inline">{privacyOn ? "Verborgen" : "Zichtbaar"}</span>
            </button>
            <button
              type="button"
              onClick={handleAllSync}
              disabled={syncing !== null}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={16} className={syncing === "all" ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Sync</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Panel className="overflow-hidden p-0">
            <div className="border-b border-white/6 px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Overzicht</p>
                  <h2 className="mt-1 text-xl font-bold text-white">Homeapp runtime</h2>
                  <p className="mt-1 text-sm text-slate-500">{convexHost}</p>
                </div>
                <StatusPill ok={Boolean(overview?.integrations.convex)} label="Convex" />
              </div>
            </div>
            <div className="grid gap-px bg-white/[0.06] sm:grid-cols-2 xl:grid-cols-4">
              <StatusMetric
                icon={Lightbulb}
                label="Lampen"
                value={overviewDevices.total === 0 ? "Geen" : String(overviewDevices.total)}
                sub={`${overviewDevices.online}/${overviewDevices.total} online`}
                tone={overviewDevices.offline > 0 ? "amber" : overviewDevices.total > 0 ? "green" : "slate"}
              />
              <StatusMetric
                icon={Gauge}
                label="Gezondheid"
                value={overviewDevices.total === 0 ? "-" : `${deviceHealth}%`}
                sub={`${overviewDevices.on} actief, ${overviewDevices.offline} offline`}
                tone={deviceHealth === 100 ? "green" : overviewDevices.total > 0 ? "amber" : "slate"}
              />
              <StatusMetric
                icon={PlugZap}
                label="Automations"
                value={`${overview?.automations.active ?? 0}/${overview?.automations.total ?? 0}`}
                sub="actief versus totaal"
                tone={(overview?.automations.active ?? 0) > 0 ? "sky" : "slate"}
              />
              <StatusMetric
                icon={Network}
                label="Command queue"
                value={String(overview?.commands.pending ?? 0)}
                sub={`${overview?.commands.failed ?? 0} mislukt`}
                tone={(overview?.commands.failed ?? 0) > 0 ? "rose" : (overview?.commands.pending ?? 0) > 0 ? "amber" : "green"}
              />
            </div>
          </Panel>

          <Panel>
            <SectionHeader icon={Lock} label="Toegang" title="Account en privacy" sub={userLoaded ? "actief" : "laden"} />
            <div className="space-y-3">
              <StatusRow icon={ShieldCheck} label="Gebruiker" value={privacyOn ? "Afgeschermd" : accountName} tone="green" />
              <StatusRow icon={KeyRound} label="Clerk" value={privacyOn ? mask(accountEmail) : accountEmail} tone="indigo" />
              <button
                type="button"
                onClick={togglePrivacy}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                  privacyOn
                    ? "border-indigo-500/25 bg-indigo-500/10 text-indigo-100"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  {privacyOn ? <EyeOff size={16} /> : <Eye size={16} />}
                  <span className="text-sm font-semibold">{privacyOn ? "Privacy aan" : "Privacy uit"}</span>
                </span>
                <ArrowRight size={15} className="shrink-0 text-slate-500" />
              </button>
            </div>
          </Panel>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={CalendarClock}
            label="Rooster"
            value={`${overview?.schedule.upcoming ?? 0}`}
            meta={`${overview?.schedule.total ?? 0} diensten - ${formatDateTime(overview?.schedule.importedAt)}`}
            tone="sky"
          />
          <MetricCard
            icon={Mail}
            label="Gmail"
            value={`${overview?.email.unread ?? 0}`}
            meta={`${overview?.email.total ?? 0} emails - ${formatDateTime(overview?.email.lastFullSync)}`}
            tone={(overview?.email.unread ?? 0) > 0 ? "amber" : "green"}
          />
          <MetricCard
            icon={StickyNote}
            label="Persoonlijke data"
            value={`${(overview?.data.notes ?? 0) + (overview?.data.activeHabits ?? 0)}`}
            meta={`${overview?.data.notes ?? 0} notities - ${overview?.data.activeHabits ?? 0} actieve habits`}
            tone="indigo"
          />
          <MetricCard
            icon={Home}
            label="Kamers"
            value={`${overviewRooms.total}`}
            meta={`${overviewRooms.unassignedDevices} lampen zonder kamer`}
            tone={overviewRooms.unassignedDevices > 0 ? "amber" : "slate"}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Panel>
            <SectionHeader
              icon={RefreshCw}
              label="Sync"
              title="Databronnen"
              sub={syncing ? "bezig" : "gereed"}
              action={
                <button
                  type="button"
                  onClick={handleAllSync}
                  disabled={syncing !== null}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15 disabled:opacity-50"
                >
                  <RefreshCw size={15} className={syncing === "all" ? "animate-spin" : ""} />
                  Alles
                </button>
              }
            />
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <SyncButton
                icon={CalendarClock}
                title="Agenda"
                meta={`${overview?.schedule.upcoming ?? 0} diensten, ${overview?.personalEvents.upcoming ?? 0} afspraken`}
                disabled={syncing !== null}
                loading={syncing === "calendar"}
                onClick={handleCalendarSync}
              />
              <SyncButton
                icon={Mail}
                title="Gmail"
                meta={`${overview?.email.total ?? 0} metadata records`}
                disabled={syncing !== null}
                loading={syncing === "gmail"}
                onClick={handleGmailSync}
              />
              <SyncButton
                icon={Cloud}
                title="Alles"
                meta="Agenda, rooster en mail"
                disabled={syncing !== null}
                loading={syncing === "all"}
                onClick={handleAllSync}
              />
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <SyncStatusRow label="Rooster" status={syncMap.schedule} />
              <SyncStatusRow label="Persoonlijk" status={syncMap.personal} />
              <SyncStatusRow label="Gmail" status={syncMap.gmail} />
            </div>
          </Panel>

          <Panel>
            <SectionHeader icon={Server} label="Endpoints" title="Runtime" sub={localApiHost} />
            <div className="space-y-3">
              <StatusRow icon={Cloud} label="Convex" value={convexHost} tone="green" />
              <StatusRow
                icon={Server}
                label="Legacy HTTP"
                value={overview?.integrations.legacyHttpSecret ? "Secret ingesteld" : "Niet actief"}
                tone={overview?.integrations.legacyHttpSecret ? "sky" : "slate"}
              />
              <StatusRow
                icon={Smartphone}
                label="Lokale bridge"
                value={overview?.integrations.localBridge ? "Beveiligd" : "Secret ontbreekt"}
                tone={overview?.integrations.localBridge ? "green" : "rose"}
              />
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Panel>
            <SectionHeader
              icon={Hourglass}
              label="AI safety"
              title="Openstaande bevestigingen"
              sub={`${pendingActions.length} actie(s)`}
            />
            <div className="mt-4 space-y-2">
              {pendingActions.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="Geen openstaande Grok-acties" />
              ) : (
                pendingActions.map((action) => (
                  <div key={action._id} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase text-amber-200">{action.code}</p>
                        <p className="mt-1 text-sm font-semibold text-white">{action.summary}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {action.agentId} - {action.toolName} - verloopt {formatDateTime(action.expiresAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCancelPending(action._id)}
                          disabled={pendingBusyId === action._id}
                          className="h-9 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-slate-300 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
                        >
                          Annuleer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmPending(action._id)}
                          disabled={pendingBusyId === action._id}
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 text-xs font-bold text-emerald-200 transition-colors hover:bg-emerald-500/15 disabled:opacity-50"
                        >
                          {pendingBusyId === action._id && <Loader2 size={13} className="animate-spin" />}
                          Uitvoeren
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel>
            <SectionHeader
              icon={RadioTower}
              label="Bridge"
              title="Lokale bridge"
              sub={overview?.bridge?.lastSeenAt ? formatDateTime(overview.bridge.lastSeenAt) : "geen heartbeat"}
            />
            <div className="mt-4 space-y-3">
              <StatusRow
                icon={Smartphone}
                label="Status"
                value={overview?.bridge ? (overview.bridge.online ? overview.bridge.status : "offline") : "Geen heartbeat"}
                tone={overview?.bridge?.online ? "green" : "rose"}
              />
              <StatusRow
                icon={Activity}
                label="Commands"
                value={`${overview?.bridge?.commandsDone ?? 0} uitgevoerd / ${overview?.bridge?.commandsFailed ?? 0} mislukt`}
                tone={(overview?.bridge?.commandsFailed ?? 0) > 0 ? "amber" : "slate"}
              />
              <StatusRow
                icon={AlertTriangle}
                label="Laatste fout"
                value={overview?.bridge?.lastError ?? "Geen fout gemeld"}
                tone={overview?.bridge?.lastError ? "rose" : "green"}
              />
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <ErrorBoundary>
            <Panel>
              <SectionHeader
                icon={Lightbulb}
                label="Smart home"
                title="Lampen beheren"
                sub={devicesLoading ? "laden" : plural(devices.length, "lamp", "lampen")}
                action={
                  <Link
                    href="/lampen"
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.06]"
                  >
                    Openen
                    <ArrowRight size={14} />
                  </Link>
                }
              />
              <div className="mt-4 space-y-2">
                {devicesLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
                  ))
                ) : devices.length > 0 ? (
                  devices.map((device) => <DeviceRow key={device.id} device={device} rooms={rooms} />)
                ) : (
                  <EmptyState icon={Lightbulb} title="Geen lampen gekoppeld" />
                )}
                <AddDeviceForm rooms={rooms} />
                <DeviceDiscoveryPanel existingDevices={devices} />
              </div>
            </Panel>
          </ErrorBoundary>

          <ErrorBoundary>
            <Panel>
              <SectionHeader
                icon={Home}
                label="Indeling"
                title="Kamers"
                sub={roomsLoading ? "laden" : plural(rooms.length, "kamer", "kamers")}
              />
              <div className="mt-4 space-y-2">
                {roomsLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
                  ))
                ) : roomRows.length > 0 ? (
                  roomRows.map(({ room, devices: roomDevices }) => (
                    <RoomRow
                      key={room.id}
                      room={room}
                      devices={roomDevices}
                      deleting={deletingRoom}
                      onDelete={handleDeleteRoom}
                    />
                  ))
                ) : (
                  <EmptyState icon={Home} title="Nog geen kamers" />
                )}
                <AddRoomForm />
              </div>
            </Panel>
          </ErrorBoundary>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Panel>
            <SectionHeader icon={SlidersHorizontal} label="Integraties" title="Security status" sub="booleans, geen secrets" />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <IntegrationRow icon={Bot} label="Telegram bot" ok={overview?.integrations.telegramBot} />
              <IntegrationRow icon={ShieldCheck} label="Telegram owner" ok={overview?.integrations.telegramOwner} />
              <IntegrationRow icon={Lock} label="Webhook secret" ok={overview?.integrations.telegramWebhookSecret} />
              <IntegrationRow icon={Bot} label="Grok" ok={overview?.integrations.grok} />
              <IntegrationRow icon={Cloud} label="Google OAuth" ok={overview?.integrations.googleOAuth} />
              <IntegrationRow icon={Activity} label="Todoist" ok={overview?.integrations.todoist} />
            </div>
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">Telegram beheer</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {telegramStatus
                      ? `@${telegramStatus.bot.username} - webhook ${telegramStatus.webhook.configured ? "actief" : "uit"}`
                      : "Bot en webhook live controleren"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTelegramCheck}
                  disabled={telegramChecking}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 text-sm font-semibold text-sky-200 transition-colors hover:bg-sky-500/15 disabled:opacity-50"
                >
                  {telegramChecking ? <Loader2 size={15} className="animate-spin" /> : <RadioTower size={15} />}
                  Check
                </button>
              </div>
              {telegramStatus && (
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <MiniInfo label="Owner" value={telegramStatus.ownerConfigured ? `*${telegramStatus.ownerChatSuffix}` : "Ontbreekt"} />
                  <MiniInfo label="Webhook host" value={telegramStatus.webhook.urlHost ?? "Geen webhook"} />
                  <MiniInfo label="Pending updates" value={String(telegramStatus.webhook.pendingUpdateCount)} />
                </div>
              )}
            </div>
            {grokCapabilities && (
              <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-bold text-white">Grok capabilities</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {grokCapabilities.agents.map((agent) => (
                    <div key={agent.id} className="rounded-lg border border-white/10 bg-black/10 px-3 py-3">
                      <p className="truncate text-sm font-semibold text-slate-200">
                        {agent.emoji} {agent.naam}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {agent.tools} tools - {agent.mutatingTools} mutaties - {agent.confirmationTools} met bevestiging
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          <Panel>
            <SectionHeader icon={ArrowRight} label="Navigatie" title="Werkgebieden" />
            <div className="mt-4 space-y-2">
              {routeTiles.map((tile) => (
                <RouteTile key={tile.href} {...tile} />
              ))}
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Panel>
            <SectionHeader icon={ShieldCheck} label="Privacy" title="Privacy center" sub="centrale voorkeuren" />
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {(["finance", "habits", "notes", "email", "account"] as const satisfies readonly PrivacyScope[]).map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => togglePrivacyScope(scope)}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-left transition-colors",
                    privacySettings?.[scope] ?? true
                      ? "border-indigo-500/25 bg-indigo-500/10 text-indigo-100"
                      : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]",
                  )}
                >
                  <span className="block text-xs font-bold uppercase">{scope}</span>
                  <span className="mt-1 block text-sm font-semibold">
                    {(privacySettings?.[scope] ?? true) ? "Maskeren" : "Zichtbaar"}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-bold text-white">Backup/export</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Exporteert je eigen Convex-data als JSON: kamers, lampen, automations, rooster, notities, habits en finance.
              </p>
              <button
                type="button"
                onClick={() => setBackupRequested(true)}
                disabled={backupRequested}
                className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15 disabled:opacity-50"
              >
                {backupRequested ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                JSON export
              </button>
            </div>
          </Panel>

          <Panel>
            <SectionHeader icon={FileJson} label="Audit" title="Laatste acties" sub={`${auditLogs.length} zichtbaar`} />
            <div className="mt-4 space-y-2">
              {auditLogs.length === 0 ? (
                <EmptyState icon={FileJson} title="Nog geen auditregels" />
              ) : (
                auditLogs.map((log) => (
                  <div key={log._id} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-semibold text-slate-200">{log.summary}</p>
                      <StatusPill ok={log.status === "success" || log.status === "confirmed"} label={log.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {log.actor} - {log.action} - {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </section>

        {(overview?.integrations.telegramBot && !overview.integrations.telegramOwner) ||
        (overview?.integrations.telegramBot && !overview.integrations.telegramWebhookSecret) ? (
          <div className="flex items-start gap-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-4">
            <TriangleAlert size={18} className="mt-0.5 shrink-0 text-rose-300" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-rose-200">Telegram is niet volledig dichtgezet</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Zet owner chat id en webhook secret in Convex env voordat Telegram/Grok write-flows actief blijven.
              </p>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-lg border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl sm:p-5", className)}
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({
  icon: Icon,
  label,
  title,
  sub,
  action,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
          <Icon size={16} className="text-amber-300" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
          <h2 className="truncate text-base font-bold text-white">{title}</h2>
          {sub && <p className="mt-0.5 truncate text-xs text-slate-500">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function StatusMetric({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  tone: Tone;
}) {
  const classes = toneClasses[tone];

  return (
    <div className="min-h-[128px] min-w-0 bg-[#0f0f16]/95 p-4">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", classes.border, classes.surface)}>
        <Icon size={16} className={classes.icon} />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className={cn("mt-1 truncate text-base font-bold", classes.text)}>{value}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  meta,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  meta: string;
  tone: Tone;
}) {
  const classes = toneClasses[tone];

  return (
    <div className={cn("rounded-lg border bg-white/[0.035] p-4", classes.border)}>
      <div className="flex items-start gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", classes.surface)}>
          <Icon size={18} className={classes.icon} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
          <p className={cn("mt-2 truncate text-2xl font-bold", classes.text)}>{value}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{meta}</p>
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: Tone;
}) {
  const classes = toneClasses[tone];

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3">
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", classes.surface)}>
        <Icon size={15} className={classes.icon} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-slate-200">{value}</p>
      </div>
    </div>
  );
}

function syncTone(status?: SyncStatusView): Tone {
  if (!status) return "slate";
  if (status.status === "failed") return "rose";
  if (status.status === "running") return "amber";
  return "green";
}

function syncTimestamp(status?: SyncStatusView) {
  if (!status) return "Nog geen run";
  return status.status === "failed"
    ? formatDateTime(status.lastErrorAt ?? status.finishedAt)
    : formatDateTime(status.lastSuccessAt ?? status.finishedAt ?? status.startedAt);
}

function SyncStatusRow({ label, status }: { label: string; status?: SyncStatusView }) {
  const tone = syncTone(status);
  const classes = toneClasses[tone];
  const value = status?.status === "running"
    ? "Bezig"
    : status?.status === "failed"
      ? "Mislukt"
      : status?.status === "success"
        ? "Succes"
        : "Geen run";

  return (
    <div className="flex min-h-20 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-3">
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", classes.surface)}>
        {status?.status === "running" ? (
          <Loader2 size={14} className={cn("animate-spin", classes.icon)} />
        ) : (
          <Activity size={14} className={classes.icon} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-200">{label}</p>
          <span className={cn("text-xs font-bold", classes.text)}>{value}</span>
        </div>
        <p className="mt-1 truncate text-xs text-slate-500">{status?.lastError ?? syncTimestamp(status)}</p>
      </div>
    </div>
  );
}

function SyncButton({
  icon: Icon,
  title,
  meta,
  loading,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  meta: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-24 items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-55"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300">
        {loading ? <Loader2 size={17} className="animate-spin" /> : <Icon size={17} />}
      </div>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-white">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{meta}</span>
      </span>
    </button>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-black/10 px-3 py-2">
      <p className="truncate text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-slate-200">{value}</p>
    </div>
  );
}

function IntegrationRow({ icon: Icon, label, ok }: { icon: LucideIcon; label: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", ok ? "bg-emerald-500/10" : "bg-rose-500/10")}>
          <Icon size={15} className={ok ? "text-emerald-300" : "text-rose-300"} />
        </div>
        <span className="truncate text-sm font-semibold text-slate-300">{label}</span>
      </div>
      <StatusPill ok={Boolean(ok)} label={ok ? "OK" : "Ontbreekt"} />
    </div>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border px-2 text-xs font-bold",
        ok
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
          : "border-rose-500/20 bg-rose-500/10 text-rose-200"
      )}
    >
      {ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
      {label}
    </span>
  );
}

function RouteTile({ href, label, meta, icon: Icon, tone }: { href: string; label: string; meta: string; icon: LucideIcon; tone: Tone }) {
  const classes = toneClasses[tone];

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 transition-colors hover:bg-white/[0.06]"
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", classes.surface)}>
        <Icon size={16} className={classes.icon} />
      </div>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-200">{label}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">{meta}</span>
      </span>
      <ArrowRight size={14} className="shrink-0 text-slate-600" />
    </Link>
  );
}

function EmptyState({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
      <Icon size={28} className="mx-auto text-slate-700" />
      <p className="mt-3 text-sm font-semibold text-slate-400">{title}</p>
    </div>
  );
}
