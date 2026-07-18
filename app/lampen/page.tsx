"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Lightbulb,
  Loader2,
  Power,
  RefreshCw,
  Settings,
  Sparkles,
} from "lucide-react";
import { useDevices, useLampCommand, useRooms } from "@/hooks/useHomeapp";
import { useBridgeStatus } from "@/hooks/useDevices";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { RoomSection } from "@/components/room/RoomSection";
import { SceneBar } from "@/components/scenes/SceneBar";
import { BridgeStatusNotice } from "@/components/lamp/BridgeStatusNotice";
import {
  buildRoomGroups,
  matchesFilter,
  type FilterMode,
} from "@/components/lamp/LampUtils";
import {
  EmptyDevices,
  LoadingGrid,
  NoResults,
  SectionHeader,
  WarningPanel,
} from "@/components/lamp/LampCards";
import { LampOverviewSidebar } from "@/components/lamp/LampOverviewSidebar";
import { LampToolbar } from "@/components/lamp/LampToolbar";
import { AppPageShell } from "@/components/layout/AppPageShell";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { IconButton } from "@/components/ui/IconButton";
import type { Device } from "@/lib/api";
import {
  createLampAmbientStyle,
  deriveLampPresentation,
} from "@/lib/lampPresentation";
import { getLightingSummary } from "@/lib/lighting";
import { detectActiveScene, SCENE_PRESETS } from "@/lib/scenes";
import { cn } from "@/lib/utils";

const LazyLampDetailPanel = dynamic(
  () => import("@/components/lamp/LampDetailPanel").then((module) => module.LampDetailPanel),
  { ssr: false },
);

