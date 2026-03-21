"use node";

/**
 * convex/actions/syncTodoist.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Convex Action: synchroniseert aankomende diensten naar Todoist.
 * Vervangt GAS Todoist.gs sync-logica (zonder de Sheet-afhankelijkheden).
 *
 * Flow: Lees schedule tabel → maak/update Todoist taken → sluit verlopen taken
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { internalAction, action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

const TODOIST_BASE   = "https://api.todoist.com/api/v1/";
const TODOIST_LABEL  = "Rooster";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TodoistTask {
  id:          string;
  content:     string;
  description: string;
  due?:        { datetime?: string; date?: string };
}

interface DienstRecord {
  eventId:    string;
  titel:      string;
  startDatum: string;
  startTijd:  string;
  eindTijd:   string;
  locatie:    string;
  shiftType:  string;
  duur:       number;
  heledag:    boolean;
  status:     string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function todoistFetch(
  endpoint: string,
  method: string,
  token: string,
  body?: object
): Promise<any> {
  const res = await fetch(TODOIST_BASE + endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (method === "delete" || res.status === 204) return null;

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Todoist API ${method} ${endpoint}: HTTP ${res.status} — ${text}`);
  }
  return res.json();
}

async function fetchAllTasks(token: string): Promise<TodoistTask[]> {
  const all: TodoistTask[] = [];
  let cursor: string | null = null;

  do {
    const url   = `tasks${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`;
    const data  = await todoistFetch(url, "GET", token);
    const items = data?.results ?? [];
    all.push(...items);
    cursor = data?.next_cursor ?? null;
  } while (cursor);

  return all;
}

function extractEid(description: string): string | null {
  const m = description.match(/\[EID:(.*?)\]/);
  return m ? m[1] : null;
}

function makeHash(d: DienstRecord): string {
  return `${d.startDatum}|${d.startTijd}|${d.eindTijd}|${d.locatie}`.replace(/\s/g, "");
}

function getTeam(locatie: string): string {
  const l = locatie.toLowerCase();
  if (l.includes("appartementen")) return "R.";
  if (l.includes("aa")) return "A.";
  return "?";
}

function buildTaskPayload(
  d: DienstRecord,
  token: string,
  projectId?: string,
  existingId?: string
): object {
  const team        = getTeam(d.locatie);
  const title       = team !== "?" ? `${team} ${d.shiftType}` : `Dienst (${d.titel})`;
  const durationMin = Math.round(d.duur * 60) || 15;
  const hash        = makeHash(d);
  const description = `Locatie: ${d.locatie || "Onbekend"}\nDuur: ${d.duur} uur\nHash: ${hash}\n\n[EID:${d.eventId}]`;

  const payload: any = {
    content:     title,
    description,
    labels:      [TODOIST_LABEL],
  };

  if (projectId) payload.project_id = projectId;

  if (d.heledag) {
    payload.due_date = d.startDatum;
  } else {
    payload.due_datetime  = `${d.startDatum}T${d.startTijd || "09:00"}:00`;
    payload.duration      = durationMin;
    payload.duration_unit = "minute";
  }

  return payload;
}

// ─── Internal Action ─────────────────────────────────────────────────────────

export const syncTodoist = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }): Promise<{ created: number; updated: number; closed: number }> => {
    const token     = process.env.TODOIST_API_TOKEN;
    const projectId = process.env.TODOIST_PROJECT_ID;

    if (!token) throw new Error("TODOIST_API_TOKEN niet ingesteld in Convex env vars");

    // Laad aankomende + bezig diensten uit schedule tabel
    const allDiensten = await ctx.runQuery(internal.schedule.listInternal, { userId }) as DienstRecord[];
    const now         = new Date().toISOString().slice(0, 10);

    const aankomend = allDiensten.filter(
      (d) => d.status !== "VERWIJDERD" && d.startDatum >= now
    );

    // Bouw EID → taak-map van bestaande Todoist taken
    const allTasks   = await fetchAllTasks(token);
    const taskByEid  = new Map<string, TodoistTask>();
    const eidSeen    = new Set<string>();

    for (const task of allTasks) {
      const eid = extractEid(task.description ?? "");
      if (!eid) continue;
      if (eidSeen.has(eid)) {
        // Duplicaat verwijderen
        await todoistFetch(`tasks/${task.id}`, "DELETE", token);
        continue;
      }
      eidSeen.add(eid);
      taskByEid.set(eid, task);
    }

    let created = 0, updated = 0, closed = 0;

    // Sync aankomende diensten
    for (const d of aankomend) {
      const hash    = makeHash(d);
      const payload = buildTaskPayload(d, token, projectId);
      const existing = taskByEid.get(d.eventId);

      if (existing) {
        // Update alleen als hash verschilt
        const existingHash = existing.description?.match(/Hash:\s(\S+)/)?.[1] ?? "";
        if (existingHash !== hash) {
          await todoistFetch(`tasks/${existing.id}`, "POST", token, payload);
          updated++;
        }
        taskByEid.delete(d.eventId); // verwijder uit map — blijft over = verlopen
      } else {
        await todoistFetch("tasks", "POST", token, payload);
        created++;
      }
    }

    // Verlopen taken sluiten (staan in taskByEid maar niet meer in aankomend)
    for (const [_eid, task] of taskByEid) {
      if (!task.due) continue;
      const dueStr = task.due.datetime ?? task.due.date ?? "";
      if (!dueStr || dueStr.slice(0, 10) >= now) continue;
      await todoistFetch(`tasks/${task.id}/close`, "POST", token);
      closed++;
    }

    return { created, updated, closed };
  },
});

// ─── Publieke action (voor frontend gebruik) ─────────────────────────────────

export const syncTodoistNow = action({
  args: { userId: v.string() },
  handler: async (ctx, { userId }): Promise<{ created: number; updated: number; closed: number }> => {
    if (!userId) throw new Error("userId is vereist");
    return ctx.runAction(internal.actions.syncTodoist.syncTodoist, { userId });
  },
});
