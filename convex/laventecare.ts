import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  LAVENTECARE_DOCUMENTS,
  LAVENTECARE_FIT_CRITERIA,
  LAVENTECARE_LEGAL_STACK,
  LAVENTECARE_NO_FIT_SIGNALS,
  LAVENTECARE_PILLARS,
  LAVENTECARE_PRICING,
  LAVENTECARE_PROCESS_STAGES,
  LAVENTECARE_PROFILE,
  searchLaventeCareKnowledge,
} from "./lib/laventecareKnowledge";

type AuthCtx = QueryCtx | MutationCtx;

async function getCurrentUserId(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

async function requireCurrentUserId(ctx: AuthCtx) {
  const userId = await getCurrentUserId(ctx);
  if (!userId) throw new Error("Niet ingelogd");
  return userId;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isOpenStatus(status: string) {
  return !["gewonnen", "verloren", "no_match", "afgerond", "archived", "gesloten"].includes(status);
}

function scoreLead(args: {
  fitScore?: number;
  pijnpunt?: string;
  volgendeStap?: string;
  companyName?: string;
}) {
  if (typeof args.fitScore === "number") return Math.max(0, Math.min(100, args.fitScore));

  let score = 35;
  if (args.companyName?.trim()) score += 15;
  if (args.pijnpunt && args.pijnpunt.trim().length > 30) score += 25;
  if (args.volgendeStap?.trim()) score += 15;
  return Math.min(100, score);
}

type CreateLeadInput = {
  titel: string;
  companyName?: string;
  website?: string;
  bron?: string;
  pijnpunt?: string;
  prioriteit?: string;
  fitScore?: number;
  volgendeStap?: string;
  volgendeActieDatum?: string;
};

type CreateProjectInput = {
  naam: string;
  companyId?: Id<"laventecareCompanies">;
  leadId?: Id<"laventecareLeads">;
  fase?: string;
  status?: string;
  waardeIndicatie?: number;
  startDatum?: string;
  deadline?: string;
  samenvatting?: string;
};

async function createLeadRecord(ctx: MutationCtx, userId: string, args: CreateLeadInput) {
  const now = new Date().toISOString();
  let companyId: Id<"laventecareCompanies"> | undefined = undefined;
  const companyName = args.companyName?.trim();

  if (companyName) {
    const companies = await ctx.db
      .query("laventecareCompanies")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const existing = companies.find((company) => normalize(company.naam) === normalize(companyName));

    companyId = existing?._id ?? (await ctx.db.insert("laventecareCompanies", {
      userId,
      naam:       companyName,
      website:    args.website,
      status:     "prospect",
      fitScore:   scoreLead(args),
      tags:       ["lead"],
      bron:       args.bron ?? "handmatig",
      notities:   args.pijnpunt,
      aangemaakt: now,
      gewijzigd:  now,
    }));
  }

  return ctx.db.insert("laventecareLeads", {
    userId,
    companyId,
    titel:              args.titel.trim(),
    bron:               args.bron ?? "handmatig",
    status:             "nieuw",
    fitScore:           scoreLead(args),
    pijnpunt:           args.pijnpunt,
    prioriteit:         args.prioriteit ?? "normaal",
    volgendeStap:       args.volgendeStap,
    volgendeActieDatum: args.volgendeActieDatum,
    aangemaakt:         now,
    gewijzigd:          now,
  });
}

async function createProjectRecord(ctx: MutationCtx, userId: string, args: CreateProjectInput) {
  const now = new Date().toISOString();

  if (args.companyId) {
    const company = await ctx.db.get(args.companyId);
    if (!company || company.userId !== userId) throw new Error("Bedrijf niet gevonden");
  }

  if (args.leadId) {
    const lead = await ctx.db.get(args.leadId);
    if (!lead || lead.userId !== userId) throw new Error("Lead niet gevonden");
    await ctx.db.patch(args.leadId, { status: "gewonnen", gewijzigd: now });
  }

  return ctx.db.insert("laventecareProjects", {
    userId,
    companyId:       args.companyId,
    leadId:          args.leadId,
    naam:            args.naam.trim(),
    fase:            args.fase ?? "intake",
    status:          args.status ?? "actief",
    waardeIndicatie: args.waardeIndicatie,
    startDatum:      args.startDatum,
    deadline:        args.deadline,
    samenvatting:    args.samenvatting,
    aangemaakt:      now,
    gewijzigd:       now,
  });
}

function knowledgeDocumentForDb(userId: string, document: (typeof LAVENTECARE_DOCUMENTS)[number], now: string) {
  return {
    userId,
    documentKey:  document.key,
    titel:        document.title,
    categorie:    document.category,
    fase:         document.phase,
    versie:       "2026-04",
    sourcePath:   `bedrijfsplan/${document.sourceFile}`,
    samenvatting: document.summary,
    tags:         document.tags,
    aangemaakt:   now,
    gewijzigd:    now,
  };
}

export const getCockpit = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return null;

    const [companies, leads, projects, incidents, changes, decisions, documents] = await Promise.all([
      ctx.db.query("laventecareCompanies").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("laventecareLeads").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("laventecareProjects").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("laventecareSlaIncidents").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("laventecareChangeRequests").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("laventecareDecisions").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("laventecareDocuments").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
    ]);

    const byChanged = <T extends { gewijzigd?: string; aangemaakt?: string }>(items: T[]) =>
      [...items].sort((a, b) => (b.gewijzigd ?? b.aangemaakt ?? "").localeCompare(a.gewijzigd ?? a.aangemaakt ?? ""));

    const activeLeads = byChanged(leads.filter((lead) => isOpenStatus(lead.status))).slice(0, 8);
    const activeProjects = byChanged(projects.filter((project) => isOpenStatus(project.status))).slice(0, 8);
    const openIncidents = byChanged(incidents.filter((incident) => isOpenStatus(incident.status))).slice(0, 5);
    const openChanges = byChanged(changes.filter((change) => isOpenStatus(change.status))).slice(0, 5);
    const recentDecisions = [...decisions].sort((a, b) => b.datum.localeCompare(a.datum)).slice(0, 5);

    return {
      profile: LAVENTECARE_PROFILE,
      summary: {
        companies: companies.length,
        leads: leads.length,
        activeLeads: activeLeads.length,
        projects: projects.length,
        activeProjects: activeProjects.length,
        documents: documents.length,
        knowledgeDocuments: LAVENTECARE_DOCUMENTS.length,
        documentsSeeded: documents.length >= LAVENTECARE_DOCUMENTS.length,
        openIncidents: openIncidents.length,
        openChanges: openChanges.length,
        decisions: decisions.length,
      },
      activeLeads,
      activeProjects,
      openIncidents,
      openChanges,
      recentDecisions,
      documentCatalog: documents.length > 0 ? documents : LAVENTECARE_DOCUMENTS.map((doc) => ({
        documentKey:  doc.key,
        titel:        doc.title,
        categorie:    doc.category,
        fase:         doc.phase,
        versie:       "2026-04",
        sourcePath:   `bedrijfsplan/${doc.sourceFile}`,
        samenvatting: doc.summary,
        tags:         doc.tags,
      })),
      processStages: LAVENTECARE_PROCESS_STAGES,
      pillars: LAVENTECARE_PILLARS,
      pricing: LAVENTECARE_PRICING,
      legalStack: LAVENTECARE_LEGAL_STACK,
      fitCriteria: LAVENTECARE_FIT_CRITERIA,
      noFitSignals: LAVENTECARE_NO_FIT_SIGNALS,
    };
  },
});

