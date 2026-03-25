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
const OWNER_USER_ID = "user_3Ax561ZvuSkGtWpKFooeY65HNtY"; // fallback
const MAX_TOOL_ROUNDS = 5;

/** CET/CEST-aware date: returns YYYY-MM-DD in Amsterdam timezone. */
function todayCET(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

/** Safe JSON.parse: returns parsed object or null on failure. */
function safeJsonParse(str: string): Record<string, unknown> | null {
  try {
    return JSON.parse(str);
  } catch {
    // Try basic repairs: trailing commas, missing closing braces
    try {
      const cleaned = str.replace(/,\s*([}\]])/g, "$1");
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

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
  {
    type: "function" as const,
    function: {
      name: "afspraakMaken",
      description: `Maak een professionele persoonlijke afspraak aan met slimme templates. De afspraak wordt automatisch gesynchroniseerd naar Google Calendar met kleurcodering en herinneringen.

BELANGRIJK — Professioneel Template Protocol:
1. Titel: Gebruik een duidelijke, gestructureerde titel. Voeg een relevant emoji prefix toe (☕ sociaal, 💼 werk, 🏥 gezondheid, 🏋️ sport, 📋 admin, 🎓 studie, 🔧 onderhoud, 🎉 evenement).
2. Beschrijving: Genereer ALTIJD een gestructureerde beschrijving met:
   - Doel/context van de afspraak
   - Eventuele agendapunten of voorbereiding
   - Relevante contactinfo of locatiedetails
3. Categorie: Classificeer het type afspraak voor kleurcodering in Google Calendar.
4. Slimme defaults: Als gebruiker geen tijd noemt, kies logische tijden (koffie=10:00-11:00, lunch=12:30-13:30, avondeten=18:00-19:30, sport=07:00-08:00).`,
      parameters: {
        type: "object",
        properties: {
          titel: { type: "string", description: "Professionele titel MET emoji prefix (bijv. '☕ Koffie met Maarten')" },
          startDatum: { type: "string", description: "Startdatum in YYYY-MM-DD formaat" },
          eindDatum: { type: "string", description: "Einddatum in YYYY-MM-DD formaat (zelfde als start voor eendaagse)" },
          startTijd: { type: "string", description: "Starttijd HH:MM — gebruik slimme defaults als gebruiker geen tijd noemt" },
          eindTijd: { type: "string", description: "Eindtijd HH:MM — gebruik slimme defaults" },
          heledag: { type: "boolean", description: "true voor hele dag event, false voor tijdsgebonden" },
          locatie: { type: "string", description: "Locatie (optioneel)" },
          beschrijving: { type: "string", description: "Gestructureerde beschrijving met doel, agendapunten, en voorbereiding" },
          categorie: { type: "string", enum: ["sociaal", "werk", "gezondheid", "sport", "admin", "studie", "onderhoud", "evenement", "overig"], description: "Type afspraak voor Google Calendar kleurcodering" },
        },
        required: ["titel", "startDatum", "eindDatum", "heledag", "categorie"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "afspraakVerwijderen",
      description: "Verwijder een persoonlijke afspraak. Zoekt op titel (zoekterm). De afspraak wordt ook uit Google Calendar verwijderd. Gebruik dit als de gebruiker een afspraak wil verwijderen, annuleren, of cancelen.",
      parameters: {
        type: "object",
        properties: {
          zoekterm: { type: "string", description: "Deel van de titel om de afspraak te vinden (bijv. 'koffie')" },
        },
        required: ["zoekterm"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "afsprakenOpvragen",
      description: "Haal persoonlijke afspraken op. Toont aankomende events met eventuele conflicten met werkdiensten. Gebruik dit als de gebruiker vraagt naar agenda, afspraken, of wat er gepland staat.",
      parameters: {
        type: "object",
        properties: {
          aantalDagen: { type: "number", description: "Hoeveel dagen vooruit kijken (default 30)" },
        },
        required: [],
      },
    },
  },
];

// ─── Tool Execution ──────────────────────────────────────────────────────────

async function executeTool(
  ctx: any,
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  switch (toolName) {
    case "leesEmail": {
      try {
        const result = await ctx.runAction(internal.actions.getGmailBody.getBodyInternal, {
          userId,
          gmailId: args.gmailId as string,
        });
        // Strip HTML naar leesbare tekst: verwijder style/script blokken, dan tags, dan whitespace
        const cleanHtml = (html: string) =>
          html
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
            .replace(/&nbsp;/gi, " ")
            .replace(/&amp;/gi, "&")
            .replace(/&lt;/gi, "<")
            .replace(/&gt;/gi, ">")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/?(p|div|tr|li|h[1-6])[^>]*>/gi, "\n")
            .replace(/<[^>]+>/g, "")
            .replace(/[ \t]+/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
        const body = result.text || cleanHtml(result.html ?? "") || "(geen body)";
        return JSON.stringify({
          van: result.from, aan: result.to, cc: result.cc,
          onderwerp: result.subject, datum: result.date,
          body: body.slice(0, 3000),
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
          userId,
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
        const devices = await ctx.runQuery(api.devices.list, { userId });
        const match = devices.find((d: any) =>
          d.name?.toLowerCase().includes(lampNaam.toLowerCase())
        );
        if (match) deviceId = match._id;
      }

      try {
        await ctx.runMutation(api.deviceCommands.queueCommand, {
          userId, command: cmd, bron: "grok",
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
          userId, gmailId: args.gmailId as string, gelezen: args.gelezen as boolean,
        });
        return JSON.stringify({ ok: true, beschrijving: `Email ${args.gelezen ? "gelezen" : "ongelezen"} gemarkeerd` });
      } catch (err) {
        return JSON.stringify({ error: `Markeren mislukt: ${(err as Error).message}` });
      }
    }

    case "verwijderEmail": {
      try {
        await ctx.runAction(internal.actions.sendGmail.trashEmailInternal, {
          userId, gmailId: args.gmailId as string,
        });
        return JSON.stringify({ ok: true, beschrijving: "Email naar prullenbak verplaatst" });
      } catch (err) {
        return JSON.stringify({ error: `Verwijderen mislukt: ${(err as Error).message}` });
      }
    }

    case "markeerSter": {
      try {
        await ctx.runAction(internal.actions.sendGmail.markSterInternal, {
          userId, gmailId: args.gmailId as string, ster: args.ster as boolean,
        });
        return JSON.stringify({ ok: true, beschrijving: `Ster ${args.ster ? "toegevoegd" : "verwijderd"}` });
      } catch (err) {
        return JSON.stringify({ error: `Ster mislukt: ${(err as Error).message}` });
      }
    }

    case "emailVersturen": {
      try {
        await ctx.runAction(internal.actions.sendGmail.sendEmailInternal, {
          userId,
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
        await ctx.runAction(internal.actions.sendGmail.replyToEmailInternal, {
          userId,
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
          userId, gmailIds, gelezen: args.gelezen as boolean,
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
          userId, gmailIds,
        });
        return JSON.stringify({ ok: true, beschrijving: `${result.count} emails verwijderd` });
      } catch (err) {
        return JSON.stringify({ error: `Bulk verwijderen mislukt: ${(err as Error).message}` });
      }
    }

    case "inboxOpruimen": {
      try {
        const allEmails = await ctx.runQuery(api.emails.list, { userId });
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
            userId, gmailIds, gelezen: true,
          });
        } else {
          await ctx.runAction(internal.actions.sendGmail.bulkTrashInternal, {
            userId, gmailIds,
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
        const allSchedule = await ctx.runQuery(api.schedule.list, { userId });
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

        // Persoonlijke afspraken voor conflictdetectie
        const allEvents = await ctx.runQuery(api.personalEvents.list, { userId });
        const weekdaysFull = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
        const maandNamen = ["", "Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];

        // Per-week groepering
        const weken: Record<string, any[]> = {};
        let totaalUren = 0;
        let weekendDiensten = 0;

        const diensten = filtered.map((s: any) => {
          const d = new Date(s.startDatum + "T00:00:00");
          const dag = weekdaysFull[d.getDay()];
          const weekNr = getWeekNumber(d);
          const weekKey = `Week ${weekNr}`;
          const uren = s.duur ?? 0;
          totaalUren += uren;
          if (d.getDay() === 0 || d.getDay() === 6) weekendDiensten++;

          // Check conflict met persoonlijke afspraken
          const conflict = allEvents.find((e: any) =>
            e.status === "Aankomend" && e.startDatum === s.startDatum
          );

          const entry = {
            datum: s.startDatum, dag, weekNr, type: s.shiftType,
            tijd: `${s.startTijd} - ${s.eindTijd}`, uren,
            locatie: s.locatie, team: s.team,
            conflict: conflict ? { titel: conflict.titel, tijd: conflict.heledag ? "hele dag" : `${conflict.startTijd}-${conflict.eindTijd}` } : null,
          };

          if (!weken[weekKey]) weken[weekKey] = [];
          weken[weekKey].push(entry);
          return entry;
        });

        // Shift type verdeling
        const verdeling: Record<string, number> = {};
        for (const d of diensten) {
          verdeling[d.type ?? "Onbekend"] = (verdeling[d.type ?? "Onbekend"] ?? 0) + 1;
        }

        // Vrije dagen (dagen in de periode zonder dienst)
        const dienstDatums = new Set(filtered.map((s: any) => s.startDatum));
        const vrijeDagen: string[] = [];
        const start = new Date(vanDatum + "T00:00:00");
        const end = new Date(totDatum + "T00:00:00");
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const ds = new Date(d.getTime()).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
          if (!dienstDatums.has(ds)) vrijeDagen.push(ds);
        }

        // Conflicten summary
        const conflicten = diensten.filter((d: any) => d.conflict);

        const maandNr = parseInt(vanDatum.slice(5, 7));
        const jaarNr = parseInt(vanDatum.slice(0, 4));

        return JSON.stringify({
          titel: `${maandNamen[maandNr]} ${jaarNr}`,
          periode: `${vanDatum} t/m ${totDatum}`,
          samenvatting: {
            totaalDiensten: diensten.length,
            totaalUren: Math.round(totaalUren * 10) / 10,
            weekendDiensten,
            vrijeDagen: vrijeDagen.length,
            conflicten: conflicten.length,
          },
          verdeling,
          perWeek: weken,
          conflicten: conflicten.map((c: any) => ({
            datum: c.datum, dag: c.dag, dienst: c.type,
            afspraak: c.conflict.titel, afspraakTijd: c.conflict.tijd,
          })),
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
        const stored = await ctx.runQuery(api.salary.getByPeriode, { userId, periode });
        if (stored) {
          return JSON.stringify({
            bron: "opgeslagen",
            periode, bruto: stored.brutoBetaling, netto: stored.nettoPrognose,
            ort: stored.ortTotaal, basisLoon: stored.basisLoon,
            diensten: stored.aantalDiensten,
          });
        }

        // Bereken uit rooster
        const berekend = await ctx.runQuery(api.salary.computeFromSchedule, { userId });
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

        const allTxs = await ctx.runQuery(internal.transactions.listInternal, { userId });
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

    case "afspraakMaken": {
      try {
        const categorie = (args.categorie as string) ?? "overig";
        const rawBeschrijving = (args.beschrijving as string) ?? "";
        // Embed categorie as structured tag for processPendingCalendar color mapping
        const beschrijving = rawBeschrijving
          ? `${rawBeschrijving}\n\n---\n[categorie:${categorie}]`
          : `[categorie:${categorie}]`;

        const result = await ctx.runMutation(api.personalEvents.create, {
          userId,
          titel: args.titel as string,
          startDatum: args.startDatum as string,
          eindDatum: args.eindDatum as string,
          heledag: args.heledag as boolean,
          startTijd: args.startTijd as string | undefined,
          eindTijd: args.eindTijd as string | undefined,
          locatie: args.locatie as string | undefined,
          beschrijving,
        });

        const tijdInfo = args.heledag
          ? "hele dag"
          : `${args.startTijd ?? "?"} - ${args.eindTijd ?? "?"}`;

        return JSON.stringify({
          ok: true,
          beschrijving: `Afspraak "${args.titel}" aangemaakt`,
          details: {
            datum: args.startDatum,
            tijd: tijdInfo,
            categorie,
            locatie: args.locatie ?? "Niet opgegeven",
            googleSync: "Wordt automatisch gesynchroniseerd met kleurcodering en herinneringen",
          },
          eventId: result.eventId,
        });
      } catch (err) {
        return JSON.stringify({ error: `Afspraak aanmaken mislukt: ${(err as Error).message}` });
      }
    }

    case "afspraakVerwijderen": {
      try {
        const result = await ctx.runMutation(api.personalEvents.remove, {
          userId,
          zoekterm: args.zoekterm as string,
        });
        if (!result.ok) {
          return JSON.stringify({ error: result.error ?? "Afspraak niet gevonden" });
        }
        return JSON.stringify({
          ok: true,
          beschrijving: result.beschrijving,
          eventId: result.eventId,
          status: "Wordt automatisch uit Google Calendar verwijderd",
        });
      } catch (err) {
        return JSON.stringify({ error: `Afspraak verwijderen mislukt: ${(err as Error).message}` });
      }
    }

    case "afsprakenOpvragen": {
      try {
        const aantalDagen = (args.aantalDagen as number) ?? 30;
        const today = todayCET();
        const endDate = new Date(Date.now() + aantalDagen * 86400000).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });

        const allEvents = await ctx.runQuery(api.personalEvents.list, { userId });
        const upcoming = allEvents
          .filter((e: any) => e.status === "Aankomend" && e.startDatum >= today && e.startDatum <= endDate)
          .sort((a: any, b: any) => a.startDatum.localeCompare(b.startDatum));

        // Diensten ophalen voor conflictdetectie
        const schedule = await ctx.runQuery(api.schedule.list, { userId });
        const weekdays = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

        const afspraken = upcoming.map((e: any) => {
          const d = new Date(e.startDatum + "T00:00:00");
          const dienst = schedule.find((s: any) => s.startDatum === e.startDatum && s.status !== "VERWIJDERD");
          return {
            titel: e.titel, datum: e.startDatum, dag: weekdays[d.getDay()],
            tijd: e.heledag ? "Hele dag" : `${e.startTijd ?? "?"} - ${e.eindTijd ?? "?"}`,
            locatie: e.locatie, beschrijving: e.beschrijving,
            conflict: dienst ? `⚠️ Conflict met ${dienst.shiftType} dienst (${dienst.startTijd}-${dienst.eindTijd})` : null,
          };
        });

        return JSON.stringify({
          periode: `${today} t/m ${endDate}`,
          totaal: afspraken.length,
          metConflict: afspraken.filter((a: any) => a.conflict).length,
          afspraken,
        });
      } catch (err) {
        return JSON.stringify({ error: `Afspraken ophalen mislukt: ${(err as Error).message}` });
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
- leesEmail(gmailId) — Volledige email inhoud ophalen
- zoekEmails(zoekterm) — Emails doorzoeken
- lampBedien(actie) — Lampen bedienen (scenes/kleuren/dim)
- dienstenOpvragen(maand) — Diensten per maand ophalen
- afspraakMaken(titel, datum, ...) — Afspraak aanmaken
- afspraakVerwijderen(zoekterm) — Afspraak verwijderen/annuleren
- afsprakenOpvragen() — Aankomende afspraken tonen
- salarisOpvragen(maand) — Salaris per maand
- transactiesZoeken(zoekterm) — Bank transacties doorzoeken
- bulkMarkeerGelezen/bulkVerwijder/inboxOpruimen — Email bulk operaties

## Live Data (nu)
\`\`\`json
${JSON.stringify(context, null, 2)}
\`\`\`

## COMMUNICATIE REGELS
1. Antwoord ALTIJD direct — verwijs NOOIT naar een andere agent.
2. Antwoord in het Nederlands, professioneel maar vriendelijk.
3. ABSOLUUT GEEN markdown formatting — geen **bold**, geen *italic*, geen backtick-code, geen code blokken. Dit is Telegram plain text. Gebruik ALLEEN emoji's en lijnen voor structuur.
4. Gebruik emoji's strategisch voor visuele structuur.
5. Wees proactief — bied vervolgacties aan.

## TOOL GEBRUIK (VERPLICHT)
- WANNEER DE GEBRUIKER VRAAGT OM EEN EMAIL TE "LEZEN", "OPENEN", "VOORLEZEN" OF "BEKIJKEN":
  → Je MOET de leesEmail tool aanroepen met het gmailId uit de Live Data hierboven.
  → Antwoord NOOIT alleen met de snippet — haal ALTIJD de volledige body op via leesEmail.
  → Zoek het gmailId in de "recente" lijst in Live Data en gebruik dat als parameter.
- Als de gebruiker diensten/rooster vraagt → gebruik dienstenOpvragen
- Als de gebruiker salaris vraagt → gebruik salarisOpvragen
- Als de gebruiker emails wil verwijderen/markeren → gebruik de juiste email tool

## FORMATTING REGELS PER DOMEIN

### Rooster/Diensten:
- Gebruik een duidelijke koptekst met maand, jaar en totalen
- Groepeer diensten PER WEEK met week headers
- Gebruik emoji's: 🌅 Vroeg, 🌆 Dienst/Laat, 🏠 Vrij, ⚠️ Conflict
- Toon per dienst: datum (dag) | type | tijd | locatie
- Markeer weekenddiensten met 📅
- Toon een samenvatting onderaan: totaal uren, verdeling, vrije dagen
- Bij conflicten: toon inline met ⚠️ en de afspraak die conflicteert
- Voorbeeld format:
  📅 APRIL 2026 | 12 diensten | 91.5 uur
  
  ━━ Week 14 ━━
  🌅 Wo 02 | Vroeg | 07:00-15:00 | AA (8u)
  🌅 Zo 05 | Vroeg | 07:00-14:30 | AA (7.5u)
  
  ━━ Week 15 ━━
  🌆 Do 09 | Dienst | 14:45-22:00 | AA (7.25u)
  🌆 Za 11 | Dienst | 14:45-22:00 | App. (7.25u)
     ⚠️ Conflict: Brian (hele dag)
  
  ━━━━━━━━━━━━━
  📊 5x Vroeg | 7x Dienst | 2x Weekend
  ⏱ 91.5 uur | 🏠 18 vrije dagen

### Salaris/Finance:
Geef een gestructureerd financieel overzicht:

Voorbeeld format:
  ━━━━━━━━━━━━━━━━━
  💰 SALARIS MAART 2026
  ━━━━━━━━━━━━━━━━━

  📋 Basis: €2.145,00
  🌙 ORT-toeslag: €387,42
  ━━━━━━━━━━━━━━
  💶 Bruto: €2.532,42
  🏦 Netto (prognose): €1.892,18

  📊 Details:
  • 12 diensten | 91.5 uur
  • 5x Vroeg | 7x Dienst
  • Weekend ORT: €142,00

  📈 Trend: +€45 t.o.v. vorige maand
  💡 Tip: extra weekenddiensten = meer ORT

Bij transactie-vragen:
  ━━━━━━━━━━━━━━━━━
  🏦 TRANSACTIES — Maart 2026
  ━━━━━━━━━━━━━━━━━

  📊 Overzicht: 42 transacties
  📈 Inkomsten: €2.340,00
  📉 Uitgaven: -€1.856,23
  💶 Netto: +€483,77

  🏷️ Per categorie:
  • Boodschappen: -€387,42 (18x)
  • Vaste lasten: -€845,00 (6x)
  • Vrije tijd: -€234,50 (9x)

  🔴 Grootste uitgaven:
  1. Huur — -€750,00 | 01 mrt
  2. Albert Heijn — -€87,30 | 24 mrt

### Lampen/Smart Home:
Geef een gestructureerd smart home overzicht:

Voorbeeld format:
  ━━━━━━━━━━━━━━━━━
  💡 SMART HOME STATUS
  ━━━━━━━━━━━━━━━━━

  📊 Overzicht: 5 lampen | 3 aan | 2 uit

  🟢 AAN:
  • Woonkamer — 80% | Warm wit
  • Slaapkamer — 40% | Nachtmodus
  • Gang — 100% | Helder wit

  ⚫ UIT:
  • Keuken | Badkamer

  ⚙️ Automations: 3 actief
  • 🌅 Ochtend scene — 07:00 (Vroeg dienst)
  • 🌙 Nacht dimmen — 22:30 (dagelijks)
  • 💡 Alles uit — 23:00 (werkdagen)

  💡 Tip: "zet woonkamer op 50%" of "activeer avond scene"

### Automations/Systeem:
Geef een professioneel systeem health overzicht:

Voorbeeld format:
  ━━━━━━━━━━━━━━━━━
  ⚙️ SYSTEEM STATUS
  ━━━━━━━━━━━━━━━━━

  🟢 Alles operationeel

  📡 Sync Health:
  • Gmail — ✅ 5 min geleden | 8 emails
  • Calendar — ✅ 1 uur geleden
  • Rooster — ✅ Vandaag 06:00 | 142 diensten

  ⚙️ Automations: 4/6 actief
  • 🌅 Ochtend Vroeg (07:00) — ✅ actief
  • 🌆 Avond scene (18:30) — ✅ actief
  • 🌙 Nacht dimmen (22:30) — ✅ actief
  • ❌ Weekend scene — ⏸ gepauzeerd

  🔄 Cron Jobs: 5 actief (sync elke 5m/1u/24u)

### Email (overzicht):
Geef een gestructureerd inbox overzicht:

Voorbeeld format:
  ━━━━━━━━━━━━━━━━━
  📧 INBOX — 25 maart 2026
  ━━━━━━━━━━━━━━━━━

  📊 Stats: 12 totaal | 3 ongelezen | 1 ⭐

  🆕 Ongelezen (3):
  1. NoordCode | "Vaker trainen?" | 24 mrt
  2. Grok | "Tech Digest" | 25 mrt
  3. Rabobank | "Festival actie" | 24 mrt

  🏆 Top afzenders: Grok (4x) | NoordCode (3x)

  🧹 Triage: 2 nieuwsbrieven opruimen?
  📌 Actie: "lees [email]" of "verwijder alle promoties"

### Email (LEZEN/VOORLEZEN — na leesEmail tool):
Wanneer je een email body hebt opgehaald met leesEmail, geef ALTIJD deze analyse:

1. 📧 HEADER — Van, Aan, Onderwerp, Datum (compact)
2. 🏷️ TYPE — Classificeer: Nieuwsbrief 📰 | Persoonlijk 👤 | Transactie 🧾 | Marketing 📢 | Notificatie 🔔 | Spam ⚠️
3. 📝 TL;DR — Max 2-3 zinnen kernboodschap
4. 🔑 KEY POINTS — Bullet list van de belangrijkste punten/nieuwtjes (max 5)
5. 📋 ACTIEPUNTEN — Wat moet Jeffrey doen? (als relevant)
6. 💡 SUGGESTIE — Slim advies: archiveren? uitschrijven? opvolgen? beantwoorden?

Voorbeeld format:
  📧 Van: Grok (noreply@x.ai) | 25 mrt 2026
  🏷️ Type: Nieuwsbrief 📰 (Dagelijkse Tech Digest)

  📝 TL;DR: Google heeft Lyria 3 gelanceerd voor AI-muziek, en Anthropic brengt Claude desktop control uit.

  🔑 Key Points:
  • Google Lyria 3 Pro — AI-muziekgeneratie, langere tracks
  • Google TurboQuant — lossless geheugencompressie
  • Anthropic Claude — desktop control feature

  📋 Actiepunten: Geen directe actie nodig
  💡 Suggestie: Interessant om te bewaren? ⭐ Ster of 🗑️ archiveer

### Agenda/Afspraken:
- Gebruik 📌 voor afspraken, ⚠️ voor conflicten
- Toon datum, tijd, locatie

### Dagelijks Briefing ("wat heb ik morgen/vandaag"):
Wanneer de gebruiker vraagt wat hij te doen heeft (morgen/vandaag/deze week), geef een PROFESSIONELE dagbriefing:

1. 📅 DATUM HEADER — "Donderdag 26 maart 2026" met dag gevoel (druk/rustig/normaal)
2. ⏰ TIJDLIJN — Chronologische volgorde van alles wat gepland staat:
   - Diensten met type, tijd, locatie
   - Afspraken met titel, tijd, locatie
   - Toon vrije tijdblokken tussen activiteiten
3. 📊 DAGANALYSE — Totaal geplande uren, vrije uren, reistijd indicatie
4. 💡 SLIMME INZICHTEN — Proactieve tips:
   - Vroege dienst? "Wekker om 06:15 zetten"
   - Conflict? "Let op: overlap met [afspraak]"
   - Vrije dag? "Geen verplichtingen — geniet ervan!"
   - Avondafspraak na dienst? "Je hebt [X uur] pauze tussendoor"

Voorbeeld format:
  ━━━━━━━━━━━━━━━━━
  📅 Donderdag 26 maart 2026
  🟢 Rustige dag — 1 afspraak
  ━━━━━━━━━━━━━━━━━

  🏥 Dienst: Geen gepland

  📌 Agenda:
  13:00 - 18:00 | Maarten
  
  ━━━━━━━━━━━━━━━━━
  ⏱ Bezet: 5u | Vrij in ochtend (tot 13:00)
  💡 Ochtend vrij — goed moment voor persoonlijke taken
  
  👋 Morgen: Vr 27 mrt — [preview volgende dag]

### Dashboard (cross-domain overzicht):
Wanneer de gebruiker een algemene vraag stelt (hoe gaat het, goedemorgen, overzicht), geef een cross-domain briefing:

Voorbeeld format:
  ━━━━━━━━━━━━━━━━━━━━━━
  📊 DAILY BRIEF — Di 25 mrt 2026
  ━━━━━━━━━━━━━━━━━━━━━━

  🏥 Dienst: 🌆 Dienst 14:45-22:00 | AA
  📧 Email: 3 ongelezen (NoordCode, Grok)
  💡 Lampen: 3/5 aan | Avond scene actief
  💰 Salaris mrt: ~€1.892 netto (prognose)
  ⚙️ Systeem: 🟢 Alles OK

  📌 Vandaag:
  • Dienst om 14:45 — vertrek ~14:15
  • Geen conflicten ✅
  
  💡 Tip: Ochtend vrij, dienst begint om 14:45
  👋 Morgen: Wo 26 mrt — Vrij!`;
}

// ISO week number helper
function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
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
            stream: false, temperature: 0.3, max_tokens: 2500,
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
          const toolArgs = safeJsonParse(toolCall.function.arguments);
          if (!toolArgs) {
            messages.push({
              role: "tool",
              content: JSON.stringify({ error: `Ongeldige JSON in tool arguments: ${toolCall.function.arguments.slice(0, 100)}` }),
              tool_call_id: toolCall.id,
            });
            continue;
          }
          const toolResult = await executeTool(ctx, toolCall.function.name, toolArgs, userId || OWNER_USER_ID);
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
