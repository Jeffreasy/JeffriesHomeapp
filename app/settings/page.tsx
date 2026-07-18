"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  ArrowRight,
  CalendarClock,
  Cloud,
  Download,
  Eye,
  EyeOff,
  Home,
  KeyRound,
  Lightbulb,
  Lock,
  Mail,
  RefreshCw,
  Server,
  ShieldCheck,
  Smartphone,
  StickyNote,
  TriangleAlert,
} from "lucide-react";

import { useDevices } from "@/hooks/useDevices";
import { useRooms, useDeleteRoom } from "@/hooks/useRooms";
import { usePrivacy, privacyQueryKey, clearPrivacyOverride, notifyPrivacyChange } from "@/hooks/usePrivacy";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { Skeleton } from "@/components/ui/Skeleton";
import { AppIcon } from "@/components/ui/AppIcon";
import { ResponsiveActions } from "@/components/ui/ResponsiveActions";
import { useToast } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { DeviceRow } from "@/components/settings/DeviceRow";
import { AddDeviceForm } from "@/components/settings/AddDeviceForm";
import { AddRoomForm } from "@/components/settings/AddRoomForm";
import { RoomRow } from "@/components/settings/RoomRow";
import { type Room, privacyApi, settingsApi, syncApi } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
import { EmptyState, MetricCard, RouteTile, SectionHeader, StatusRow } from "@/components/settings/SettingsCards";
import { Surface } from "@/components/ui/Surface";
import { SettingsRuntime, SettingsPendingActions, SettingsBridge } from "@/components/settings/SettingsRuntime";
import { SettingsIntegrations } from "@/components/settings/SettingsIntegrations";
import { SettingsSync } from "@/components/settings/SettingsSync";
import { AppPageHeader, AppPageShell } from "@/components/layout/AppPageShell";

// Dutch labels for the privacy-center scope buttons (L9) — the raw English
// scope keys ("finance", "notes") are API identifiers, not UI copy.
const PRIVACY_SCOPE_LABELS: Record<PrivacyScope, string> = {
  finance: "Financiën",
  habits: "Habits",
  notes: "Notities",
  email: "E-mail",
  account: "Account",
};

