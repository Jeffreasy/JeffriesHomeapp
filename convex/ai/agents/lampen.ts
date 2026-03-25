/**
 * 💡 Lampen Agent — "De smart home engineer"
 *
 * Expert in WiZ smart lighting. Kent alle lampen, scenes, automations,
 * en kan Grok voorzien van volledige smart home context.
 */

import type { AgentDefinition, ContextOptions } from "../registry";

export const lampenAgent: AgentDefinition = {
  id:           "lampen",
  naam:         "Lampen Agent",
  emoji:        "💡",
  beschrijving: "Smart home lighting specialist. Kent alle WiZ lampen, hun status, " +
                "scènes, en tijdgestuurde automations. Expert in licht-automatisering.",
  domein:       ["devices", "automations"],
  capabilities: [
    "Alle lampen met real-time status tonen",
    "Lamp aan/uit status en helderheid rapporteren",
    "Actieve automations en triggers beschrijven",
    "Scènes en kleurinstellingen analyseren",
    "Automatisering voorstellen op basis van dienstrooster",
    "Lamp-gezondheid monitoren (online/offline)",
  ],
  tools: [
    {
      naam: "devices.list", type: "query",
      beschrijving: "Alle lampen ophalen",
      endpoint: "GET /devices",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
      ],
    },
    {
      naam: "devices.update", type: "mutation",
      beschrijving: "Lamp state wijzigen (aan/uit, helderheid, kleur)",
      methode: "POST",
      parameters: [
        { naam: "id", type: "string", beschrijving: "Device ID", verplicht: true },
        { naam: "on", type: "boolean", beschrijving: "Lamp aan/uit", verplicht: false },
        { naam: "brightness", type: "number", beschrijving: "Helderheid 0-100", verplicht: false },
        { naam: "color_temp", type: "number", beschrijving: "Kleur temperatuur in mireds", verplicht: false },
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
  ],

  getContext: async (ctx, userId, opts?: ContextOptions) => {
    const [devices, automations] = await Promise.all([
      ctx.db.query("devices").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("automations").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
    ]);

    // ── Lite mode: alleen samenvatting (voor dashboard delegation) ─────────
    if (opts?.lite) {
      return {
        samenvatting: {
          totaal:  devices.length,
          online:  devices.filter((d) => d.status === "online").length,
          aan:     devices.filter((d) => d.currentState?.on).length,
        },
        automationsActief: automations.filter((a) => a.enabled).length,
      };
    }

    return {
      lampen: devices.map((d) => ({
        id:         d._id,
        naam:       d.name,
        type:       d.deviceType,
        ip:         d.ipAddress,
        status:     d.status,
        aan:        d.currentState?.on ?? false,
        helderheid: d.currentState?.brightness,
        kleurTemp:  d.currentState?.color_temp,
        rgb:        d.currentState?.r != null
          ? { r: d.currentState.r, g: d.currentState.g, b: d.currentState.b }
          : null,
        laatstGezien: d.lastSeen,
      })),

      samenvatting: {
        totaal:  devices.length,
        online:  devices.filter((d) => d.status === "online").length,
        offline: devices.filter((d) => d.status === "offline").length,
        aan:     devices.filter((d) => d.currentState?.on).length,
        uit:     devices.filter((d) => !d.currentState?.on).length,
      },

      automations: automations.map((a) => ({
        id:          a._id,
        naam:        a.name,
        actief:      a.enabled,
        trigger: {
          tijd:       a.trigger?.time,
          dagen:      a.trigger?.days,
          type:       a.trigger?.triggerType,
          dienstType: a.trigger?.shiftType,
        },
        actie: {
          type:       a.action?.type,
          sceneId:    a.action?.sceneId,
          helderheid: a.action?.brightness,
          kleur:      a.action?.colorHex,
          apparaten:  a.action?.deviceIds,
        },
        laatstUitgevoerd: a.lastFiredAt,
      })),

      automationStats: {
        totaal:   automations.length,
        actief:   automations.filter((a) => a.enabled).length,
        inactief: automations.filter((a) => !a.enabled).length,
      },
    };
  },
};
