// ─── Types ────────────────────────────────────────────────────────────────────

export interface Room {
  id: string;
  name: string;
  icon: string;
  floor_number: number;
  created_at: string;
}

export interface DeviceState {
  on: boolean;
  brightness: number;
  color_temp: number;
  r: number;
  g: number;
  b: number;
}

export interface Device {
  id: string;
  name: string;
  device_type: string;
  room_id: string | null;
  ip_address: string | null;
  current_state: DeviceState;
  status: "online" | "offline" | "error";
  last_seen: string | null;
  commissioned_at: string;
  manufacturer: string | null;
  model: string | null;
}

export interface DeviceCommand {
  on?: boolean;
  brightness?: number;
  color_temp_mireds?: number;
  r?: number;
  g?: number;
  b?: number;
  /** WiZ native effect-ID (1–32) for built-in lamp animations */
  scene_id?: number;
}

// ─── API Client ───────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail ?? `API error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export const roomsApi = {
  list: () => apiFetch<Room[]>("/rooms"),
  get: (id: string) => apiFetch<Room>(`/rooms/${id}`),
  create: (data: { name: string; icon: string; floor_number: number }) =>
    apiFetch<Room>("/rooms", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Room>) =>
    apiFetch<Room>(`/rooms/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<void>(`/rooms/${id}`, { method: "DELETE" }),
};

// ─── Devices ──────────────────────────────────────────────────────────────────

export const devicesApi = {
  list: () => apiFetch<Device[]>("/devices"),
  get: (id: string) => apiFetch<Device>(`/devices/${id}`),
  command: (id: string, cmd: DeviceCommand) =>
    apiFetch<void>(`/devices/${id}/command`, {
      method: "POST",
      body: JSON.stringify(cmd),
    }),
  register: (data: { ip_address: string; name: string; room_id?: string }) =>
    apiFetch<Device>("/devices/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { name?: string; room_id?: string; ip_address?: string }) =>
    apiFetch<Device>(`/devices/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) => apiFetch<void>(`/devices/${id}`, { method: "DELETE" }),
};

