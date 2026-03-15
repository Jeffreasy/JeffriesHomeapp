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
});
