"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Home,
  Lightbulb,
  Power,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Wifi,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useDevices, useRooms, useLampCommand } from "@/hooks/useHomeapp";
import { RoomSection } from "@/components/room/RoomSection";
import { LampDetailPanel } from "@/components/lamp/LampDetailPanel";
import { SceneBar } from "@/components/scenes/SceneBar";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { type Device, type Room } from "@/lib/api";

type FilterMode = "all" | "on" | "off" | "offline";
type Tone = "amber" | "blue" | "green" | "rose" | "slate";

type RoomGroup = {
  room: Room;
  devices: Device[];
  onlineCount: number;
  onCount: number;
};

const FILTERS: Array<{ id: FilterMode; label: string }> = [
  { id: "all", label: "Alle" },
  { id: "on", label: "Aan" },
  { id: "off", label: "Uit" },
  { id: "offline", label: "Offline" },
];

const toneClasses: Record<Tone, { icon: string; surface: string; border: string; text: string }> = {
  amber: {
    icon: "text-amber-300",
    surface: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-200",
  },
  blue: {
    icon: "text-sky-300",
    surface: "bg-sky-500/10",
    border: "border-sky-500/20",
    text: "text-sky-200",
  },
  green: {
    icon: "text-emerald-300",
    surface: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-200",
  },
  rose: {
    icon: "text-rose-300",
    surface: "bg-rose-500/10",
    border: "border-rose-500/20",
    text: "text-rose-200",
  },
  slate: {
    icon: "text-slate-300",
    surface: "bg-white/5",
    border: "border-white/10",
    text: "text-slate-200",
  },
};

function createFallbackRoom(roomId: string): Room {
  return {
    id: roomId,
    name: `Kamer ${roomId.slice(-5)}`,
    icon: "",
    floor_number: 0,
    created_at: "",
  };
}

function matchesFilter(device: Device, filter: FilterMode) {
  const isOn = device.current_state?.on ?? false;
  if (filter === "on") return device.status === "online" && isOn;
  if (filter === "off") return device.status === "online" && !isOn;
  if (filter === "offline") return device.status !== "online";
  return true;
}

function getAverageBrightness(devices: Device[]) {
  const onDevices = devices.filter((device) => device.current_state?.on);
  if (onDevices.length === 0) return 0;
  return Math.round(
    onDevices.reduce((total, device) => total + (device.current_state?.brightness ?? 0), 0) /
      onDevices.length
  );
}

function buildRoomGroups(devices: Device[], rooms: Room[]) {
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const roomIds = new Set(devices.filter((device) => device.room_id).map((device) => device.room_id as string));

  return Array.from(roomIds)
    .map((roomId) => {
      const roomDevices = devices.filter((device) => device.room_id === roomId);
      const room = roomById.get(roomId) ?? createFallbackRoom(roomId);

      return {
        room,
        devices: roomDevices,
        onlineCount: roomDevices.filter((device) => device.status === "online").length,
        onCount: roomDevices.filter((device) => device.current_state?.on).length,
      };
    })
    .sort((a, b) => {
      const aKnown = roomById.has(a.room.id) ? 0 : 1;
      const bKnown = roomById.has(b.room.id) ? 0 : 1;
      return aKnown - bKnown || a.room.floor_number - b.room.floor_number || a.room.name.localeCompare(b.room.name);
    });
}

