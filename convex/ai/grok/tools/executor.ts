/**
 * convex/ai/grok/tools/executor.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tool execution handlers — processes tool calls from Grok and returns results.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { api, internal } from "../../../_generated/api";
import { todayCET, getWeekNumber } from "../types";

export async function executeTool(
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
        // Strip HTML naar leesbare tekst
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
        const allEmails = await ctx.runQuery(api.emails.list, { userId });
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

        const allEvents = await ctx.runQuery(api.personalEvents.list, { userId });
        const weekdaysFull = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
        const maandNamen = ["", "Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];

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

        const verdeling: Record<string, number> = {};
        for (const d of diensten) {
          verdeling[d.type ?? "Onbekend"] = (verdeling[d.type ?? "Onbekend"] ?? 0) + 1;
        }

        const dienstDatums = new Set(filtered.map((s: any) => s.startDatum));
        const vrijeDagen: string[] = [];
        const start = new Date(vanDatum + "T00:00:00");
        const end = new Date(totDatum + "T00:00:00");
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const ds = new Date(d.getTime()).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
          if (!dienstDatums.has(ds)) vrijeDagen.push(ds);
        }

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

        const stored = await ctx.runQuery(api.salary.getByPeriode, { userId, periode });
        if (stored) {
          return JSON.stringify({
            bron: "opgeslagen",
            periode, bruto: stored.brutoBetaling, netto: stored.nettoPrognose,
            ort: stored.ortTotaal, basisLoon: stored.basisLoon,
            diensten: stored.aantalDiensten,
          });
        }

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
