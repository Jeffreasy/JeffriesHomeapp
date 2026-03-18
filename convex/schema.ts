import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── Automations ───────────────────────────────────────────────────────────
  automations: defineTable({
    userId:    v.string(), // Clerk user ID
    name:      v.string(),
    enabled:   v.boolean(),
    createdAt: v.string(),
    lastFiredAt: v.optional(v.string()),
    group:     v.optional(v.string()),
    trigger: v.object({
      time:        v.string(),
      days:        v.optional(v.array(v.number())),
      triggerType: v.optional(v.string()), // "time" | "schedule"
      shiftType:   v.optional(v.string()), // "Vroeg" | "Laat" | "Dienst" | "any"
    }),
    action: v.object({
      type:            v.string(),
      sceneId:         v.optional(v.string()),
      brightness:      v.optional(v.number()),
      colorTempMireds: v.optional(v.number()),
      colorHex:        v.optional(v.string()),
      deviceIds:       v.optional(v.array(v.string())),
    }),
  }).index("by_user", ["userId"]),

  // ─── Schedule (Diensten) ───────────────────────────────────────────────────
  schedule: defineTable({
    userId:      v.string(),
    eventId:     v.string(), // unique per user
    titel:       v.string(),
    startDatum:  v.string(), // "YYYY-MM-DD"
    startTijd:   v.string(), // "HH:MM"
    eindDatum:   v.string(),
    eindTijd:    v.string(),
    werktijd:    v.string(),
    locatie:     v.string(),
    team:        v.string(),
    shiftType:   v.string(),
    prioriteit:  v.number(),
    duur:        v.number(),
    weeknr:      v.string(),
    dag:         v.string(),
    status:      v.string(), // "Opkomend" | "Bezig" | "Gedraaid"
    beschrijving: v.string(),
    heledag:     v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "startDatum"])
    .index("by_user_eventId", ["userId", "eventId"]),

  // ─── Schedule Meta ─────────────────────────────────────────────────────────
  scheduleMeta: defineTable({
    userId:     v.string(),
    importedAt: v.string(),
    fileName:   v.string(),
    totalRows:  v.number(),
  }).index("by_user", ["userId"]),

  // ─── Salary (Salarisberekening per maand) ─────────────────────────────────
  salary: defineTable({
    userId:             v.string(),
    periode:            v.string(),   // "2026-03" — unieke sleutel per user
    jaar:               v.number(),
    maand:              v.number(),
    aantalDiensten:     v.number(),
    uurloonORT:         v.number(),

    // Bruto componenten
    basisLoon:          v.number(),
    amtZeerintensief:   v.number(),
    toeslagBalansvif:   v.number(),
    ortTotaal:          v.number(),
    extraUrenBedrag:    v.number(),
    toeslagVakatieUren: v.number(),
    reiskosten:         v.number(),
    eenmaligTotaal:     v.number(),
    brutoBetaling:      v.number(),

    // Inhoudingen & netto
    pensioenpremie:    v.number(),
    loonheffingSchat:  v.number(),
    nettoPrognose:     v.number(),

    // Detail als JSON strings (flexibel bij schema-evolutie)
    ortDetail:      v.optional(v.string()), // { VROEG: 45.50, ZONDAG: 89.20 }
    eenmaligDetail: v.optional(v.string()), // [{ label, bedrag }]

    berekendOp: v.string(), // ISO timestamp van GAS-run
  })
    .index("by_user", ["userId"])
    .index("by_user_periode", ["userId", "periode"]),

  // ─── Transactions (Rabobank CSV import) ───────────────────────────────────
  transactions: defineTable({
    // Identiteit & deduplicatie
    rekeningIban:         v.string(),
    volgnr:               v.string(),

    // Kern velden
    userId:               v.string(),
    datum:                v.string(),       // "YYYY-MM-DD"
    bedrag:               v.number(),       // negatief = afschrijving
    saldoNaTrn:           v.number(),
    code:                 v.string(),       // 'tb','id','st', etc.

    // Tegenpartij
    tegenrekeningIban:    v.optional(v.string()),
    tegenpartijNaam:      v.optional(v.string()),

    // Omschrijving (kolommen 1+2+3 samengevoegd)
    omschrijving:         v.string(),
    referentie:           v.optional(v.string()),
    redenRetour:          v.optional(v.string()), // "AM04-Onvoldoende saldo"

    // Vreemde valuta
    oorspBedrag:          v.optional(v.number()),
    oorspMunt:            v.optional(v.string()),

    // App logica
    isInterneOverboeking: v.boolean(),
    categorie:            v.optional(v.string()),
  })
    .index("by_user",           ["userId"])
    .index("by_user_datum",     ["userId", "datum"])
    .index("by_user_categorie", ["userId", "categorie"])
    // Compound deduplicatie-index: zelfde CSV 2x uploaden = nul duplicaten
    .index("by_rekening_volgnr", ["rekeningIban", "volgnr"]),
});