export const listDocuments = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];

    const docs = await ctx.db
      .query("laventecareDocuments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (docs.length > 0) return docs;

    return LAVENTECARE_DOCUMENTS.map((doc) => ({
      documentKey:  doc.key,
      titel:        doc.title,
      categorie:    doc.category,
      fase:         doc.phase,
      versie:       "2026-04",
      sourcePath:   `bedrijfsplan/${doc.sourceFile}`,
      samenvatting: doc.summary,
      tags:         doc.tags,
    }));
  },
});

export const searchKnowledge = query({
  args: { term: v.string() },
  handler: async (ctx, { term }) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];

    const needle = normalize(term);
    const docs = await ctx.db
      .query("laventecareDocuments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (docs.length > 0) {
      return docs.filter((doc) => {
        const haystack = normalize([doc.titel, doc.categorie, doc.fase, doc.samenvatting, ...(doc.tags ?? [])].join(" "));
        return !needle || haystack.includes(needle);
      });
    }

    return searchLaventeCareKnowledge(term).map((doc) => ({
      documentKey:  doc.key,
      titel:        doc.title,
      categorie:    doc.category,
      fase:         doc.phase,
      versie:       "2026-04",
      sourcePath:   `bedrijfsplan/${doc.sourceFile}`,
      samenvatting: doc.summary,
      tags:         doc.tags,
    }));
  },
});

