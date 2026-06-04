"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Cloud,
  Download,
  Eye,
  EyeOff,
  FileJson,
  Home,
  KeyRound,
  Lightbulb,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Server,
  Settings,
  ShieldCheck,
  Smartphone,
  StickyNote,
  TriangleAlert,
} from "lucide-react";

import { useDevices } from "@/hooks/useDevices";
import { useRooms, useDeleteRoom } from "@/hooks/useRooms";
import { usePrivacy } from "@/hooks/usePrivacy";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { DeviceRow } from "@/components/settings/DeviceRow";
import { AddDeviceForm } from "@/components/settings/AddDeviceForm";
import { AddRoomForm } from "@/components/settings/AddRoomForm";
import { RoomRow } from "@/components/settings/RoomRow";
import { DeviceDiscoveryPanel } from "@/components/settings/DeviceDiscoveryPanel";
import { type Room, settingsApi, syncApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

import {
  formatDateTime,
  plural,
  routeTiles,
  type AiDiagnosticsResult,
  type PrivacyScope,
  type SyncStatusView,
  type SyncTarget,
  type TelegramStatusResult,
} from "@/components/settings/SettingsUtils";
import { EmptyState, MetricCard, Panel, RouteTile, SectionHeader, StatusPill, StatusRow } from "@/components/settings/SettingsCards";
import { SettingsRuntime, SettingsPendingActions, SettingsBridge } from "@/components/settings/SettingsRuntime";
import { SettingsIntegrations } from "@/components/settings/SettingsIntegrations";
import { SettingsSync } from "@/components/settings/SettingsSync";

export default function SettingsPage() {
  const { data: devices = [], isLoading: devicesLoading } = useDevices();
  const { data: rooms = [], isLoading: roomsLoading } = useRooms();
  const { mutate: deleteRoom, isPending: deletingRoom } = useDeleteRoom();
  const { openConfirm } = useConfirm();
  const { success, error: toastError } = useToast();
  const { user, isLoaded: userLoaded } = useUser();
  const { hidden: privacyOn, toggle: togglePrivacy, mask } = usePrivacy("account");

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["settings-overview"],
    queryFn: () => settingsApi.overview(),
    refetchInterval: 10000,
  });

  const { data: syncStatus } = useQuery({
    queryKey: ["sync-status", user?.id],
    queryFn: () => syncApi.status(user?.id),
    refetchInterval: 10000,
  });

  const confirmPendingAction = async (_args: Record<string, unknown>) => ({ summary: "Functie nog niet gemigreerd" });
  const telegramStatusAction = async () => settingsApi.telegramStatus();
  const cancelPendingAction = async (_args: Record<string, unknown>) => ({});
  const updatePrivacySettings = async (_args: Record<string, unknown>) => ({});
  const pendingActions: any[] = [];
  const auditLogs: any[] = [];
  const privacySettings = undefined as any;

  const [syncing, setSyncing] = useState<SyncTarget | null>(null);
  const [pendingBusyId, setPendingBusyId] = useState<string | null>(null);
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatusResult | null>(null);
  const [telegramChecking, setTelegramChecking] = useState(false);
  const [aiDiagnostics, setAiDiagnostics] = useState<AiDiagnosticsResult | null>(null);
  const [aiChecking, setAiChecking] = useState(false);
  const [backupRequested, setBackupRequested] = useState(false);
  const backupData = undefined as any; // TODO: Move backup to Go API

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
  const isLoading = devicesLoading || roomsLoading || overviewLoading;
  const accountName = user?.fullName ?? overview?.account?.name ?? "Jeffries Home";
  const accountEmail = user?.primaryEmailAddress?.emailAddress ?? overview?.account?.email ?? "Clerk account";
  const localApiHost = "Next.js proxy -> Render backend";
  const syncMap = (syncStatus ?? {}) as Record<string, SyncStatusView | undefined>;
  const bridgeQueueActive = Boolean(overview?.integrations.queueLightCommands);
  const hasStartBackgroundEngineFlag =
    overview?.integrations && Object.prototype.hasOwnProperty.call(overview.integrations, "startBackgroundEngine");
  const telegramNeedsAttention = Boolean(
    overview?.integrations.telegramBot &&
      (!overview.integrations.telegramOwner ||
        (hasStartBackgroundEngineFlag && !overview.integrations.startBackgroundEngine))
  );

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
        if (!user?.id) throw new Error("Niet ingelogd");
        await syncApi.calendar(user.id);
      },
      "Rooster en agenda gesynchroniseerd"
    );

  const handleGmailSync = () =>
    runSync(
      "gmail",
      async () => {
        if (!user?.id) throw new Error("Niet ingelogd");
        await syncApi.gmail(user.id);
      },
      "Gmail metadata gesynchroniseerd"
    );

  const handleAllSync = () =>
    runSync(
      "all",
      async () => {
        if (!user?.id) throw new Error("Niet ingelogd");
        await Promise.allSettled([syncApi.calendar(user.id), syncApi.gmail(user.id)]);
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
      onSuccess: () => {
        success("Kamer verwijderd");
      },
      onError: (err) => toastError(err instanceof Error ? err.message : "Verwijderen mislukt"),
    });
  };

  const handleConfirmPending = async (id: string) => {
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

  const handleCancelPending = async (id: string) => {
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
      const result = await telegramStatusAction() as unknown as TelegramStatusResult;
      setTelegramStatus(result);
      success("Telegram status bijgewerkt");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Telegram check mislukt");
    } finally {
      setTelegramChecking(false);
    }
  };

  const handleAICheck = async () => {
    setAiChecking(true);
    try {
      const result = await settingsApi.aiDiagnostics() as unknown as AiDiagnosticsResult;
      setAiDiagnostics(result);
      success(result.ok ? "AI diagnose groen" : "AI diagnose heeft aandachtspunten");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "AI diagnose mislukt");
    } finally {
      setAiChecking(false);
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
      <div className="px-4 py-12 text-slate-100">
        <div className="mx-auto max-w-lg rounded-lg border border-white/10 bg-white/[0.035] p-6 text-center">
          <ShieldCheck size={34} className="mx-auto text-amber-300" />
          <h1 className="mt-4 text-xl font-bold text-white">Instellingen vergrendeld</h1>
          <p className="mt-2 text-sm text-slate-500">Log in om je lokale Homeapp configuratie te beheren.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 sm:h-11 sm:w-11">
              <Settings size={19} className="text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-slate-500">System cockpit</p>
              <h1 className="mt-0.5 truncate text-xl font-bold text-white sm:mt-1 sm:text-2xl">Instellingen</h1>
              <p className="mt-0.5 line-clamp-1 text-sm text-slate-500 sm:mt-1">
                {isLoading
                  ? "Configuratie laden"
                  : `${plural(overviewDevices.total, "lamp", "lampen")} - ${plural(overviewRooms.total, "kamer", "kamers")} - Go API live`}
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

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-24 pt-5 sm:px-6 sm:py-6 lg:px-8">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <SettingsRuntime
            overview={overview}
            overviewDevices={overviewDevices}
            deviceHealth={deviceHealth}
            localApiHost={localApiHost}
          />

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

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
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
          <SettingsSync
            syncing={syncing}
            overview={overview}
            syncMap={syncMap}
            handleCalendarSync={handleCalendarSync}
            handleGmailSync={handleGmailSync}
            handleAllSync={handleAllSync}
          />

          <div className="space-y-6">
            <Panel>
              <SectionHeader icon={Server} label="Endpoints" title="Runtime" sub={localApiHost} />
              <div className="space-y-3">
                <StatusRow icon={Cloud} label="Render API" value={localApiHost} tone="green" />
                <StatusRow
                  icon={Server}
                  label="Legacy secret"
                  value={overview?.integrations.legacyHttpSecret ? "Ingesteld" : "Niet actief"}
                  tone={overview?.integrations.legacyHttpSecret ? "sky" : "slate"}
                />
                <StatusRow
                  icon={Smartphone}
                  label="Lokale bridge"
                  value={
                    bridgeQueueActive
                      ? overview?.integrations.localBridge
                        ? "Docker bridge online"
                        : "Geen recente heartbeat"
                      : "Direct LAN"
                  }
                  tone={bridgeQueueActive ? (overview?.integrations.localBridge ? "green" : "rose") : "slate"}
                />
              </div>
            </Panel>

            <SettingsBridge overview={overview} />
          </div>
        </section>

        {pendingActions.length > 0 ? (
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <SettingsPendingActions
              pendingActions={pendingActions}
              pendingBusyId={pendingBusyId}
              handleCancelPending={handleCancelPending}
              handleConfirmPending={handleConfirmPending}
            />
          </section>
        ) : null}

        <CollapsibleSection
          title="Apparaat & Kamerbeheer"
          subtitle={`${devices.length} lampen en ${rooms.length} kamers`}
          icon={<Lightbulb size={18} />}
          theme="sky"
          defaultOpen={false}
        >
          <div className="grid gap-6 xl:grid-cols-2">
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
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Integraties & Systeem"
          subtitle="Telegram, Sync en Navigatie"
          icon={<Server size={18} />}
          theme="violet"
          defaultOpen={false}
        >
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <SettingsIntegrations
              overview={overview}
              telegramStatus={telegramStatus}
              telegramChecking={telegramChecking}
              handleTelegramCheck={handleTelegramCheck}
              aiDiagnostics={aiDiagnostics}
              aiChecking={aiChecking}
              handleAICheck={handleAICheck}
              syncMap={syncMap}
            />

            <Panel>
              <SectionHeader icon={ArrowRight} label="Navigatie" title="Werkgebieden" />
              <div className="mt-4 space-y-2">
                {routeTiles.map((tile) => (
                  <RouteTile key={tile.href} {...tile} />
                ))}
              </div>
            </Panel>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Privacy & Beveiliging"
          subtitle="Privacy center, Backups en Laatste acties"
          icon={<ShieldCheck size={18} />}
          theme="rose"
          defaultOpen={false}
        >
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
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
                  Exporteert je eigen data als JSON: kamers, lampen, automations, rooster, notities, habits en finance.
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
          </div>
        </CollapsibleSection>

        {telegramNeedsAttention ? (
          <div className="flex items-start gap-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-4">
            <TriangleAlert size={18} className="mt-0.5 shrink-0 text-rose-300" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-rose-200">Telegram is niet volledig dichtgezet</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Zet owner chat id en START_BACKGROUND_ENGINE=true in de Go API env voordat Telegram/Grok write-flows actief blijven.
              </p>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
