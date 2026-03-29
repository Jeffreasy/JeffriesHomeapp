import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── Devices (WiZ lampen) ──────────────────────────────────────────────────
  devices: defineTable({
    userId:       v.string(),
    name:         v.string(),
    ipAddress:    v.string(),
    deviceType:   v.string(),              // "color_light"
    roomId:       v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    model:        v.optional(v.string()),
    status:       v.union(v.literal("online"), v.literal("offline")),
    lastSeen:     v.optional(v.string()),  // ISO timestamp
    currentState: v.object({
      on:         v.boolean(),
      brightness: v.number(),
      color_temp: v.number(),
      r:          v.number(),
      g:          v.number(),
      b:          v.number(),
    }),
    commissionedAt: v.string(),            // ISO timestamp
  })
    .index("by_user",    ["userId"])
    .index("by_user_ip", ["userId", "ipAddress"]),

  // ─── Device Commands (queue voor Telegram/AI → lokale bridge) ──────────────
  deviceCommands: defineTable({
    userId:    v.string(),
    deviceId:  v.optional(v.string()),       // Specifiek device, of undefined = ALL
    command:   v.object({
      on:               v.optional(v.boolean()),
      brightness:       v.optional(v.number()),
      color_temp_mireds: v.optional(v.number()),
      r:                v.optional(v.number()),
      g:                v.optional(v.number()),
      b:                v.optional(v.number()),
      scene_id:         v.optional(v.number()),
    }),
    status:    v.union(v.literal("pending"), v.literal("done"), v.literal("failed")),
    bron:      v.string(),                   // "telegram", "grok", "automation"
    createdAt: v.string(),
    doneAt:    v.optional(v.string()),
    error:     v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_user",   ["userId"]),

  // ─── Chat Messages (Telegram conversation memory) ──────────────────────────
  chatMessages: defineTable({
    chatId:    v.number(),                   // Telegram chat ID
    role:      v.union(v.literal("user"), v.literal("assistant")),
    content:   v.string(),
    agentId:   v.optional(v.string()),       // Welke agent antwoordde
    createdAt: v.string(),
  })
    .index("by_chat", ["chatId"]),

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

    berekendOp: v.string(), // ISO timestamp van laatste berekening

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

  // ─── Personal Events (Persoonlijke Google Agenda) ──────────────────────────
  personalEvents: defineTable({
    userId:            v.string(),
    eventId:           v.string(),           // "Titel::startISO" — dedup sleutel
    titel:             v.string(),
    startDatum:        v.string(),           // "YYYY-MM-DD"
    startTijd:         v.optional(v.string()), // "HH:MM" — leeg bij hele-dag events
    eindDatum:         v.string(),
    eindTijd:          v.optional(v.string()),
    heledag:           v.boolean(),
    locatie:           v.optional(v.string()),
    beschrijving:      v.optional(v.string()),
    status:            v.string(),           // "Aankomend" | "Voorbij" | "VERWIJDERD"
    kalender:          v.string(),           // "Main"
    conflictMetDienst: v.optional(v.string()),
  })
    .index("by_user",         ["userId"])
    .index("by_user_date",    ["userId", "startDatum"])
    .index("by_user_status",  ["userId", "status"])
    .index("by_user_eventId", ["userId", "eventId"]),

  // ─── Emails (Gmail sync — metadata + snippet) ─────────────────────────────
  emails: defineTable({
    userId:        v.string(),
    gmailId:       v.string(),                  // Gmail message ID
    threadId:      v.string(),                  // Gmail thread ID

    // Headers
    from:          v.string(),                  // "Naam <email@example.com>"
    to:            v.string(),                  // Comma-separated
    cc:            v.optional(v.string()),
    bcc:           v.optional(v.string()),
    subject:       v.string(),
    snippet:       v.string(),                  // Gmail ~100 char preview

    // Timestamps
    datum:         v.string(),                  // "YYYY-MM-DD"
    ontvangen:     v.number(),                  // Unix ms (internalDate)

    // Status flags
    isGelezen:     v.boolean(),
    isSter:        v.boolean(),                 // Starred
    isVerwijderd:  v.boolean(),                 // Trash
    isDraft:       v.boolean(),

    // Labels
    labelIds:      v.array(v.string()),         // ["INBOX", "IMPORTANT", ...]
    categorie:     v.optional(v.string()),      // "primary" | "social" | "promotions"

    // Bijlagen
    heeftBijlagen: v.boolean(),
    bijlagenCount: v.number(),

    // Zoekbaar — subject + snippet + from + to samengevoegd
    searchText:    v.string(),

    // Sync tracking
    syncedAt:      v.string(),                  // ISO timestamp
  })
    .index("by_user",          ["userId"])
    .index("by_user_datum",    ["userId", "datum"])
    .index("by_user_thread",   ["userId", "threadId"])
    .index("by_user_gmailId",  ["userId", "gmailId"])
    .index("by_user_gelezen",  ["userId", "isGelezen"])
    .searchIndex("search_emails", {
      searchField: "searchText",
      filterFields: ["userId", "isVerwijderd"],
    }),

  // ─── Email Sync Meta ──────────────────────────────────────────────────────
  emailSyncMeta: defineTable({
    userId:       v.string(),
    historyId:    v.string(),                   // Gmail history ID (incremental sync)
    lastFullSync: v.string(),                   // ISO timestamp
    totalSynced:  v.number(),
  }).index("by_user", ["userId"]),

  // ─── Loonstroken (geüploade PDF payslips) ─────────────────────────────────
  loonstroken: defineTable({
    userId:            v.string(),
    jaar:              v.number(),
    periode:           v.number(),          // 1-12
    periodeLabel:      v.string(),          // "2026-03"
    type:              v.string(),          // "loonstrook" | "jaaropgave"

    // Kernbedragen
    netto:             v.number(),
    brutoBetaling:     v.number(),
    brutoInhouding:    v.number(),
    salarisBasis:      v.number(),

    // ORT
    ortTotaal:         v.number(),
    ortDetail:         v.string(),          // JSON: [{pct, uren, bedrag}]

    // Componenten
    amtZeerintensief:  v.optional(v.number()),
    pensioenpremie:    v.optional(v.number()),
    loonheffing:       v.optional(v.number()),
    reiskosten:        v.optional(v.number()),
    vakantietoeslag:   v.optional(v.number()),
    ejuBedrag:         v.optional(v.number()),
    toeslagBalansvlf:  v.optional(v.number()),
    extraUrenBedrag:   v.optional(v.number()),

    // Meta
    schaalnummer:      v.string(),
    trede:             v.string(),
    parttimeFactor:    v.number(),
    uurloon:           v.optional(v.number()),

    // Raw data
    componenten:       v.string(),          // JSON array alle looncomponenten
    cumulatieven:      v.optional(v.string()),

    geimporteerdOp:    v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_periode", ["userId", "jaar", "periode"]),

  // ─── Notes (persoonlijke notities) ──────────────────────────────────────────
  notes: defineTable({
    userId:      v.string(),
    titel:       v.optional(v.string()),
    inhoud:      v.string(),
    tags:        v.optional(v.array(v.string())),
    kleur:       v.optional(v.string()),       // hex kleur
    isPinned:    v.boolean(),
    isArchived:  v.boolean(),
    aangemaakt:  v.string(),                   // ISO timestamp
    gewijzigd:   v.string(),                   // ISO timestamp
  })
    .index("by_user", ["userId"])
    .index("by_user_pinned", ["userId", "isPinned"])
    .searchIndex("search_notes", {
      searchField: "inhoud",
      filterFields: ["userId", "isArchived"],
    }),
});