export default function SettingsPage() {
  const { data: devices = [], isLoading: devicesLoading } = useDevices();
  const { data: rooms = [], isLoading: roomsLoading } = useRooms();
  const { mutate: deleteRoom, isPending: deletingRoom } = useDeleteRoom();
  const { openConfirm } = useConfirm();
  const { success, error: toastError } = useToast();
  const { user, isLoaded: userLoaded } = useUser();
  const { hidden: privacyOn, toggle: togglePrivacy, mask, isServerUnknown: isPrivacyUnknown } = usePrivacy("account");
  const queryClient = useQueryClient();

  const {
    data: overview,
    isError: overviewFailed,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ["settings-overview"],
    queryFn: () => settingsApi.overview(),
    refetchInterval: 10000,
  });

  const { data: syncStatus } = useQuery({
    queryKey: ["sync-status", user?.id],
    queryFn: () => syncApi.status(user?.id),
    refetchInterval: 10000,
  });

  const { data: pendingActions = [], refetch: refetchPendingActions } = useQuery({
    queryKey: ["ai-pending-actions", user?.id],
    queryFn: () => settingsApi.pendingActions(user!.id),
    enabled: Boolean(user?.id),
    refetchInterval: 6000,
  });

  // Auto-populates on mount (like every other metric on this page) instead
  // of showing an empty panel until the user knows to click "Test AI" —
  // that manual-only pattern meant "is Grok healthy / what did it cost me
  // today" required an extra click every single visit.
  const {
    data: aiDiagnostics = null,
    refetch: refetchAiDiagnostics,
  } = useQuery({
    queryKey: ["ai-diagnostics"],
    queryFn: async () => (await settingsApi.aiDiagnostics()) as unknown as AiDiagnosticsResult,
    refetchInterval: 60000,
  });
  // Deliberately NOT isFetching from the query above — that flag is also
  // true during the silent 60s background poll, which would make the "Test
  // AI" button appear busy/disabled every minute with no user interaction.
  const [aiChecking, setAiChecking] = useState(false);

  const telegramStatusAction = async () => settingsApi.telegramStatus();

  // Shared key with usePrivacy() (M23) — invalidating it here updates the
  // masking state on every mounted page, not just this one.
  const { data: privacySettings } = useQuery({
    queryKey: privacyQueryKey(user?.id ?? ""),
    queryFn: () => privacyApi.get(user!.id),
    enabled: Boolean(user?.id),
  });

  const updatePrivacySettings = async (args: Partial<Record<PrivacyScope, boolean>>) => {
    if (!user?.id) {
      throw new Error("Geen ingelogde gebruiker");
    }
    const result = await privacyApi.update(user.id, args);
    await queryClient.invalidateQueries({ queryKey: privacyQueryKey(user.id) });
    // Wake up usePrivacy() listeners in this tab immediately (M23).
    notifyPrivacyChange();
    return result;
  };

  const [syncing, setSyncing] = useState<SyncTarget | null>(null);
  const [pendingBusyId, setPendingBusyId] = useState<string | null>(null);
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatusResult | null>(null);
  const [telegramChecking, setTelegramChecking] = useState(false);
  const [backupRequested, setBackupRequested] = useState(false);
  const [backupData, setBackupData] = useState<Record<string, unknown> | null>(null);

  const handleBackupExport = async () => {
    if (!user?.id) return;
    setBackupRequested(true);
    try {
      const data = await settingsApi.backup(user.id);
      setBackupData(data);
    } catch {
      toastError("Backup export mislukt");
      setBackupRequested(false);
    }
  };


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
    setBackupData(null);
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
        // allSettled so one failing source doesn't abort the other, but the
        // results MUST be inspected (M2) — otherwise a failed Gmail sync
        // still toasts "gesynchroniseerd" and the user trusts stale data.
        const [calendarResult, gmailResult] = await Promise.allSettled([
          syncApi.calendar(user.id),
          syncApi.gmail(user.id),
        ]);
        const failed: string[] = [];
        if (calendarResult.status === "rejected") failed.push("Agenda/rooster");
        if (gmailResult.status === "rejected") failed.push("Gmail");
        if (failed.length > 0) {
          throw new Error(`${failed.join(" en ")} kon niet worden gesynchroniseerd`);
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
      onSuccess: () => {
        success("Kamer verwijderd");
      },
      onError: (err) => toastError(err instanceof Error ? err.message : "Verwijderen mislukt"),
    });
  };

  const handleConfirmPending = async (id: string) => {
    setPendingBusyId(id);
    try {
      if (!user?.id) throw new Error("Niet ingelogd");
      const result = await settingsApi.confirmPendingAction(user.id, id);
      success(result.summary ?? "Actie uitgevoerd");
      await Promise.allSettled([refetchPendingActions()]);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Bevestigen mislukt");
    } finally {
      setPendingBusyId(null);
    }
  };

  const handleCancelPending = async (id: string) => {
    setPendingBusyId(id);
    try {
      if (!user?.id) throw new Error("Niet ingelogd");
      await settingsApi.cancelPendingAction(user.id, id);
      success("Actie geannuleerd");
      await refetchPendingActions();
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
      const result = await refetchAiDiagnostics();
      if (result.error) {
        toastError(result.error instanceof Error ? result.error.message : "AI diagnose mislukt");
        return;
      }
      if (result.data) {
        success(result.data.ok ? "AI diagnose groen" : "AI diagnose heeft aandachtspunten");
      }
    } finally {
      setAiChecking(false);
    }
  };

  const togglePrivacyScope = async (scope: PrivacyScope) => {
    if (!privacySettings) return;
    const current = privacySettings[scope] ?? false;
    // The backend PUT /privacy upserts ALL five columns from the request
    // body (no partial-patch support) — sending only the changed scope would
    // silently reset every other scope to false. Always send the full,
    // merged set of current values with just this one flipped.
    const merged: Record<PrivacyScope, boolean> = {
      finance: privacySettings.finance ?? false,
      habits: privacySettings.habits ?? false,
      notes: privacySettings.notes ?? false,
      email: privacySettings.email ?? false,
      account: privacySettings.account ?? false,
      [scope]: !current,
    };
    try {

      await updatePrivacySettings(merged);
      // The server value for this scope just changed — drop any local
      // eye-toggle override so it can't permanently shadow the new server
      // preference (M23).
      clearPrivacyOverride(scope);
      success("Privacy voorkeur bijgewerkt");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Privacy voorkeur opslaan mislukt");
    }
  };

  // Failed ≠ empty: without this branch a backend outage would render the
  // whole page with confident fake zeros. Only shown when there is no
  // (cached) overview at all — stale data beats a hard error screen.
  if (overviewFailed && !overview) {
    return (
      <AppPageShell width="narrow" className="py-12">
        <FeedbackState
          tone="error"
          title="Instellingen laden mislukt"
          description="De systeemstatus kon niet worden opgehaald. Controleer je verbinding en probeer het opnieuw."
          icon={TriangleAlert}
          action={
            <Button variant="secondary" onClick={() => refetchOverview()} className="mt-5">
              <RefreshCw size={15} aria-hidden="true" />
              Opnieuw proberen
            </Button>
          }
        />
      </AppPageShell>
    );
  }

  return (
    <AppPageShell width="standard" className="space-y-5">
      <AppPageHeader
        eyebrow="Systeem"
        title="Instellingen"
        description="Beheer je account, privacy, integraties en gekoppelde apparaten."
        leading={<AppIcon name="settings" tone="accent" size="lg" framed active />}
        actions={
          <ResponsiveActions
            menuLabel="Instellingenacties"
            primary={
              <Button
                variant="primary"
                onClick={handleAllSync}
                disabled={syncing !== null && syncing !== "all"}
                loading={syncing === "all"}
                loadingLabel="Synchroniseren…"
              >
                <RefreshCw size={16} aria-hidden="true" />
                <span className="hidden sm:inline">Synchroniseren</span>
              </Button>
            }
            secondary={
              <Button
                onClick={togglePrivacy}
                disabled={isPrivacyUnknown}
                loading={isPrivacyUnknown}
                loadingLabel="Laden"
                title={isPrivacyUnknown ? "Privacyvoorkeur wordt veilig geladen" : privacyOn ? "Details tonen" : "Details verbergen"}
                aria-label={isPrivacyUnknown ? "Privacyvoorkeur wordt geladen" : privacyOn ? "Details tonen" : "Details verbergen"}
                aria-pressed={privacyOn}
                variant={privacyOn ? "warning" : "secondary"}
                className="w-full justify-start sm:w-auto sm:justify-center"
              >
                {privacyOn ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                <span>{privacyOn ? "Verborgen" : "Zichtbaar"}</span>
              </Button>
            }
          />
        }
      />

      <div className="flex flex-col gap-6">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <SettingsRuntime
            overview={overview}
            overviewDevices={overviewDevices}
            deviceHealth={deviceHealth}
            localApiHost={localApiHost}
          />

          <Surface radius="sm">
            <SectionHeader icon={Lock} label="Toegang" title="Account en privacy" sub={userLoaded ? "actief" : "laden"} />
            <div className="space-y-3">
              <StatusRow icon={ShieldCheck} label="Gebruiker" value={privacyOn ? "Afgeschermd" : accountName} tone="success" />
              <StatusRow icon={KeyRound} label="Clerk" value={privacyOn ? mask(accountEmail) : accountEmail} tone="info" />
              <Button
                variant={privacyOn ? "primary" : "secondary"}
                fullWidth
                onClick={togglePrivacy}
                disabled={isPrivacyUnknown}
                loading={isPrivacyUnknown}
                loadingLabel="Privacy laden"
                aria-label={isPrivacyUnknown ? "Privacyvoorkeur wordt geladen" : privacyOn ? "Accountdetails tonen" : "Accountdetails verbergen"}
                aria-pressed={privacyOn}
                title={isPrivacyUnknown ? "Privacyvoorkeur wordt veilig geladen" : privacyOn ? "Accountdetails tonen" : "Accountdetails verbergen"}
                className="justify-between py-3"
              >
                <span className="flex min-w-0 items-center gap-3">
                  {privacyOn ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  <span>{privacyOn ? "Privacy aan" : "Privacy uit"}</span>
                </span>
                <ArrowRight size={15} className="shrink-0 text-[var(--color-text-muted)]" />
              </Button>
            </div>
          </Surface>
        </section>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard
            icon={CalendarClock}
            label="Rooster"
            value={`${overview?.schedule.upcoming ?? 0}`}
            meta={`${overview?.schedule.total ?? 0} diensten - ${formatDateTime(overview?.schedule.importedAt)}`}
            tone="info"
          />
          <MetricCard
            icon={Mail}
            label="Gmail"
            value={`${overview?.email.unread ?? 0}`}
            meta={`${overview?.email.total ?? 0} emails - ${formatDateTime(overview?.email.lastFullSync)}`}
            tone={(overview?.email.unread ?? 0) > 0 ? "accent" : "success"}
          />
          <MetricCard
            icon={StickyNote}
            label="Persoonlijke data"
            value={`${(overview?.data.notes ?? 0) + (overview?.data.activeHabits ?? 0)}`}
            meta={`${overview?.data.notes ?? 0} notities - ${overview?.data.activeHabits ?? 0} actieve habits`}
            tone="info"
          />
          <MetricCard
            icon={Home}
            label="Kamers"
            value={`${overviewRooms.total}`}
            meta={`${overviewRooms.unassignedDevices} lampen zonder kamer`}
            tone={overviewRooms.unassignedDevices > 0 ? "warning" : "neutral"}
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
            <Surface radius="sm">
              <SectionHeader icon={Server} label="Endpoints" title="Runtime" sub={localApiHost} />
              <div className="space-y-3">
                <StatusRow icon={Cloud} label="Render API" value={localApiHost} tone="success" />
                <StatusRow
                  icon={Server}
                  label="Legacy secret"
                  value={overview?.integrations.legacyHttpSecret ? "Ingesteld" : "Niet actief"}
                  tone={overview?.integrations.legacyHttpSecret ? "info" : "neutral"}
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
                  tone={bridgeQueueActive ? (overview?.integrations.localBridge ? "success" : "danger") : "neutral"}
                />
              </div>
            </Surface>

            <SettingsBridge overview={overview} />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <SettingsPendingActions
            pendingActions={pendingActions}
            pendingBusyId={pendingBusyId}
            handleCancelPending={handleCancelPending}
            handleConfirmPending={handleConfirmPending}
          />
        </section>

        <CollapsibleSection
          title="Apparaat & Kamerbeheer"
          subtitle={`${devices.length} lampen en ${rooms.length} kamers`}
          icon={<Lightbulb size={18} />}
          tone="info"
          defaultOpen={false}
        >
          <div className="grid gap-6 xl:grid-cols-2">
            <ErrorBoundary>
              <Surface radius="sm">
                <SectionHeader
                  icon={Lightbulb}
                  label="Smart home"
                  title="Lampen beheren"
                  sub={devicesLoading ? "laden" : plural(devices.length, "lamp", "lampen")}
                  action={
                    <ButtonLink href="/lampen" variant="secondary" size="sm">
                      Openen
                      <ArrowRight size={14} aria-hidden="true" />
                    </ButtonLink>
                  }
                />
                <div className="mt-4 space-y-2">
                  {devicesLoading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-16" />
                    ))
                  ) : devices.length > 0 ? (
                    devices.map((device) => <DeviceRow key={device.id} device={device} rooms={rooms} />)
                  ) : (
                    <EmptyState icon={Lightbulb} title="Geen lampen gekoppeld" />
                  )}
                  <AddDeviceForm rooms={rooms} />
                  {/* DeviceDiscoveryPanel removed (M3): it only re-fetched the
                      already-registered device list and compared it with itself —
                      a structural no-op, since there is no real discovery
                      endpoint. Re-add a panel here once the backend can scan. */}
                </div>
              </Surface>
            </ErrorBoundary>

            <ErrorBoundary>
              <Surface radius="sm">
                <SectionHeader
                  icon={Home}
                  label="Indeling"
                  title="Kamers"
                  sub={roomsLoading ? "laden" : plural(rooms.length, "kamer", "kamers")}
                />
                <div className="mt-4 space-y-2">
                  {roomsLoading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-16" />
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
              </Surface>
            </ErrorBoundary>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Integraties & Systeem"
          subtitle="Telegram, Sync en Navigatie"
          icon={<Server size={18} />}
          tone="info"
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

            <Surface radius="sm">
              <SectionHeader icon={ArrowRight} label="Navigatie" title="Werkgebieden" />
              <div className="mt-4 space-y-2">
                {routeTiles.map((tile) => (
                  <RouteTile key={tile.href} {...tile} />
                ))}
              </div>
            </Surface>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Privacy & Beveiliging"
          subtitle="Privacy center en Backups"
          icon={<ShieldCheck size={18} />}
          tone="danger"
          defaultOpen={false}
        >
          <Surface radius="sm">
              <SectionHeader icon={ShieldCheck} label="Privacy" title="Privacy center" sub="centrale voorkeuren" />
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {(["finance", "habits", "notes", "email", "account"] as const satisfies readonly PrivacyScope[]).map((scope) => (
                  <Button
                    key={scope}
                    onClick={() => togglePrivacyScope(scope)}
                    disabled={!privacySettings || isPrivacyUnknown}
                    aria-busy={!privacySettings || isPrivacyUnknown}
                    aria-pressed={privacySettings?.[scope] ?? false}
                    aria-label={!privacySettings || isPrivacyUnknown ? `${PRIVACY_SCOPE_LABELS[scope]} privacyvoorkeur wordt geladen` : `${PRIVACY_SCOPE_LABELS[scope]}: ${privacySettings[scope] ? "maskering uitzetten" : "maskering aanzetten"}`}
                    title={!privacySettings || isPrivacyUnknown ? "Privacyvoorkeur wordt veilig geladen" : `${PRIVACY_SCOPE_LABELS[scope]}: ${privacySettings[scope] ? "maskering uitzetten" : "maskering aanzetten"}`}
                    variant={privacySettings?.[scope] ? "primary" : "secondary"}
                    fullWidth
                    className="h-auto flex-col items-start py-3 text-left"
                  >
                    <span className="block text-xs font-bold uppercase">{PRIVACY_SCOPE_LABELS[scope]}</span>
                    <span className="block text-sm font-semibold">
                      {!privacySettings || isPrivacyUnknown ? "Laden" : privacySettings[scope] ? "Maskeren" : "Zichtbaar"}
                    </span>
                  </Button>

                ))}
              </div>
              <Surface tone="subtle" radius="sm" padding="md" className="mt-4">
                <p className="text-sm font-bold text-[var(--color-text)]">Backup/export</p>
                <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
                  Exporteert je eigen data als JSON: kamers, lampen, automations, rooster, notities, habits en finance.
                </p>
                <Button
                  variant="primary"
                  onClick={handleBackupExport}
                  loading={backupRequested}
                  loadingLabel="Exporteren…"
                  className="mt-3"
                >
                  <Download size={15} />
                  JSON export
                </Button>
              </Surface>
          </Surface>
        </CollapsibleSection>

        {telegramNeedsAttention ? (
          <Surface tone="danger" radius="sm" padding="md" className="flex items-start gap-3" role="alert">
            <TriangleAlert size={18} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-danger)]">Telegram is niet volledig dichtgezet</p>
              <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
                Zet owner chat id en START_BACKGROUND_ENGINE=true in de Go API env voordat Telegram/Grok write-flows actief blijven.
              </p>
            </div>
          </Surface>
        ) : null}
      </div>
    </AppPageShell>
  );
}
