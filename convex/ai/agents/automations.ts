/**
 * ⚙️ Automations Agent — "De systeembeheerder"
 *
 * Expert in automatiseringen, cron jobs, sync health, en systeemstatus.
 */

import type { AgentDefinition, ContextOptions } from "../registry";

export const automationsAgent: AgentDefinition = {
  id:           "automations",
  naam:         "Automations Agent",
  emoji:        "⚙️",
  beschrijving: "Systeembeheerder en automation engineer. Monitort cron jobs, sync status, " +
                "automatiseringsregels, en de operationele gezondheid van alle achtergrondprocessen.",
  domein:       ["automations", "scheduleMeta", "emailSyncMeta"],
  capabilities: [
    "Alle automatisering regels met triggers beschrijven",
    "Cron job status en frequentie rapporteren",
    "Sync health van Calendar/Gmail/Todoist monitoren",
    "Diensttype-gekoppelde automations analyseren",
    "Systeem gezondheid dashboard bieden",
  ],
  tools: [
    {
      naam: "automations.create", type: "mutation",
      beschrijving: "Nieuwe automation aanmaken",
      methode: "POST",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "name", type: "string", beschrijving: "Naam van de automation", verplicht: true },
        { naam: "trigger.time", type: "string", beschrijving: "Trigger tijd HH:MM", verplicht: true },
        { naam: "trigger.days", type: "array", beschrijving: "Dagen (0=zo, 1=ma, ..., 6=za)", verplicht: false },
        { naam: "trigger.shiftType", type: "string", beschrijving: "Dienst type filter", verplicht: false, enum: ["Vroeg", "Laat", "Dienst"] },
        { naam: "action.type", type: "string", beschrijving: "Actie type", verplicht: true, enum: ["scene", "brightness", "color", "toggle"] },
        { naam: "action.sceneId", type: "string", beschrijving: "Scene ID", verplicht: false, enum: ["ochtend", "helder", "avond", "nacht", "film"] },
      ],
    },
    {
      naam: "automations.toggle", type: "mutation",
      beschrijving: "Automation aan/uit zetten",
      methode: "POST",
      parameters: [
        { naam: "id", type: "string", beschrijving: "Automation ID", verplicht: true },
        { naam: "enabled", type: "boolean", beschrijving: "Gewenste status", verplicht: true },
      ],
    },
    {
      naam: "automations.remove", type: "mutation",
      beschrijving: "Automation permanent verwijderen",
      methode: "POST",
      parameters: [
        { naam: "id", type: "string", beschrijving: "Automation ID", verplicht: true },
      ],
    },
  ],

  getContext: async (ctx, userId, opts?: ContextOptions) => {
    const [automations, scheduleMeta, emailMeta] = await Promise.all([
      ctx.db.query("automations").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("scheduleMeta").withIndex("by_user", (q) => q.eq("userId", userId)).first(),
      ctx.db.query("emailSyncMeta").withIndex("by_user", (q) => q.eq("userId", userId)).first(),
    ]);

    // ── Lite mode (voor dashboard) ────────────────────────────────────────
    if (opts?.lite) {
      return {
        totaal: automations.length,
        actief: automations.filter((a) => a.enabled).length,
      };
    }

    // Groepeer per trigger type
    const perTriggerType: Record<string, number> = {};
    const perShiftType: Record<string, number> = {};
    for (const a of automations) {
      const tt = a.trigger?.triggerType ?? "time";
      perTriggerType[tt] = (perTriggerType[tt] ?? 0) + 1;
      if (a.trigger?.shiftType) {
        perShiftType[a.trigger.shiftType] = (perShiftType[a.trigger.shiftType] ?? 0) + 1;
      }
    }

    const cronJobs = [
      { naam: "sync-schedule-daily",           frequentie: "Dagelijks 06:00 UTC", doel: "Werkrooster synchroniseren" },
      { naam: "sync-personal-events-interval", frequentie: "Elk uur",             doel: "Persoonlijke agenda synchroniseren" },
      { naam: "sync-todoist-daily",            frequentie: "Dagelijks 07:00 UTC", doel: "Todoist taken synchroniseren" },
      { naam: "process-pending-calendar",      frequentie: "Elk uur",             doel: "Pending calendar events verwerken" },
      { naam: "sync-gmail",                    frequentie: "Elke 5 minuten",      doel: "Gmail inbox synchroniseren" },
    ];

    return {
      automations: {
        regels: automations.map((a) => ({
          id: a._id, naam: a.name, actief: a.enabled, groep: a.group,
          trigger: { tijd: a.trigger?.time, dagen: a.trigger?.days, type: a.trigger?.triggerType ?? "time", dienstType: a.trigger?.shiftType },
          actie: { type: a.action?.type, sceneId: a.action?.sceneId, helderheid: a.action?.brightness, kleur: a.action?.colorHex, apparaten: a.action?.deviceIds?.length ?? 0 },
          laatstUitgevoerd: a.lastFiredAt,
        })),
        statistieken: {
          totaal: automations.length, actief: automations.filter((a) => a.enabled).length,
          inactief: automations.filter((a) => !a.enabled).length, perTriggerType, perShiftType,
        },
      },
      cronJobs,
      syncHealth: {
        rooster: scheduleMeta
          ? { status: "operationeel", laatsteSync: scheduleMeta.importedAt, records: scheduleMeta.totalRows }
          : { status: "niet geconfigureerd" },
        gmail: emailMeta
          ? { status: "operationeel", laatsteSync: emailMeta.lastFullSync, totaalGesynct: emailMeta.totalSynced }
          : { status: "niet geconfigureerd" },
        todoist:  { status: "actief", frequentie: "dagelijks" },
        calendar: { status: "actief", frequentie: "elk uur" },
      },
    };
  },
};