export default function LampenPage() {
  const {
    data: devices = [],
    isLoading: loadingDevices,
    isFetching: fetchingDevices,
    error: devicesError,
  } = useDevices();
  const {
    data: rooms = [],
    isLoading: loadingRooms,
    error: roomsError,
  } = useRooms();
  const { sendBatch, isPending: lightingPending } = useLampCommand();
  const {
    bridge,
    isOffline: bridgeOffline,
    isLoading: bridgeStatusLoading,
    isError: bridgeStatusError,
    isStatusKnown: isBridgeStatusKnown,
  } = useBridgeStatus();
  const queryClient = useQueryClient();

  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");

  const roomById = useMemo(
    () => new Map(rooms.map((room) => [room.id, room])),
    [rooms],
  );
  const lightingSummary = useMemo(
    () => getLightingSummary(devices),
    [devices],
  );
  const {
    onlineDevices,
    onDevices,
    allOnlineOn,
  } = lightingSummary;
  const selectedDevice =
    devices.find((device) => device.id === selectedDeviceId) ?? null;
  const isInitialDeviceLoading = loadingDevices && devices.length === 0;
  const roomMetadataLoading = loadingRooms && rooms.length === 0;

  const filteredDevices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return devices.filter((device) => {
      const roomName = device.room_id
        ? roomById.get(device.room_id)?.name ??
          (roomMetadataLoading ? "" : device.room_id)
        : "";
      const matchesSearch =
        query.length === 0 ||
        device.name.toLowerCase().includes(query) ||
        roomName.toLowerCase().includes(query) ||
        (device.ip_address ?? "").toLowerCase().includes(query);
      return matchesSearch && matchesFilter(device, filter);
    });
  }, [devices, filter, roomById, roomMetadataLoading, search]);

  const roomGroups = useMemo(
    () =>
      buildRoomGroups(filteredDevices, rooms, {
        metadataLoading: roomMetadataLoading,
      }),
    [filteredDevices, roomMetadataLoading, rooms],
  );
  const unassignedDevices = useMemo(
    () =>
      roomMetadataLoading
        ? []
        : filteredDevices.filter((device) => !device.room_id),
    [filteredDevices, roomMetadataLoading],
  );
  const allRoomGroups = useMemo(
    () =>
      buildRoomGroups(devices, rooms, {
        metadataLoading: roomMetadataLoading,
      }),
    [devices, roomMetadataLoading, rooms],
  );
  const unassignedCount = roomMetadataLoading
    ? 0
    : devices.filter((device) => !device.room_id).length;

  const activeSceneId = detectActiveScene(devices);
  const activeScene = SCENE_PRESETS.find((scene) => scene.id === activeSceneId);
  const pageAmbientStyle = selectedDevice
    ? deriveLampPresentation(selectedDevice).ambientStyle
    : createLampAmbientStyle(
        activeScene?.color ?? "#94a3b8",
        Boolean(activeScene && activeScene.id !== "uit" && onDevices.length > 0),
      );

  const toggleAll = () => {
    if (lightingPending) return;
    void sendBatch(onlineDevices, { on: !allOnlineOn });
  };

  const refreshDevices = () => {
    void queryClient.invalidateQueries({ queryKey: ["devices"] });
  };

  const handleSelect = (device: Device) => {
    setSelectedDeviceId((current) =>
      current === device.id ? null : device.id,
    );
  };

  useGlobalShortcuts({
    devices: onlineDevices,
    allOn: allOnlineOn,
    sendBatch,
    disabled: lightingPending,
  });

  const hasNoDevices =
    !loadingDevices && devices.length === 0 && !devicesError;
  const hasAnyResults = filteredDevices.length > 0;

  return (
    <div
      className="relative min-h-full overflow-hidden text-[var(--color-text)]"
      style={pageAmbientStyle}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_50%_0,var(--lamp-ambient-medium),transparent_68%)] transition-colors duration-[var(--motion-slow)]"
        aria-hidden="true"
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="app-topbar sticky top-0 z-[var(--layer-sticky)] border-b border-[var(--lamp-ambient-border)] bg-[var(--color-background)]/92 backdrop-blur-xl">
          <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-3 py-2 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--lamp-ambient-border)] bg-[var(--lamp-ambient-soft)] text-[var(--lamp-accent)]"
                aria-hidden="true"
              >
                <Lightbulb size={17} />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold text-[var(--color-text)] sm:text-lg">Verlichting</h1>
                <p className="truncate text-xs text-[var(--color-text-muted)]" aria-live="polite">
                  {isInitialDeviceLoading
                    ? "Lampen laden..."
                    : `${onlineDevices.length}/${devices.length} online / ${onDevices.length} aan`}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <IconButton
                onClick={refreshDevices}
                disabled={fetchingDevices}
                loading={fetchingDevices}
                label="Laatst gemelde lampstatus verversen"
                icon={<RefreshCw size={16} />}
                variant="secondary"
              />
              <ButtonLink
                href="/settings"
                aria-label="Lampinstellingen openen"
                title="Lampinstellingen openen"
                size="icon"
                variant="secondary"
                className="hidden sm:inline-flex"
              >
                <Settings size={16} aria-hidden="true" />
              </ButtonLink>
              <button
                type="button"
                onClick={toggleAll}
                disabled={onlineDevices.length === 0 || lightingPending}
                aria-label={allOnlineOn ? "Alle online lampen uitzetten" : "Alle online lampen aanzetten"}
                aria-busy={lightingPending}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors",
                  allOnlineOn
                    ? "border-[var(--lamp-ambient-border)] bg-[var(--lamp-ambient-medium)] text-[var(--lamp-text)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {lightingPending ? (
                  <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <Power size={16} aria-hidden="true" />
                )}
                <span>{lightingPending ? "Bezig" : allOnlineOn ? "Alles uit" : "Alles aan"}</span>
              </button>
            </div>
          </div>
        </header>

        <AppPageShell width="standard" className="app-page-shell--after-topbar flex flex-1 flex-col gap-4">
          <BridgeStatusNotice
            bridge={bridge}
            isOffline={bridgeOffline}
            isLoading={bridgeStatusLoading}
            isError={bridgeStatusError}
            isStatusKnown={isBridgeStatusKnown}
          />

          {((devicesError && devices.length > 0) || roomsError) && (
            <div className="grid gap-3 lg:grid-cols-2">
              {devicesError && devices.length > 0 && (
                <WarningPanel
                  title="Deviceverbinding mislukt"
                  text={
                    devicesError instanceof Error
                      ? devicesError.message
                      : "Kan geen verbinding maken met de devicebron."
                  }
                />
              )}
              {roomsError && (
                <WarningPanel
                  title="Kamerconfiguratie niet bereikbaar"
                  text="Lampen blijven zichtbaar, maar kamerlabels kunnen tijdelijk generiek zijn."
                />
              )}
            </div>
          )}

          <section
            aria-label="Individuele lampbediening"
            className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"
          >
            <div className="min-w-0 space-y-4">
              <LampToolbar
                search={search}
                filter={filter}
                filteredCount={filteredDevices.length}
                totalCount={devices.length}
                onSearchChange={setSearch}
                onClearSearch={() => setSearch("")}
                onFilterChange={setFilter}
              />

              {isInitialDeviceLoading ? (
                <LoadingGrid />
              ) : devicesError && devices.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-[var(--color-danger-border)] bg-[var(--color-danger-subtle)] px-6 py-10 text-center">
                  <AlertTriangle size={28} className="text-[var(--color-danger)]" aria-hidden="true" />
                  <h2 className="mt-4 text-base font-semibold text-[var(--color-danger)]">
                    Lampen konden niet worden geladen
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-[var(--color-text-muted)]">
                    De statusbron reageert niet. De lampen zelf kunnen nog actief zijn.
                  </p>
                  <Button
                    onClick={refreshDevices}
                    variant="danger"
                    loading={fetchingDevices}
                    loadingLabel="Verversen…"
                    className="mt-5"
                  >
                    <RefreshCw size={15} aria-hidden="true" />
                    Opnieuw proberen
                  </Button>
                </div>
              ) : hasNoDevices ? (
                <EmptyDevices />
              ) : hasAnyResults ? (
                <div className="space-y-4">
                  {roomGroups.map((group) => (
                    <RoomSection
                      key={group.room.id}
                      room={group.room}
                      devices={group.devices}
                      onSelect={handleSelect}
                    />
                  ))}

                  {unassignedDevices.length > 0 && (
                    <RoomSection
                      room={{
                        id: "unassigned",
                        name: "Niet toegewezen",
                        icon: "",
                        floor_number: 99,
                        created_at: "",
                      }}
                      devices={unassignedDevices}
                      onSelect={handleSelect}
                    />
                  )}
                </div>
              ) : (
                <NoResults
                  search={search}
                  filter={filter}
                  onReset={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                />
              )}
            </div>

            <aside className="space-y-4 xl:sticky xl:top-20">
              <Surface className="border-[var(--lamp-ambient-border)]">
                <SectionHeader
                  icon={Sparkles}
                  label="Sfeer"
                  title="Scènes en kleur"
                  sub={
                    activeScene && activeScene.id !== "uit"
                      ? `Actief: ${activeScene.label}`
                      : `${onlineDevices.length} beschikbaar`
                  }
                />
                <SceneBar
                  devices={devices}
                  sendBatch={sendBatch}
                  isPending={lightingPending}
                />
              </Surface>
              <LampOverviewSidebar
                groups={allRoomGroups}
                unassignedCount={unassignedCount}
              />
            </aside>
          </section>
        </AppPageShell>
      </div>

      {selectedDevice && (
        <LazyLampDetailPanel
          device={selectedDevice}
          onClose={() => setSelectedDeviceId(null)}
        />
      )}
    </div>
  );
}