export const searchKnowledgeInternal = internalQuery({
  args: { userId: v.string(), term: v.string() },
  handler: async (ctx, { userId, term }) => {
    const needle = normalize(term);
    const docs = await ctx.db
      .query("laventecareDocuments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (docs.length > 0) {
      return docs
        .filter((doc) => {
          const haystack = normalize([doc.titel, doc.categorie, doc.fase, doc.samenvatting, ...(doc.tags ?? [])].join(" "));
          return !needle || haystack.includes(needle);
        })
        .slice(0, 12);
    }

    return searchLaventeCareKnowledge(term).slice(0, 12).map((doc) => ({
      documentKey:  doc.key,
      titel:        doc.title,
      categorie:    doc.category,
      fase:         doc.phase,
      versie:       "2026-04",
      sourcePath:   `bedrijfsplan/${doc.sourceFile}`,
      samenvatting: doc.summary,
      tags:         doc.tags,
    }));
  },
});

export const seedDocuments = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireCurrentUserId(ctx);
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("laventecareDocuments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const byKey = new Map(existing.map((doc) => [doc.documentKey, doc]));

    let inserted = 0;
    let updated = 0;

    for (const document of LAVENTECARE_DOCUMENTS) {
      const payload = knowledgeDocumentForDb(userId, document, now);
      const current = byKey.get(document.key);
      if (current) {
        await ctx.db.patch(current._id, {
          titel:        payload.titel,
          categorie:    payload.categorie,
          fase:         payload.fase,
          versie:       payload.versie,
          sourcePath:   payload.sourcePath,
          samenvatting: payload.samenvatting,
          tags:         payload.tags,
          gewijzigd:    now,
        });
        updated += 1;
      } else {
        await ctx.db.insert("laventecareDocuments", payload);
        inserted += 1;
      }
    }

    return { inserted, updated, total: LAVENTECARE_DOCUMENTS.length };
  },
});

export const createLead = mutation({
  args: {
    titel:              v.string(),
    companyName:        v.optional(v.string()),
    website:            v.optional(v.string()),
    bron:               v.optional(v.string()),
    pijnpunt:           v.optional(v.string()),
    prioriteit:         v.optional(v.string()),
    fitScore:           v.optional(v.number()),
    volgendeStap:       v.optional(v.string()),
    volgendeActieDatum: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    return createLeadRecord(ctx, userId, args);
  },
});

export const createLeadInternal = internalMutation({
  args: {
    userId:             v.string(),
    titel:              v.string(),
    companyName:        v.optional(v.string()),
    website:            v.optional(v.string()),
    bron:               v.optional(v.string()),
    pijnpunt:           v.optional(v.string()),
    prioriteit:         v.optional(v.string()),
    fitScore:           v.optional(v.number()),
    volgendeStap:       v.optional(v.string()),
    volgendeActieDatum: v.optional(v.string()),
  },
  handler: async (ctx, { userId, ...args }) => createLeadRecord(ctx, userId, args),
});