export default function LampenPage() {
  const { data: devices = [], isLoading: loadingDevices, error: devicesError } = useDevices();
  const { data: rooms = [], isLoading: loadingRooms, error: roomsError } = useRooms();
  const { mutate: sendCommand } = useLampCommand();

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
    onlineDevices.forEach((device) => sendCommand({ id: device.id, cmd: { on: !allOnlineOn } }));
  };

  const handleSelect = (device: Device) => {
    setSelectedDeviceId((previous) => (previous === device.id ? null : device.id));
  };

  useGlobalShortcuts({ devices: onlineDevices, allOn: allOnlineOn, sendCommand });

  return (
    <div className="flex min-h-screen bg-[#0a0a0f] text-slate-100">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 shrink-0 border-b border-white/5 bg-[#0a0a0f]/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
                <Lightbulb size={20} className="text-amber-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Smart lighting
                </p>
                <h1 className="mt-1 truncate text-2xl font-bold text-white">Verlichting</h1>
                <p className="mt-1 text-sm text-slate-500">
                  {onlineDevices.length}/{devices.length} online - {onDevices.length} aan
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/settings"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.06]"
              >
                <Settings size={16} />
                <span className="hidden sm:inline">Instellingen</span>
              </Link>
              <button
                type="button"
                onClick={toggleAll}
                disabled={onlineDevices.length === 0}
                title="Alle online lampen aan/uit"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-slate-600"
              >
                <Power size={16} />
                <span>{allOnlineOn ? "Alles uit" : "Alles aan"}</span>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-5 pb-28 sm:px-6 lg:px-8 lg:py-7">
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_420px]">
            <CommandCenter
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

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <Toolbar
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
              <RoomOverview groups={allRoomGroups} unassignedCount={devices.filter((device) => !device.room_id).length} />
              <Panel>
                <SectionHeader
                  icon={Activity}
                  label="Systeem"
                  title="Live status"
                  sub={isLoading ? "laden" : "actueel"}
                />
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

      {selectedDevice && (
        <LampDetailPanel
          device={selectedDevice}
          onClose={() => setSelectedDeviceId(null)}
        />
      )}
    </div>
  );
}

function CommandCenter({
  devices,
  online,
  offline,
  on,
  avgBrightness,
  allOn,
  onToggleAll,
}: {
  devices: number;
  online: number;
  offline: number;
  on: number;
  avgBrightness: number;
  allOn: boolean;
  onToggleAll: () => void;
}) {
  const onlinePercent = devices > 0 ? Math.round((online / devices) * 100) : 0;

  return (
    <Panel className="overflow-hidden p-0">
      <div className="border-b border-white/6 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Command center
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">Woningverlichting</h2>
            <p className="mt-1 text-sm text-slate-500">
              {devices === 0 ? "Nog geen lampen gekoppeld" : `${on} aan, ${offline} offline`}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleAll}
            disabled={online === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-slate-600"
          >
            <Power size={16} />
            {allOn ? "Alles uit" : "Alles aan"}
          </button>
        </div>
      </div>

      <div className="grid gap-px bg-white/[0.06] sm:grid-cols-2 xl:grid-cols-4">
        <StatusMetric
          icon={Lightbulb}
          label="Totaal"
          value={devices === 0 ? "Geen" : String(devices)}
          sub="gekoppelde lampen"
          tone="slate"
        />
        <StatusMetric
          icon={Wifi}
          label="Online"
          value={`${onlinePercent}%`}
          sub={`${online}/${devices} bereikbaar`}
          tone={offline > 0 ? "amber" : "green"}
        />
        <StatusMetric
          icon={Power}
          label="Actief"
          value={devices === 0 ? "Geen" : `${on} aan`}
          sub={on > 0 ? "lampen geven licht" : "alles staat uit"}
          tone={on > 0 ? "amber" : "blue"}
        />
        <StatusMetric
          icon={Sun}
          label="Helderheid"
          value={on > 0 ? `${avgBrightness}%` : "-"}
          sub={on > 0 ? "gemiddeld actief" : "geen actieve lamp"}
          tone={on > 0 ? "green" : "slate"}
        />
      </div>
    </Panel>
  );
}

