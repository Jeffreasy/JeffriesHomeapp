"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Lightbulb,
  Power,
  RefreshCw,
  Settings,
  Sparkles,
  Sun,
  Wifi,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useDevices, useRooms, useLampCommand } from "@/hooks/useHomeapp";
import { useBridgeStatus } from "@/hooks/useDevices";
import { RoomSection } from "@/components/room/RoomSection";
import { LampDetailPanel } from "@/components/lamp/LampDetailPanel";
import { SceneBar } from "@/components/scenes/SceneBar";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { type Device } from "@/lib/api";

import {
  buildRoomGroups,
  getAverageBrightness,
  matchesFilter,
  type FilterMode,
} from "@/components/lamp/LampUtils";
import {
  EmptyDevices,
  LoadingGrid,
  NoResults,
  Panel,
  SectionHeader,
  StatusRow,
  WarningPanel,
} from "@/components/lamp/LampCards";
import { LampCommandCenter } from "@/components/lamp/LampCommandCenter";
import { LampToolbar } from "@/components/lamp/LampToolbar";
import { LampOverviewSidebar } from "@/components/lamp/LampOverviewSidebar";

export default function LampenPage() {
  const { data: devices = [], isLoading: loadingDevices, isFetching: fetchingDevices, error: devicesError } = useDevices();
  const { data: rooms = [], isLoading: loadingRooms, error: roomsError } = useRooms();
  const { sendBatch } = useLampCommand();
  const { bridge, bridgeOffline } = useBridgeStatus();
  const queryClient = useQueryClient();

  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");

  const roomById = useMemo(() => new Map(rooms.map((room) => [room.id, room])), [rooms]);
  const onlineDevices = useMemo(() => devices.filter((device) => device.status === "online"), [devices]);
  const offlineDevices = useMemo(() => devices.filter((device) => device.status !== "online"), [devices]);
  const onDevices = useMemo(() => devices.filter((device) => device.current_state?.on), [devices]);
  const allOnlineOn =
    onlineDevices.length > 0 && onlineDevices.every((device) => device.current_state?.on);
  const avgBrightness = getAverageBrightness(devices);
  const selectedDevice = devices.find((device) => device.id === selectedDeviceId) ?? null;
  const isLoading = loadingDevices || loadingRooms;

  const filteredDevices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return devices.filter((device) => {
      const roomName = device.room_id ? roomById.get(device.room_id)?.name ?? device.room_id : "";
      const matchesSearch =
        query.length === 0 ||
        device.name.toLowerCase().includes(query) ||
        roomName.toLowerCase().includes(query) ||
        (device.ip_address ?? "").toLowerCase().includes(query);

      return matchesSearch && matchesFilter(device, filter);
    });
  }, [devices, filter, roomById, search]);

  const roomGroups = useMemo(() => buildRoomGroups(filteredDevices, rooms), [filteredDevices, rooms]);
  const unassignedDevices = useMemo(
    () => filteredDevices.filter((device) => !device.room_id),
    [filteredDevices]
  );
  const allRoomGroups = useMemo(() => buildRoomGroups(devices, rooms), [devices, rooms]);
  const hasAnyResults = filteredDevices.length > 0;
  const hasNoDevices = !isLoading && devices.length === 0 && !devicesError;

  const toggleAll = () => {
    // Batch: één invalidate aan het eind i.p.v. een refetch-storm per lamp.
    sendBatch(onlineDevices, { on: !allOnlineOn });
  };

  const refreshDevices = () => {
    queryClient.invalidateQueries({ queryKey: ["devices"] });
  };

  const handleSelect = (device: Device) => {
    setSelectedDeviceId((previous) => (previous === device.id ? null : device.id));
  };

  useGlobalShortcuts({ devices: onlineDevices, allOn: allOnlineOn, sendBatch });

  return (
    <div className="text-slate-100">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 shrink-0 border-b border-[var(--color-border)] bg-[var(--color-background)]/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
                <Lightbulb size={20} className="text-amber-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Slimme verlichting
                </p>
                <h1 className="mt-1 truncate text-2xl font-bold text-white">Verlichting</h1>
                <p className="mt-1 text-sm text-slate-500">
                  {onlineDevices.length}/{devices.length} online · {onDevices.length} aan
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={refreshDevices}
                disabled={fetchingDevices}
                aria-label="Lampstatus verversen"
                title="Haal de actuele lampstatus op"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-[var(--color-surface-hover)] disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw size={16} className={fetchingDevices ? "animate-spin" : ""} aria-hidden="true" />
                <span className="hidden sm:inline">Verversen</span>
              </button>
              <Link
                href="/settings"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-[var(--color-surface-hover)]"
              >
                <Settings size={16} />
                <span className="hidden sm:inline">Instellingen</span>
              </Link>
              <button
                type="button"
                onClick={toggleAll}
                disabled={onlineDevices.length === 0}
                title="Alle online lampen aan/uit"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:border-[var(--color-border)] disabled:bg-[var(--color-surface)] disabled:text-slate-600"
              >
                <Power size={16} />
                <span>{allOnlineOn ? "Alles uit" : "Alles aan"}</span>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-5 pb-28 sm:px-6 lg:px-8 lg:py-7">
          {/* N7: in queue-modus bevestigt de backend commando's vóór uitvoering —
              bij een offline bridge is de getoonde staat dus mogelijk nep. */}
          {bridgeOffline && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4"
            >
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-200">
                  Bridge offline — lampcommando&apos;s worden uitgesteld en de getoonde status kan verouderd zijn.
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {bridge?.lastSeenAt
                    ? `Laatste heartbeat: ${new Date(bridge.lastSeenAt).toLocaleString("nl-NL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}.`
                    : "Nog geen heartbeat ontvangen."}
                  {(bridge?.commandsPending ?? 0) > 0 && ` ${bridge?.commandsPending} commando('s) in de wachtrij.`}
                </p>
              </div>
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_420px]">
            <LampCommandCenter
              devices={devices.length}
              online={onlineDevices.length}
              offline={offlineDevices.length}
              on={onDevices.length}
              avgBrightness={avgBrightness}
              allOn={allOnlineOn}
              onToggleAll={toggleAll}
            />

            <Panel>
              <SectionHeader
                icon={Sparkles}
                label="Scènes"
                title="Snelle sfeer"
                sub={`${onlineDevices.length} online beschikbaar`}
              />
              <SceneBar />
            </Panel>
          </section>

          {(devicesError || roomsError) && (
            <div className="grid gap-3 lg:grid-cols-2">
              {devicesError && (
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

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-5">
              <LampToolbar
                search={search}
                filter={filter}
                filteredCount={filteredDevices.length}
                totalCount={devices.length}
                onSearchChange={setSearch}
                onClearSearch={() => setSearch("")}
                onFilterChange={setFilter}
              />

              {isLoading ? (
                <LoadingGrid />
              ) : devicesError && devices.length === 0 ? (
                // Failed ≠ empty: bij een device-fetch-fout géén "Filters resetten"
                // maar een echte foutmelding met retry.
                <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/5 px-6 py-12 text-center">
                  <AlertTriangle size={28} className="text-rose-300" aria-hidden="true" />
                  <h3 className="mt-4 text-base font-semibold text-rose-200">
                    Lampen konden niet worden geladen
                  </h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    De deviceverbinding is mislukt. De lampen zelf werken mogelijk gewoon — alleen de status is niet op te halen.
                  </p>
                  <button
                    type="button"
                    onClick={refreshDevices}
                    className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/15"
                  >
                    <RefreshCw size={15} className={fetchingDevices ? "animate-spin" : ""} aria-hidden="true" />
                    Opnieuw proberen
                  </button>
                </div>
              ) : hasNoDevices ? (
                <EmptyDevices />
              ) : hasAnyResults ? (
                <div className="space-y-5">
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
                <NoResults search={search} filter={filter} onReset={() => {
                  setSearch("");
                  setFilter("all");
                }} />
              )}
            </div>

            <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
              <LampOverviewSidebar groups={allRoomGroups} unassignedCount={devices.filter((device) => !device.room_id).length} />
              <Panel>
                <SectionHeader
                  icon={Activity}
                  label="Systeem"
                  title="Live status"
                  sub={isLoading ? "laden" : "ververst elke 10s"}
                />
                {/* N7: eerlijk over de grens van "live" — de fysieke lampstatus
                    reconvergeert in queue-modus pas bij de bridge-poll. */}
                <p className="-mt-2 mb-3 text-[11px] leading-4 text-slate-500">
                  Getoonde status is de laatst bekende — de fysieke lampstatus kan enkele minuten achterlopen.
                </p>
                <div className="space-y-3">
                  <StatusRow
                    icon={Wifi}
                    label="Online"
                    value={`${onlineDevices.length}/${devices.length} lampen`}
                    tone={devices.length > 0 && offlineDevices.length === 0 ? "green" : "amber"}
                  />
                  <StatusRow
                    icon={Sun}
                    label="Helderheid"
                    value={onDevices.length > 0 ? `${avgBrightness}% gemiddeld` : "Geen lampen aan"}
                    tone={onDevices.length > 0 ? "amber" : "slate"}
                  />
                  <StatusRow
                    icon={Zap}
                    label="Shortcut"
                    value="Spatie togglet alle online lampen"
                    tone="blue"
                  />
                </div>
              </Panel>
            </aside>
          </section>
        </main>
      </div>

      <LampDetailPanel
        device={selectedDevice}
        onClose={() => setSelectedDeviceId(null)}
      />
    </div>
  );
}