export const updateLead = mutation({
  args: {
    id:                 v.id("laventecareLeads"),
    status:             v.optional(v.string()),
    fitScore:           v.optional(v.number()),
    pijnpunt:           v.optional(v.string()),
    prioriteit:         v.optional(v.string()),
    volgendeStap:       v.optional(v.string()),
    volgendeActieDatum: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const userId = await requireCurrentUserId(ctx);
    const lead = await ctx.db.get(id);
    if (!lead || lead.userId !== userId) throw new Error("Lead niet gevonden");

    const patch: Record<string, unknown> = { gewijzigd: new Date().toISOString() };
    if (fields.status !== undefined) patch.status = fields.status;
    if (fields.fitScore !== undefined) patch.fitScore = Math.max(0, Math.min(100, fields.fitScore));
    if (fields.pijnpunt !== undefined) patch.pijnpunt = fields.pijnpunt;
    if (fields.prioriteit !== undefined) patch.prioriteit = fields.prioriteit;
    if (fields.volgendeStap !== undefined) patch.volgendeStap = fields.volgendeStap;
    if (fields.volgendeActieDatum !== undefined) patch.volgendeActieDatum = fields.volgendeActieDatum;

    await ctx.db.patch(id, patch);
  },
});

export const createProject = mutation({
  args: {
    naam:            v.string(),
    companyId:       v.optional(v.id("laventecareCompanies")),
    leadId:          v.optional(v.id("laventecareLeads")),
    fase:            v.optional(v.string()),
    status:          v.optional(v.string()),
    waardeIndicatie: v.optional(v.number()),
    startDatum:      v.optional(v.string()),
    deadline:        v.optional(v.string()),
    samenvatting:    v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    return createProjectRecord(ctx, userId, args);
  },
});

export const createProjectInternal = internalMutation({
  args: {
    userId:          v.string(),
    naam:            v.string(),
    companyId:       v.optional(v.id("laventecareCompanies")),
    leadId:          v.optional(v.id("laventecareLeads")),
    fase:            v.optional(v.string()),
    status:          v.optional(v.string()),
    waardeIndicatie: v.optional(v.number()),
    startDatum:      v.optional(v.string()),
    deadline:        v.optional(v.string()),
    samenvatting:    v.optional(v.string()),
  },
  handler: async (ctx, { userId, ...args }) => createProjectRecord(ctx, userId, args),
});

export const getAgentContextInternal = internalQuery({
  args: { userId: v.string(), lite: v.optional(v.boolean()) },
  handler: async (ctx, { userId, lite }) => {
    const [leads, projects, incidents, documents] = await Promise.all([
      ctx.db.query("laventecareLeads").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("laventecareProjects").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("laventecareSlaIncidents").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("laventecareDocuments").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
    ]);

    const openLeads = leads.filter((lead) => isOpenStatus(lead.status));
    const activeProjects = projects.filter((project) => isOpenStatus(project.status));
    const openIncidents = incidents.filter((incident) => isOpenStatus(incident.status));

    if (lite) {
      return {
        profiel: LAVENTECARE_PROFILE.rol,
        funnel: `${openLeads.length} open leads, ${activeProjects.length} actieve projecten`,
        documentatie: `${documents.length || LAVENTECARE_DOCUMENTS.length} documenten beschikbaar`,
        sla: `${openIncidents.length} open incidenten`,
        proces: LAVENTECARE_PROCESS_STAGES.map((stage) => stage.title),
      };
    }

    return {
      profiel: LAVENTECARE_PROFILE,
      pijlers: LAVENTECARE_PILLARS,
      proces: LAVENTECARE_PROCESS_STAGES,
      pricing: LAVENTECARE_PRICING,
      fitCriteria: LAVENTECARE_FIT_CRITERIA,
      noFitSignals: LAVENTECARE_NO_FIT_SIGNALS,
      legalStack: LAVENTECARE_LEGAL_STACK,
      funnel: {
        leads: leads.length,
        openLeads: openLeads.slice(0, 10),
        projecten: projects.length,
        actieveProjecten: activeProjects.slice(0, 10),
        openIncidenten: openIncidents.slice(0, 10),
      },
      documentatie: documents.length > 0 ? documents.slice(0, 24) : LAVENTECARE_DOCUMENTS,
    };
  },
});