function Toolbar({
  search,
  filter,
  filteredCount,
  totalCount,
  onSearchChange,
  onClearSearch,
  onFilterChange,
}: {
  search: string;
  filter: FilterMode;
  filteredCount: number;
  totalCount: number;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onFilterChange: (value: FilterMode) => void;
}) {
  return (
    <Panel>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-white/8 bg-black/10 px-3">
          <Search size={15} className="shrink-0 text-slate-500" />
          <input
            type="text"
            placeholder="Zoek op lamp, kamer of IP-adres..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
          />
          {search && (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label="Zoekterm wissen"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <div className="flex min-h-11 items-center gap-1 rounded-xl border border-white/8 bg-black/10 p-1">
            <SlidersHorizontal size={14} className="ml-2 shrink-0 text-slate-500" />
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onFilterChange(item.id)}
                className={`h-8 shrink-0 rounded-lg px-3 text-xs font-semibold transition-colors ${
                  filter === item.id
                    ? "bg-amber-500/15 text-amber-200"
                    : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <span className="shrink-0 text-xs text-slate-500">
            {filteredCount}/{totalCount}
          </span>
        </div>
      </div>
    </Panel>
  );
}

function RoomOverview({ groups, unassignedCount }: { groups: RoomGroup[]; unassignedCount: number }) {
  return (
    <Panel>
      <SectionHeader
        icon={Home}
        label="Kamers"
        title="Overzicht"
        sub={`${groups.length + (unassignedCount > 0 ? 1 : 0)} groepen`}
      />
      {groups.length === 0 && unassignedCount === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-500">
          Nog geen kamerindeling.
        </p>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <RoomOverviewRow key={group.room.id} group={group} />
          ))}
          {unassignedCount > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-white/[0.025] px-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-200">Niet toegewezen</p>
                <p className="mt-0.5 text-xs text-slate-500">{unassignedCount} lampen</p>
              </div>
              <ChevronRight size={15} className="text-slate-600" />
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function RoomOverviewRow({ group }: { group: RoomGroup }) {
  const allOnline = group.onlineCount === group.devices.length && group.devices.length > 0;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-white/[0.025] px-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-200">{group.room.name}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {group.onlineCount}/{group.devices.length} online - {group.onCount} aan
        </p>
      </div>
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
          allOnline ? "bg-emerald-400" : group.onlineCount > 0 ? "bg-amber-400" : "bg-rose-400"
        }`}
      />
    </div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-white/8 bg-white/[0.035] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-5 ${className}`}
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
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <Icon size={16} className="text-amber-300" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <h2 className="truncate text-base font-bold text-white">{title}</h2>
        </div>
      </div>
      {sub && <span className="shrink-0 text-xs text-slate-500">{sub}</span>}
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
    <div className="min-h-[132px] min-w-0 bg-[#0f0f16]/95 p-4 sm:p-5">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${classes.border} ${classes.surface}`}>
        <Icon size={16} className={classes.icon} />
      </div>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-base font-bold ${classes.text}`}>{value}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{sub}</p>
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
    <div className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.025] px-3 py-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${classes.surface}`}>
        <Icon size={15} className={classes.icon} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

function WarningPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-300" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-rose-200">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">{text}</p>
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.05 }}
          className="h-28 rounded-2xl border border-white/8 bg-white/[0.035] animate-pulse"
        />
      ))}
    </div>
  );
}

function EmptyDevices() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
        <Lightbulb size={28} className="text-slate-600" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-300">Geen lampen gevonden</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        Registreer je eerste WiZ-lamp via instellingen om de bedienpagina te vullen.
      </p>
      <Link
        href="/settings"
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15"
      >
        Instellingen openen
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}

function NoResults({ search, filter, onReset }: { search: string; filter: FilterMode; onReset: () => void }) {
  const hasFilter = search.trim().length > 0 || filter !== "all";

  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
      <Search size={28} className="text-slate-600" />
      <h3 className="mt-4 text-base font-semibold text-slate-300">Geen lampen in deze selectie</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {hasFilter
          ? "Pas je zoekterm of statusfilter aan om meer lampen te zien."
          : "Er zijn geen lampen die voldoen aan deze weergave."}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.07]"
      >
        Filters resetten
      </button>
    </div>
  );
}
