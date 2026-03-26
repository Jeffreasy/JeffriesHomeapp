/**
 * convex/ai/grok/tools/smarthome.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Smart home tool handler — WiZ lamp control.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { api } from "../../../_generated/api";

const SCENE_NAMES: Record<number, string> = {
  1:"Ocean",2:"Romance",3:"Sunset",4:"Party",5:"Fireplace",6:"Cozy",
  7:"Forest",8:"Pastel Colors",9:"Wake Up",10:"Bedtime",11:"Warm White",
  12:"Daylight",13:"Cool White",14:"Night Light",15:"Focus",16:"Relax",
  17:"True Colors",18:"TV Time",19:"Plant Growth",20:"Spring",21:"Summer",
  22:"Fall",23:"Deep Dive",24:"Jungle",25:"Mojito",26:"Club",
  27:"Christmas",28:"Halloween",29:"Candlelight",30:"Golden White",31:"Pulse",32:"Steampunk",
};

export async function handleLampBedien(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
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

    let beschrijving = `Lampen ${actie}`;
    if (actie === "scene" && args.sceneId) beschrijving = `Scene: ${SCENE_NAMES[args.sceneId as number] ?? args.sceneId}`;
    if (actie === "kleur") beschrijving = `Kleur: RGB(${args.r},${args.g},${args.b})`;
    if (actie === "temperatuur") beschrijving = `Kleurtemp: ${args.kleurTemp}K`;
    if (lampNaam) beschrijving += ` (${lampNaam})`;

    return JSON.stringify({ ok: true, beschrijving, commando: cmd });
  } catch (err) {
    return JSON.stringify({ error: `Lamp commando mislukt: ${(err as Error).message}` });
  }
}
