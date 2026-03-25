/**
 * convex/ai/grok.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Grok AI Chat met Tool Calling — kan zelf data ophalen op verzoek.
 *
 * Tools:
 *   - leesEmail(gmailId)    → volledige email body ophalen
 *   - zoekEmails(zoekterm)  → emails doorzoeken
 *   - lampStatus()          → live lamp status
 *   - lampBedien(actie)     → lamp aan/uit/dim command queuen
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { AGENT_REGISTRY, toMeta } from "./registry";
import type { AgentMeta } from "./registry";

const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
const GROK_MODEL   = "grok-4-1-fast";
const OWNER_USER_ID = "user_3Ax561ZvuSkGtWpKFooeY65HNtY";
const MAX_TOOL_ROUNDS = 5;

// ─── Tool Definitions (xAI function calling format) ──────────────────────────

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "leesEmail",
      description: "Haal de volledige inhoud (body, van, aan, onderwerp, bijlagen) van een specifiek email bericht op via Gmail ID. Gebruik dit wanneer de gebruiker vraagt om een email te lezen of meer context wil over een specifiek bericht.",
      parameters: {
        type: "object",
        properties: {
          gmailId: { type: "string", description: "Het Gmail bericht ID (bijv. '1945a3b2c4d5e6f7')" },
        },
        required: ["gmailId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "zoekEmails",
      description: "Doorzoek alle emails op onderwerp, afzender of inhoud. Gebruik dit als de gebruiker vraagt naar een specifieke email, afzender of onderwerp.",
      parameters: {
        type: "object",
        properties: {
          zoekterm: { type: "string", description: "Zoekterm (doorzoekt subject, snippet, afzender)" },
        },
        required: ["zoekterm"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "lampBedien",
      description: "Bedien de WiZ lampen. Kan: aan/uit, helderheid, scene, RGB kleur, kleurtemperatuur, of specifieke lamp selecteren. Scenes: 1=Ocean, 2=Romance, 3=Sunset, 4=Party, 5=Fireplace, 6=Cozy, 7=Forest, 8=Pastel Colors, 9=Wake Up, 10=Bedtime, 11=Warm White, 12=Daylight, 13=Cool White, 14=Night Light, 15=Focus, 16=Relax, 17=True Colors, 18=TV Time, 19=Plant Growth, 20=Spring, 21=Summer, 22=Fall, 23=Deep Dive, 24=Jungle, 25=Mojito, 26=Club, 27=Christmas, 28=Halloween, 29=Candlelight, 30=Golden White, 31=Pulse, 32=Steampunk.",
      parameters: {
        type: "object",
        properties: {
          actie: { type: "string", enum: ["aan", "uit", "dim", "vol", "scene", "kleur", "temperatuur"], description: "Type actie" },
          helderheid: { type: "number", description: "Helderheid 1-100 (voor dim/vol)" },
          sceneId: { type: "number", description: "WiZ scene ID (1-32), bijv. 6=Cozy, 18=TV Time" },
          r: { type: "number", description: "Rood (0-255) voor RGB kleur" },
          g: { type: "number", description: "Groen (0-255) voor RGB kleur" },
          b: { type: "number", description: "Blauw (0-255) voor RGB kleur" },
          kleurTemp: { type: "number", description: "Kleurtemperatuur in Kelvin (2200=warm, 4000=neutraal, 6500=koud)" },
          lampNaam: { type: "string", description: "Optioneel: naam van specifieke lamp (bijv. 'Slaapkamer'). Leeg = alle lampen." },
        },
        required: ["actie"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "markeerGelezen",
      description: "Markeer een email als gelezen of ongelezen in Gmail. Gebruik dit na het lezen van een email of wanneer de gebruiker vraagt om emails als gelezen te markeren.",
      parameters: {
        type: "object",
        properties: {
          gmailId: { type: "string", description: "Gmail bericht ID" },
          gelezen: { type: "boolean", description: "true=markeer als gelezen, false=markeer als ongelezen" },
        },
        required: ["gmailId", "gelezen"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "verwijderEmail",
      description: "Verplaats een email naar de prullenbak. Gebruik dit wanneer de gebruiker een email wil verwijderen of opruimen.",
      parameters: {
        type: "object",
        properties: {
          gmailId: { type: "string", description: "Gmail bericht ID" },
        },
        required: ["gmailId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "markeerSter",
      description: "Voeg een ster toe of verwijder deze van een email. Gebruik dit voor belangrijke emails.",
      parameters: {
        type: "object",
        properties: {
          gmailId: { type: "string", description: "Gmail bericht ID" },
          ster: { type: "boolean", description: "true=ster toevoegen, false=ster verwijderen" },
        },
        required: ["gmailId", "ster"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "emailVersturen",
      description: "Verstuur een nieuwe email via Gmail. GEBRUIK DIT ALLEEN als de gebruiker expliciet vraagt om een email te versturen. Vraag altijd eerst om bevestiging.",
      parameters: {
        type: "object",
        properties: {
          aan: { type: "string", description: "Ontvanger email adres" },
          onderwerp: { type: "string", description: "Email onderwerp" },
          body: { type: "string", description: "Email body tekst" },
          cc: { type: "string", description: "CC adressen (optioneel)" },
        },
        required: ["aan", "onderwerp", "body"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "emailBeantwoorden",
      description: "Beantwoord een bestaande email thread. GEBRUIK DIT ALLEEN als de gebruiker expliciet vraagt om te antwoorden. Vraag altijd eerst om bevestiging.",
      parameters: {
        type: "object",
        properties: {
          gmailId: { type: "string", description: "Gmail bericht ID om op te antwoorden" },
          threadId: { type: "string", description: "Thread ID" },
          aan: { type: "string", description: "Ontvanger email adres" },
          body: { type: "string", description: "Reply body tekst" },
        },
        required: ["gmailId", "threadId", "aan", "body"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "bulkMarkeerGelezen",
      description: "Markeer MEERDERE emails tegelijk als gelezen. Gebruik dit voor bulk operaties zoals 'markeer alle promoties als gelezen'. Geef een array van gmailIds.",
      parameters: {
        type: "object",
        properties: {
          gmailIds: { type: "array", items: { type: "string" }, description: "Array van Gmail bericht IDs" },
          gelezen: { type: "boolean", description: "true=gelezen, false=ongelezen" },
        },
        required: ["gmailIds", "gelezen"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "bulkVerwijder",
      description: "Verwijder MEERDERE emails tegelijk naar prullenbak. Gebruik dit voor bulk opruimen.",
      parameters: {
        type: "object",
        properties: {
          gmailIds: { type: "array", items: { type: "string" }, description: "Array van Gmail bericht IDs" },
        },
        required: ["gmailIds"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "inboxOpruimen",
      description: "Smart inbox opruim-tool. Filtert emails op categorie, leeftijd, of afzender en voert bulk acties uit. Gebruik dit als de gebruiker vraagt om inbox op te schonen, promoties te verwijderen, of nieuwsbrieven op te ruimen.",
      parameters: {
        type: "object",
        properties: {
          filter: { 
            type: "string", 
            enum: ["promoties", "social", "forums", "updates", "oud_ongelezen", "van_afzender"],
            description: "Welke emails te filteren" 
          },
          actie: {
            type: "string",
            enum: ["gelezen_markeren", "verwijderen"],
            description: "Wat te doen met de gefilterde emails"
          },
          afzender: { type: "string", description: "Afzender naam/email (alleen bij filter=van_afzender)" },
          maxAantal: { type: "number", description: "Max aantal emails om te verwerken (default 50)" },
        },
        required: ["filter", "actie"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "dienstenOpvragen",
      description: "Haal diensten/shifts op voor een specifieke maand of periode. Gebruik dit als de gebruiker vraagt naar diensten buiten de huidige 7-dagen context, bijv. 'geef mij april diensten' of 'wat werk ik in mei'. Data beschikbaar van -30 tot +90 dagen.",
      parameters: {
        type: "object",
        properties: {
          maand: { type: "number", description: "Maandnummer (1-12), bijv. 4 voor april" },
          jaar: { type: "number", description: "Jaar, bijv. 2026 (default: huidig jaar)" },
          vanDatum: { type: "string", description: "Optioneel: startdatum YYYY-MM-DD (override maand)" },
          totDatum: { type: "string", description: "Optioneel: einddatum YYYY-MM-DD (override maand)" },
        },
        required: ["maand"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "salarisOpvragen",
      description: "Haal salaris/loon informatie op voor een specifieke maand. Toont bruto, netto, ORT-toeslag, basis loon, en aantal diensten. Gebruik dit als de gebruiker vraagt naar salaris, loon, ORT, of wat ze verdienen in een specifieke maand.",
      parameters: {
        type: "object",
        properties: {
          maand: { type: "number", description: "Maandnummer (1-12)" },
          jaar: { type: "number", description: "Jaar (default: huidig jaar)" },
        },
        required: ["maand"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "transactiesZoeken",
      description: "Doorzoek bank transacties op tegenpartij, omschrijving of categorie. Gebruik dit als de gebruiker vraagt naar specifieke uitgaven, betalingen, of transacties.",
      parameters: {
        type: "object",
        properties: {
          zoekterm: { type: "string", description: "Zoekterm (doorzoekt tegenpartij, omschrijving)" },
          categorie: { type: "string", description: "Optioneel: filter op categorie", enum: ["Boodschappen", "Vaste lasten", "Vrije tijd", "Abonnementen", "Vervoer", "Zorg", "Overig"] },
          maxAantal: { type: "number", description: "Max resultaten (default 15)" },
        },
        required: ["zoekterm"],
      },
    },
  },
];

// ─── Tool Execution ──────────────────────────────────────────────────────────

async function executeTool(
  ctx: any,
  toolName: string,
  args: Record<string, unknown>,
): Promise<string> {
  switch (toolName) {
    case "leesEmail": {
      try {
        const result = await ctx.runAction(api.actions.getGmailBody.getBody, {
          userId: OWNER_USER_ID,
          gmailId: args.gmailId as string,
        });
        // Truncate HTML, geef text body + metadata
        const body = result.text || result.html?.replace(/<[^>]+>/g, " ").slice(0, 2000) || "(geen body)";
        return JSON.stringify({
          van: result.from, aan: result.to, cc: result.cc,
          onderwerp: result.subject, datum: result.date,
          body: body.slice(0, 2000),
          bijlagen: result.attachments?.map((a: any) => a.filename) ?? [],
        });
      } catch (err) {
        return JSON.stringify({ error: `Kon email niet ophalen: ${(err as Error).message}` });
      }
    }

    case "zoekEmails": {
      try {
        const zoekterm = (args.zoekterm as string).toLowerCase();
        const allEmails = await ctx.runQuery(api.emails.list, {
          userId: OWNER_USER_ID,
        });
        const matches = allEmails
          .filter((e: any) =>
            e.subject?.toLowerCase().includes(zoekterm) ||
            e.from?.toLowerCase().includes(zoekterm) ||
            e.snippet?.toLowerCase().includes(zoekterm)
          )
          .slice(0, 10)
          .map((e: any) => ({
            gmailId: e.gmailId, van: e.from?.replace(/<.*>/, "").trim(),
            onderwerp: e.subject, snippet: e.snippet?.slice(0, 80),
            datum: e.datum, gelezen: e.isGelezen,
          }));
        return JSON.stringify({ resultaten: matches.length, emails: matches });
      } catch (err) {
        return JSON.stringify({ error: `Zoeken mislukt: ${(err as Error).message}` });
      }
    }

    case "lampBedien": {
      const actie = args.actie as string;
      const cmd: Record<string, unknown> = {};

      switch (actie) {
        case "aan":         cmd.on = true; break;
        case "uit":         cmd.on = false; break;
        case "dim":         cmd.brightness = (args.helderheid as number) ?? 30; break;
        case "vol":         cmd.brightness = 100; break;
        case "scene":       cmd.scene_id = args.sceneId as number; cmd.on = true; break;
        case "kleur":       cmd.r = args.r as number; cmd.g = args.g as number; cmd.b = args.b as number; cmd.on = true; break;
        case "temperatuur": {
          const kelvin = (args.kleurTemp as number) ?? 4000;
          cmd.color_temp_mireds = Math.round(1000000 / kelvin);
          cmd.on = true;
          break;
        }
      }

      if (args.helderheid && actie !== "dim") cmd.brightness = args.helderheid as number;

      // Specifieke lamp of alle lampen
      const lampNaam = args.lampNaam as string | undefined;
      let deviceId: string | undefined;

      if (lampNaam) {
        const devices = await ctx.runQuery(api.devices.list, { userId: OWNER_USER_ID });
        const match = devices.find((d: any) =>
          d.name?.toLowerCase().includes(lampNaam.toLowerCase())
        );
        if (match) deviceId = match._id;
      }

      try {
        await ctx.runMutation(api.deviceCommands.queueCommand, {
          userId: OWNER_USER_ID, command: cmd, bron: "grok",
          ...(deviceId ? { deviceId } : {}),
        });
        const sceneNames: Record<number, string> = {
          1:"Ocean",2:"Romance",3:"Sunset",4:"Party",5:"Fireplace",6:"Cozy",
          7:"Forest",8:"Pastel Colors",9:"Wake Up",10:"Bedtime",11:"Warm White",
          12:"Daylight",13:"Cool White",14:"Night Light",15:"Focus",16:"Relax",
          17:"True Colors",18:"TV Time",19:"Plant Growth",20:"Spring",21:"Summer",
          22:"Fall",23:"Deep Dive",24:"Jungle",25:"Mojito",26:"Club",
          27:"Christmas",28:"Halloween",29:"Candlelight",30:"Golden White",31:"Pulse",32:"Steampunk",
        };
        let beschrijving = `Lampen ${actie}`;
        if (actie === "scene" && args.sceneId) beschrijving = `Scene: ${sceneNames[args.sceneId as number] ?? args.sceneId}`;
        if (actie === "kleur") beschrijving = `Kleur: RGB(${args.r},${args.g},${args.b})`;
        if (actie === "temperatuur") beschrijving = `Kleurtemp: ${args.kleurTemp}K`;
        if (lampNaam) beschrijving += ` (${lampNaam})`;

        return JSON.stringify({ ok: true, beschrijving, commando: cmd });
      } catch (err) {
        return JSON.stringify({ error: `Lamp commando mislukt: ${(err as Error).message}` });
      }
    }

    case "markeerGelezen": {
      try {
        await ctx.runAction(internal.actions.sendGmail.markGelezenInternal, {
          userId: OWNER_USER_ID, gmailId: args.gmailId as string, gelezen: args.gelezen as boolean,
        });
        return JSON.stringify({ ok: true, beschrijving: `Email ${args.gelezen ? "gelezen" : "ongelezen"} gemarkeerd` });
      } catch (err) {
        return JSON.stringify({ error: `Markeren mislukt: ${(err as Error).message}` });
      }
    }

    case "verwijderEmail": {
      try {
        await ctx.runAction(internal.actions.sendGmail.trashEmailInternal, {
          userId: OWNER_USER_ID, gmailId: args.gmailId as string,
        });
        return JSON.stringify({ ok: true, beschrijving: "Email naar prullenbak verplaatst" });
      } catch (err) {
        return JSON.stringify({ error: `Verwijderen mislukt: ${(err as Error).message}` });
      }
    }

    case "markeerSter": {
      try {
        await ctx.runAction(internal.actions.sendGmail.markSterInternal, {
          userId: OWNER_USER_ID, gmailId: args.gmailId as string, ster: args.ster as boolean,
        });
        return JSON.stringify({ ok: true, beschrijving: `Ster ${args.ster ? "toegevoegd" : "verwijderd"}` });
      } catch (err) {
        return JSON.stringify({ error: `Ster mislukt: ${(err as Error).message}` });
      }
    }

    case "emailVersturen": {
      try {
        await ctx.runAction(api.actions.sendGmail.sendEmail, {
          userId: OWNER_USER_ID,
          to: args.aan as string,
          subject: args.onderwerp as string,
          body: args.body as string,
          cc: args.cc as string | undefined,
        });
        return JSON.stringify({ ok: true, beschrijving: `Email verstuurd naar ${args.aan}` });
      } catch (err) {
        return JSON.stringify({ error: `Versturen mislukt: ${(err as Error).message}` });
      }
    }

    case "emailBeantwoorden": {
      try {
        await ctx.runAction(api.actions.sendGmail.replyToEmail, {
          userId: OWNER_USER_ID,
          gmailId: args.gmailId as string,
          threadId: args.threadId as string,
          to: args.aan as string,
          body: args.body as string,
        });
        return JSON.stringify({ ok: true, beschrijving: `Reply verstuurd naar ${args.aan}` });
      } catch (err) {
        return JSON.stringify({ error: `Beantwoorden mislukt: ${(err as Error).message}` });
      }
    }

    case "bulkMarkeerGelezen": {
      const gmailIds = args.gmailIds as string[];
      if (!gmailIds.length) return JSON.stringify({ error: "Geen gmailIds opgegeven" });
      try {
        const result = await ctx.runAction(internal.actions.sendGmail.bulkMarkGelezenInternal, {
          userId: OWNER_USER_ID, gmailIds, gelezen: args.gelezen as boolean,
        });
        return JSON.stringify({ ok: true, beschrijving: `${result.count} emails ${args.gelezen ? "gelezen" : "ongelezen"} gemarkeerd` });
      } catch (err) {
        return JSON.stringify({ error: `Bulk markeren mislukt: ${(err as Error).message}` });
      }
    }

    case "bulkVerwijder": {
      const gmailIds = args.gmailIds as string[];
      if (!gmailIds.length) return JSON.stringify({ error: "Geen gmailIds opgegeven" });
      try {
        const result = await ctx.runAction(internal.actions.sendGmail.bulkTrashInternal, {
          userId: OWNER_USER_ID, gmailIds,
        });
        return JSON.stringify({ ok: true, beschrijving: `${result.count} emails verwijderd` });
      } catch (err) {
        return JSON.stringify({ error: `Bulk verwijderen mislukt: ${(err as Error).message}` });
      }
    }

    case "inboxOpruimen": {
      try {
        const allEmails = await ctx.runQuery(api.emails.list, { userId: OWNER_USER_ID });
        const active = allEmails.filter((e: any) => !e.isVerwijderd);
        const filter = args.filter as string;
        const maxAantal = (args.maxAantal as number) ?? 50;
        let filtered: any[] = [];

        switch (filter) {
          case "promoties":     filtered = active.filter((e: any) => e.categorie === "promotions"); break;
          case "social":        filtered = active.filter((e: any) => e.categorie === "social"); break;
          case "forums":        filtered = active.filter((e: any) => e.categorie === "forums"); break;
          case "updates":       filtered = active.filter((e: any) => e.categorie === "updates"); break;
          case "oud_ongelezen":  filtered = active.filter((e: any) => !e.isGelezen && (Date.now() - e.ontvangen > 7 * 86400000)); break;
          case "van_afzender": {
            const afzender = (args.afzender as string || "").toLowerCase();
            filtered = active.filter((e: any) => e.from?.toLowerCase().includes(afzender));
            break;
          }
        }

        const targets = filtered.slice(0, maxAantal);
        if (targets.length === 0) {
          return JSON.stringify({ ok: true, beschrijving: `Geen ${filter} emails gevonden`, count: 0 });
        }

        const gmailIds = targets.map((e: any) => e.gmailId);
        const actie = args.actie as string;

        if (actie === "gelezen_markeren") {
          await ctx.runAction(internal.actions.sendGmail.bulkMarkGelezenInternal, {
            userId: OWNER_USER_ID, gmailIds, gelezen: true,
          });
        } else {
          await ctx.runAction(internal.actions.sendGmail.bulkTrashInternal, {
            userId: OWNER_USER_ID, gmailIds,
          });
        }

        return JSON.stringify({
          ok: true,
          beschrijving: `${targets.length} ${filter} emails ${actie === "gelezen_markeren" ? "als gelezen gemarkeerd" : "verwijderd"}`,
          count: targets.length,
          totaalInFilter: filtered.length,
        });
      } catch (err) {
        return JSON.stringify({ error: `Inbox opruimen mislukt: ${(err as Error).message}` });
      }
    }

    case "dienstenOpvragen": {
      try {
        const allSchedule = await ctx.runQuery(api.schedule.list, { userId: OWNER_USER_ID });
        const active = allSchedule.filter((s: any) => s.status !== "VERWIJDERD");

        let vanDatum: string;
        let totDatum: string;

        if (args.vanDatum && args.totDatum) {
          vanDatum = args.vanDatum as string;
          totDatum = args.totDatum as string;
        } else {
          const maand = args.maand as number;
          const jaar = (args.jaar as number) ?? new Date().getFullYear();
          vanDatum = `${jaar}-${String(maand).padStart(2, "0")}-01`;
          const lastDay = new Date(jaar, maand, 0).getDate();
          totDatum = `${jaar}-${String(maand).padStart(2, "0")}-${lastDay}`;
        }

        const filtered = active
          .filter((s: any) => s.startDatum >= vanDatum && s.startDatum <= totDatum)
          .sort((a: any, b: any) => a.startDatum.localeCompare(b.startDatum));

        const weekdays = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
        const diensten = filtered.map((s: any) => {
          const d = new Date(s.startDatum + "T00:00:00");
          return {
            datum: s.startDatum, dag: weekdays[d.getDay()],
            type: s.shiftType, titel: s.titel,
            start: s.startTijd, eind: s.eindTijd,
            locatie: s.locatie, duur: s.duur,
          };
        });

        // Stats
        const shiftTypes: Record<string, number> = {};
        for (const d of diensten) {
          shiftTypes[d.type ?? "Onbekend"] = (shiftTypes[d.type ?? "Onbekend"] ?? 0) + 1;
        }

        return JSON.stringify({
          periode: `${vanDatum} t/m ${totDatum}`,
          totaal: diensten.length,
          verdeling: shiftTypes,
          diensten,
        });
      } catch (err) {
        return JSON.stringify({ error: `Diensten ophalen mislukt: ${(err as Error).message}` });
      }
    }

    case "salarisOpvragen": {
      try {
        const maand = args.maand as number;
        const jaar = (args.jaar as number) ?? new Date().getFullYear();
        const periode = `${jaar}-${String(maand).padStart(2, "0")}`;

        // Probeer opgeslagen salaris
        const stored = await ctx.runQuery(api.salary.getByPeriode, { userId: OWNER_USER_ID, periode });
        if (stored) {
          return JSON.stringify({
            bron: "opgeslagen",
            periode, bruto: stored.brutoBetaling, netto: stored.nettoPrognose,
            ort: stored.ortTotaal, basisLoon: stored.basisLoon,
            diensten: stored.aantalDiensten,
          });
        }

        // Bereken uit rooster
        const berekend = await ctx.runQuery(api.salary.computeFromSchedule, { userId: OWNER_USER_ID });
        const maandData = berekend.find((s: any) => s.periode === periode);
        if (maandData) {
          return JSON.stringify({
            bron: "berekend_uit_rooster",
            periode, bruto: maandData.brutoBetaling, netto: maandData.nettoPrognose,
            ort: maandData.ortTotaal, basisLoon: maandData.basisLoon,
            diensten: maandData.aantalDiensten,
            ortDetails: maandData.ortDetails,
          });
        }

        return JSON.stringify({ error: `Geen salaris data voor ${periode}` });
      } catch (err) {
        return JSON.stringify({ error: `Salaris ophalen mislukt: ${(err as Error).message}` });
      }
    }

    case "transactiesZoeken": {
      try {
        const zoekterm = (args.zoekterm as string).toLowerCase();
        const maxAantal = (args.maxAantal as number) ?? 15;
        const categorie = args.categorie as string | undefined;

        const allTxs = await ctx.runQuery(internal.transactions.listInternal, { userId: OWNER_USER_ID });
        let matches = allTxs.filter((tx: any) =>
          tx.tegenpartijNaam?.toLowerCase().includes(zoekterm) ||
          tx.omschrijving?.toLowerCase().includes(zoekterm)
        );

        if (categorie) matches = matches.filter((tx: any) => tx.categorie === categorie);

        const results = matches
          .sort((a: any, b: any) => b.datum.localeCompare(a.datum))
          .slice(0, maxAantal)
          .map((tx: any) => ({
            datum: tx.datum, bedrag: tx.bedrag,
            tegenpartij: tx.tegenpartijNaam ?? "Onbekend",
            omschrijving: tx.omschrijving?.slice(0, 60),
            categorie: tx.categorie, saldo: tx.saldoNaTrn,
          }));

        const totaal = matches.reduce((s: number, tx: any) => s + tx.bedrag, 0);

        return JSON.stringify({
          zoekterm, resultaten: matches.length,
          getoond: results.length, totaalBedrag: Math.round(totaal * 100) / 100,
          transacties: results,
        });
      } catch (err) {
        return JSON.stringify({ error: `Transacties zoeken mislukt: ${(err as Error).message}` });
      }
    }

    default:
      return JSON.stringify({ error: `Onbekende tool: ${toolName}` });
  }
}

// ─── System Prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(agentMeta: AgentMeta, context: Record<string, unknown>): string {
  return `Je bent "${agentMeta.naam}" ${agentMeta.emoji} — Jeffrey's persoonlijke AI-assistent.

## Jouw Rol
${agentMeta.beschrijving}

## Wat je kunt
${agentMeta.capabilities.map((c) => `- ${c}`).join("\n")}

## Tools
Je hebt toegang tot tools waarmee je acties kunt uitvoeren:
- leesEmail(gmailId) — Volledige email inhoud ophalen. Gebruik gmailId uit de context hieronder.
- zoekEmails(zoekterm) — Emails doorzoeken op onderwerp/afzender.
- lampBedien(actie) — Lampen bedienen (aan/uit/dim/vol).

## Live Data (nu)
\`\`\`json
${JSON.stringify(context, null, 2)}
\`\`\`

## REGELS
1. Antwoord ALTIJD direct — verwijs NOOIT naar een andere agent.
2. Gebruik de tools als de gebruiker om specifieke info vraagt (bijv. "lees die email" → leesEmail).
3. Als je emails ziet in de context met gmailId, GEBRUIK leesEmail() om de inhoud op te halen als gevraagd.
4. Antwoord in het Nederlands, beknopt.
5. Geen markdown (geen ** of \`\`\`) — dit is voor Telegram.
6. Wees proactief — bied aan om emails te lezen als de gebruiker vraagt over een onderwerp.`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface GrokMessage {
  role: string;
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

interface GrokResponse {
  choices: Array<{ message: GrokMessage; finish_reason: string }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

interface AgentContextResult {
  ok: boolean;
  agent?: AgentMeta;
  context?: Record<string, unknown>;
  error?: string;
}

// ─── Chat Action ─────────────────────────────────────────────────────────────

export const chat = action({
  args: {
    userId:   v.string(),
    vraag:    v.string(),
    agentId:  v.optional(v.string()),
    history:  v.optional(v.array(v.object({
      role:    v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
    }))),
  },
  handler: async (ctx, { userId, vraag, agentId, history }): Promise<{
    ok: boolean;
    agent?: { id: string; naam: string; emoji: string };
    antwoord?: string;
    tokens?: GrokResponse["usage"];
    error?: string;
    beschikbaar?: Array<{ id: string; naam: string }>;
  }> => {
    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) return { ok: false, error: "GROK_API_KEY niet geconfigureerd" };

    const targetId = agentId ?? "dashboard";

    // ── Haal live agent context op ─────────────────────────────────────────
    const result: AgentContextResult = await ctx.runQuery(
      internal.ai.router.internalGetAgentContext,
      { agentId: targetId, userId },
    );

    if (!result.ok || !result.agent || !result.context) {
      return {
        ok: false,
        error: result.error ?? "Context ophalen mislukt",
        beschikbaar: AGENT_REGISTRY.map((a) => ({ id: a.id, naam: a.naam })),
      };
    }

    // ── Build messages ────────────────────────────────────────────────────
    const messages: GrokMessage[] = [
      { role: "system", content: buildSystemPrompt(result.agent, result.context) },
    ];
    if (history?.length) {
      for (const msg of history) messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: "user", content: vraag });

    // ── Chat loop met tool calling ────────────────────────────────────────
    let totalTokens: GrokResponse["usage"] | undefined;

    try {
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const response = await fetch(GROK_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: GROK_MODEL, messages, tools: TOOLS,
            stream: false, temperature: 0.3, max_tokens: 1500,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          return { ok: false, error: `Grok ${response.status}: ${errText.slice(0, 200)}` };
        }

        const data: GrokResponse = await response.json();
        totalTokens = data.usage;
        const choice = data.choices[0];
        if (!choice) return { ok: false, error: "Geen response van Grok" };

        const msg = choice.message;
        messages.push(msg);

        // ── Geen tool calls → klaar ──────────────────────────────────────
        if (choice.finish_reason !== "tool_calls" || !msg.tool_calls?.length) {
          return {
            ok: true,
            agent: { id: targetId, naam: result.agent.naam, emoji: result.agent.emoji },
            antwoord: msg.content ?? "",
            tokens: totalTokens,
          };
        }

        // ── Tool calls uitvoeren ─────────────────────────────────────────
        for (const toolCall of msg.tool_calls) {
          const toolArgs = JSON.parse(toolCall.function.arguments);
          const toolResult = await executeTool(ctx, toolCall.function.name, toolArgs);
          messages.push({
            role: "tool",
            content: toolResult,
            tool_call_id: toolCall.id,
          });
        }
        // Loop door → Grok krijgt tool results en antwoordt
      }

      // Max rounds bereikt
      const lastMsg = messages[messages.length - 1];
      return {
        ok: true,
        agent: { id: targetId, naam: result.agent.naam, emoji: result.agent.emoji },
        antwoord: (lastMsg.content as string) ?? "Ik heb te veel data moeten ophalen. Probeer een specifiekere vraag.",
        tokens: totalTokens,
      };
    } catch (err: unknown) {
      return { ok: false, error: `Grok request failed: ${(err as Error).message}` };
    }
  },
});
