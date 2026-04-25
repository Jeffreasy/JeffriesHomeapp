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

  // ─── Rooms (lokale smart-home groepering) ─────────────────────────────────
  rooms: defineTable({
    userId:      v.string(),
    name:        v.string(),
    icon:        v.string(),
    floorNumber: v.number(),
    createdAt:   v.string(),
    updatedAt:   v.string(),
  })
    .index("by_user", ["userId"]),

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

  // ─── Bridge Health (lokale command bridge heartbeat) ──────────────────────
  bridgeHealth: defineTable({
    bridgeId:       v.string(),
    status:         v.string(),                  // "online" | "warning" | "error"
    apiBase:        v.optional(v.string()),
    version:        v.optional(v.string()),
    lastSeenAt:     v.string(),
    lastPollAt:     v.optional(v.string()),
    lastSuccessAt:  v.optional(v.string()),
    lastErrorAt:    v.optional(v.string()),
    lastError:      v.optional(v.string()),
    commandsSeen:   v.number(),
    commandsDone:   v.number(),
    commandsFailed: v.number(),
    updatedAt:      v.string(),
  })
    .index("by_bridge", ["bridgeId"])
    .index("by_updated", ["updatedAt"]),

  // ─── Audit Log (gevoelige acties en systeemmutaties) ──────────────────────
  auditLogs: defineTable({
    userId:    v.optional(v.string()),
    actor:     v.string(),                       // "user" | "telegram" | "grok" | "bridge" | "system"
    source:    v.string(),                       // pagina/tool/route
    action:    v.string(),
    entity:    v.string(),
    entityId:  v.optional(v.string()),
    status:    v.string(),                       // "success" | "failed" | "pending" | "cancelled"
    summary:   v.string(),
    metadata:  v.optional(v.string()),           // JSON string, nooit secrets
    createdAt: v.string(),
  })
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_created", ["createdAt"]),

  // ─── Sync Status (laatste run per databron) ────────────────────────────────
  syncStatus: defineTable({
    userId:        v.string(),
    source:        v.string(),                   // "schedule" | "personal" | "gmail"
    status:        v.string(),                   // "running" | "success" | "failed"
    startedAt:     v.optional(v.string()),
    finishedAt:    v.optional(v.string()),
    lastSuccessAt: v.optional(v.string()),
    lastErrorAt:   v.optional(v.string()),
    lastError:     v.optional(v.string()),
    result:        v.optional(v.string()),       // JSON summary
    updatedAt:     v.string(),
  })
    .index("by_user_source", ["userId", "source"])
    .index("by_user", ["userId"]),

  // ─── Privacy Settings (centrale privacy voorkeuren) ───────────────────────
  privacySettings: defineTable({
    userId:     v.string(),
    finance:    v.boolean(),
    habits:     v.boolean(),
    notes:      v.boolean(),
    email:      v.boolean(),
    account:    v.boolean(),
    updatedAt:  v.string(),
  })
    .index("by_user", ["userId"]),

  // ─── Brain Preferences (persoonlijk gedrag van de centrale AI) ─────────────
  brainPreferences: defineTable({
    userId:         v.string(),
    detailLevel:    v.union(v.literal("kort"), v.literal("normaal"), v.literal("uitgebreid")),
    tone:           v.union(v.literal("direct"), v.literal("warm"), v.literal("coachend")),
    proactiveLevel: v.union(v.literal("laag"), v.literal("normaal"), v.literal("hoog")),
    focusAreas:     v.array(v.string()),
    briefingTime:   v.optional(v.string()), // HH:MM Europe/Amsterdam
    quietHoursStart: v.optional(v.string()), // HH:MM
    quietHoursEnd:   v.optional(v.string()), // HH:MM
    updatedAt:      v.string(),
  })
    .index("by_user", ["userId"]),

  // ─── Chat Messages (Telegram conversation memory) ──────────────────────────
  chatMessages: defineTable({
    chatId:    v.number(),                   // Telegram chat ID
    role:      v.union(v.literal("user"), v.literal("assistant")),
    content:   v.string(),
    agentId:   v.optional(v.string()),       // Welke agent antwoordde
    createdAt: v.string(),
  })
    .index("by_chat", ["chatId"]),

  // ─── AI Pending Actions (Grok write-confirmation queue) ────────────────────
  aiPendingActions: defineTable({
    userId:      v.string(),
    agentId:     v.string(),
    toolName:    v.string(),
    argsJson:    v.string(),
    summary:     v.string(),
    code:        v.string(),
    status:      v.union(
      v.literal("pending"),
      v.literal("executing"),
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("expired"),
      v.literal("failed"),
    ),
    createdAt:   v.string(),
    expiresAt:   v.string(),
    confirmedAt: v.optional(v.string()),
    result:      v.optional(v.string()),
    error:       v.optional(v.string()),
  })
    .index("by_user_status", ["userId", "status"])
    .index("by_user_code_status", ["userId", "code", "status"]),

  // ─── LaventeCare Companies (bedrijfscockpit) ───────────────────────────────
  laventecareCompanies: defineTable({
    userId:    v.string(),
    naam:      v.string(),
    website:   v.optional(v.string()),
    sector:    v.optional(v.string()),
    omvang:    v.optional(v.string()),
    status:    v.string(),                   // prospect | klant | partner | archived
    fitScore:  v.optional(v.number()),        // 0-100 kwalificatie
    tags:      v.optional(v.array(v.string())),
    bron:      v.optional(v.string()),
    notities:  v.optional(v.string()),
    aangemaakt: v.string(),
    gewijzigd:  v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  // ─── LaventeCare Contacts ─────────────────────────────────────────────────
  laventecareContacts: defineTable({
    userId:       v.string(),
    companyId:    v.optional(v.id("laventecareCompanies")),
    naam:         v.string(),
    email:        v.optional(v.string()),
    telefoon:     v.optional(v.string()),
    rol:          v.optional(v.string()),
    isBeslisser:  v.boolean(),
    aangemaakt:   v.string(),
    gewijzigd:    v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_company", ["companyId"]),

  // ─── LaventeCare Leads ────────────────────────────────────────────────────
  laventecareLeads: defineTable({
    userId:              v.string(),
    companyId:           v.optional(v.id("laventecareCompanies")),
    contactId:           v.optional(v.id("laventecareContacts")),
    titel:               v.string(),
    bron:                v.string(),
    status:              v.string(),          // nieuw | intake | discovery | voorstel | gewonnen | verloren | no_match
    fitScore:            v.optional(v.number()),
    pijnpunt:            v.optional(v.string()),
    prioriteit:          v.optional(v.string()),
    volgendeStap:        v.optional(v.string()),
    volgendeActieDatum:  v.optional(v.string()),
    aangemaakt:          v.string(),
    gewijzigd:           v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_next_action", ["userId", "volgendeActieDatum"]),

  // ─── LaventeCare Projects ─────────────────────────────────────────────────
  laventecareProjects: defineTable({
    userId:          v.string(),
    companyId:       v.optional(v.id("laventecareCompanies")),
    leadId:          v.optional(v.id("laventecareLeads")),
    naam:            v.string(),
    fase:            v.string(),              // intake | discovery | blueprint | realisatie | sla | evolution | afgerond
    status:          v.string(),              // actief | wacht_op_klant | geblokkeerd | afgerond | archived
    waardeIndicatie: v.optional(v.number()),
    startDatum:      v.optional(v.string()),
    deadline:        v.optional(v.string()),
    samenvatting:    v.optional(v.string()),
    aangemaakt:      v.string(),
    gewijzigd:       v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_fase", ["userId", "fase"])
    .index("by_company", ["companyId"]),

  // ─── LaventeCare Documents (geindexeerde bedrijfsdocumentatie) ────────────
  laventecareDocuments: defineTable({
    userId:      v.string(),
    documentKey: v.string(),
    titel:       v.string(),
    categorie:   v.string(),
    fase:        v.optional(v.string()),
    versie:      v.string(),
    sourcePath:  v.optional(v.string()),
    samenvatting: v.string(),
    tags:        v.array(v.string()),
    aangemaakt:  v.string(),
    gewijzigd:   v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_key", ["userId", "documentKey"]),

  // ─── LaventeCare Decisions ────────────────────────────────────────────────
  laventecareDecisions: defineTable({
    userId:     v.string(),
    projectId:  v.optional(v.id("laventecareProjects")),
    titel:      v.string(),
    besluit:    v.string(),
    reden:      v.string(),
    impact:     v.optional(v.string()),
    status:     v.string(),                   // voorgesteld | genomen | herzien
    datum:      v.string(),
    aangemaakt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"]),

  // ─── LaventeCare Change Requests ──────────────────────────────────────────
  laventecareChangeRequests: defineTable({
    userId:         v.string(),
    projectId:      v.optional(v.id("laventecareProjects")),
    titel:          v.string(),
    impact:         v.string(),
    planningImpact: v.optional(v.string()),
    budgetImpact:   v.optional(v.string()),
    status:         v.string(),               // nieuw | beoordeeld | akkoord | afgewezen | uitgevoerd
    aangemaakt:     v.string(),
    gewijzigd:      v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"]),

  // ─── LaventeCare SLA Incidents ────────────────────────────────────────────
  laventecareSlaIncidents: defineTable({
    userId:           v.string(),
    projectId:        v.optional(v.id("laventecareProjects")),
    titel:            v.string(),
    prioriteit:       v.string(),             // P1 | P2 | P3 | P4
    status:           v.string(),             // open | in_behandeling | wacht_op_klant | opgelost | gesloten
    kanaal:           v.string(),
    gemeldOp:         v.string(),
    reactieDeadline:  v.optional(v.string()),
    samenvatting:     v.optional(v.string()),
    aangemaakt:       v.string(),
    gewijzigd:        v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"])
    .index("by_user_status", ["userId", "status"]),

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
    conflictMetDienst: v.optional(v.string()),  // dienst-conflict detectie
    status:            v.string(),           // "Aankomend" | "Voorbij" | "VERWIJDERD"
    kalender:          v.string(),           // "Main"
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
    userId:        v.string(),
    titel:         v.optional(v.string()),
    inhoud:        v.string(),
    tags:          v.optional(v.array(v.string())),
    kleur:         v.optional(v.string()),       // hex kleur
    isPinned:      v.boolean(),
    isArchived:    v.boolean(),
    deadline:      v.optional(v.string()),       // ISO timestamp — "doe dit voor..."
    linkedEventId: v.optional(v.string()),       // personalEvents eventId koppeling
    prioriteit:    v.optional(v.string()),       // "hoog" | "normaal" | "laag"
    triageFlag:    v.optional(v.boolean()),      // true = kandidaat voor archivering (cron)
    aangemaakt:    v.string(),                   // ISO timestamp
    gewijzigd:     v.string(),                   // ISO timestamp
  })
    .index("by_user", ["userId"])
    .index("by_user_pinned", ["userId", "isPinned"])
    .index("by_user_deadline", ["userId", "deadline"])
    .searchIndex("search_notes", {
      searchField: "inhoud",
      filterFields: ["userId", "isArchived"],
    }),

  // ─── Note Links (Zettelkasten bi-directionele links) ────────────────────────
  noteLinks: defineTable({
    userId:     v.string(),
    sourceId:   v.id("notes"),               // notitie die de [[link]] bevat
    targetId:   v.id("notes"),               // notitie waarnaar gelinkt wordt
    aangemaakt: v.string(),                  // ISO timestamp
  })
    .index("by_source", ["sourceId"])
    .index("by_target", ["targetId"])
    .index("by_user",   ["userId"]),

  // ─── Habits (gewoonte-definities) ───────────────────────────────────────────
  habits: defineTable({
    userId:           v.string(),
    naam:             v.string(),
    emoji:            v.string(),
    type:             v.union(v.literal("positief"), v.literal("negatief")),
    beschrijving:     v.optional(v.string()),

    // Frequentie
    frequentie:       v.union(
      v.literal("dagelijks"),
      v.literal("weekdagen"),
      v.literal("weekenddagen"),
      v.literal("aangepast"),
      v.literal("x_per_week"),
      v.literal("x_per_maand"),
    ),
    aangepasteDagen:  v.optional(v.array(v.number())),   // [0=zo,1=ma,...6=za]
    doelAantal:       v.optional(v.number()),            // bij x_per_week/maand

    // Rooster integratie
    roosterFilter:    v.optional(v.union(
      v.literal("alle"),
      v.literal("werkdagen"),
      v.literal("vrijeDagen"),
      v.literal("vroegeDienst"),
      v.literal("lateDienst"),
    )),

    // Kwantitatief & Tijd
    isKwantitatief:   v.boolean(),
    doelWaarde:       v.optional(v.number()),            // bv. 2000 (ml water), 30 (min)
    eenheid:          v.optional(v.string()),            // "ml", "min", "pagina's", "stappen"
    doelTijd:         v.optional(v.string()),            // "07:00" — doeltijdstip (HH:mm)

    // Gamification
    xpPerVoltooiing:  v.number(),
    moeilijkheid:     v.union(v.literal("makkelijk"), v.literal("normaal"), v.literal("moeilijk")),

    // Finance koppeling
    financieCategorie: v.optional(v.string()),

    // Streak tracking (denormalized)
    huidigeStreak:    v.number(),
    langsteStreak:    v.number(),
    totaalVoltooid:   v.number(),
    totaalXP:         v.number(),

    // Meta
    kleur:            v.optional(v.string()),
    volgorde:         v.number(),
    isActief:         v.boolean(),
    isPauze:          v.boolean(),
    gepauzeerOm:      v.optional(v.string()),
    aangemaakt:       v.string(),
    gewijzigd:        v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_actief", ["userId", "isActief"]),

  // ─── Habit Logs (voltooiings-registratie) ──────────────────────────────────
  habitLogs: defineTable({
    userId:     v.string(),
    habitId:    v.id("habits"),
    datum:      v.string(),                              // "YYYY-MM-DD"
    voltooid:   v.boolean(),
    waarde:     v.optional(v.number()),                  // kwantitatief: actuele waarde
    isIncident: v.boolean(),                             // negatieve habit incident
    trigger:    v.optional(v.string()),                  // incident trigger categorie
    notitie:    v.optional(v.string()),
    bron:       v.string(),                              // "web" | "telegram" | "grok"
    xpVerdiend: v.number(),
    aangemaakt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_habit", ["habitId"])
    .index("by_habit_datum", ["habitId", "datum"])
    .index("by_user_datum", ["userId", "datum"]),

  // ─── Habit Badges (behaalde achievements) ──────────────────────────────────
  habitBadges: defineTable({
    userId:       v.string(),
    badgeId:      v.string(),
    habitId:      v.optional(v.id("habits")),
    naam:         v.string(),
    emoji:        v.string(),
    beschrijving: v.string(),
    xpBonus:      v.number(),
    behaaldOp:    v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_badge", ["userId", "badgeId"]),
});

