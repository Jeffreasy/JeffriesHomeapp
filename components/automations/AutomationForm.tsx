"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Plus } from "lucide-react";
import {
  type Automation,
  type AutomationAction,
  type ActionType,
  DAY_LABELS,
  ALL_DAYS,
  WEEKDAYS,
  WEEKEND,
  SCENE_DEFINITIONS,
} from "@/lib/automations";
import { cn } from "@/lib/utils";

interface AutomationFormProps {
  onClose: () => void;
  onSave: (a: Omit<Automation, "id" | "createdAt" | "lastFiredAt">) => void;
}

export function AutomationForm({ onClose, onSave }: AutomationFormProps) {
  const [name, setName] = useState("");
  const [time, setTime] = useState("07:00");
  const [days, setDays] = useState<number[]>(ALL_DAYS);
  const [actionType, setActionType] = useState<ActionType>("scene");
  const [sceneId, setSceneId] = useState("helder");
  const [brightness, setBrightness] = useState(80);
  const [colorHex, setColorHex] = useState("#ff8800");
  const [colorTempMireds, setColorTempMireds] = useState(370);

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const handleSave = () => {
    if (!name || days.length === 0) return;
    const action: AutomationAction = { type: actionType };
    if (actionType === "scene")      action.sceneId = sceneId as keyof typeof SCENE_DEFINITIONS;
    if (actionType === "brightness") action.brightness = brightness;
    if (actionType === "color")      action.colorHex = colorHex;
    if (actionType === "color_temp") action.colorTempMireds = colorTempMireds;
    onSave({ name, enabled: true, trigger: { time, days }, action });
    onClose();
  };

  const actionLabels: Record<ActionType, string> = {
    scene: "Scène",
    on: "Aan",
    off: "Uit",
    brightness: "Helderheid",
    color_temp: "Kleurtemp",
    color: "Kleur",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="glass rounded-2xl p-5 space-y-4 border border-amber-500/20"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Plus size={14} className="text-amber-400" />
          Nieuwe automatisering
        </h3>
        <button
          onClick={onClose}
          aria-label="Formulier sluiten"
          className="text-slate-500 hover:text-slate-300"
        >
          <X size={15} />
        </button>
      </div>

      <div>
        <label htmlFor="auto-name" className="sr-only">Naam</label>
        <input
          id="auto-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Naam *"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
        />
      </div>

      <div>
        <label htmlFor="auto-time" className="sr-only">Tijdstip</label>
        <input
          id="auto-time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50 [color-scheme:dark]"
        />
      </div>

      <fieldset>
        <legend className="sr-only">Dagen</legend>
        <div className="flex gap-2 mb-2 text-[10px]">
          {[["Alle", ALL_DAYS], ["Doordeweeks", WEEKDAYS], ["Weekend", WEEKEND]].map(
            ([label, d]) => (
              <button
                key={label as string}
                type="button"
                onClick={() => setDays(d as number[])}
                className="text-slate-500 hover:text-amber-400"
              >
                {label as string}
              </button>
            )
          )}
        </div>
        <div className="flex gap-1">
          {DAY_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={days.includes(i)}
              onClick={() => toggleDay(i)}
              className={cn(
                "flex-1 py-1 rounded-lg text-xs font-medium transition-all",
                days.includes(i)
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-white/5 text-slate-500 border border-white/10"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="sr-only">Actie type</legend>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1">
          {(Object.keys(actionLabels) as ActionType[]).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={actionType === t}
              onClick={() => setActionType(t)}
              className={cn(
                "py-1 rounded-lg text-xs transition-all",
                actionType === t ? "bg-white/10 text-white font-medium" : "text-slate-500"
              )}
            >
              {actionLabels[t]}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        {actionType === "scene" && (
          <div className="grid grid-cols-3 gap-1">
            {Object.entries(SCENE_DEFINITIONS).map(([id, { label }]) => (
              <button
                key={id}
                type="button"
                aria-pressed={sceneId === id}
                onClick={() => setSceneId(id)}
                className={cn(
                  "py-1.5 rounded-lg text-xs border transition-all",
                  sceneId === id
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    : "bg-white/5 text-slate-400 border-white/10"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {actionType === "brightness" && (
          <>
            <label htmlFor="auto-brightness" className="sr-only">Helderheid</label>
            <input
              id="auto-brightness"
              type="range"
              min={5}
              max={100}
              value={brightness}
              onChange={(e) => setBrightness(+e.target.value)}
              style={{
                background: `linear-gradient(to right, #f59e0b ${brightness}%, rgba(255,255,255,0.1) ${brightness}%)`,
              }}
            />
          </>
        )}
        {actionType === "color_temp" && (
          <>
            <label htmlFor="auto-colortemp" className="sr-only">Kleurtemperatuur</label>
            <input
              id="auto-colortemp"
              type="range"
              min={153}
              max={455}
              value={colorTempMireds}
              onChange={(e) => setColorTempMireds(+e.target.value)}
              style={{ background: "linear-gradient(to right, #ff9329, #fff4e6, #cce4ff)" }}
            />
          </>
        )}
        {actionType === "color" && (
          <div className="flex items-center gap-3">
            <label htmlFor="auto-color" className="sr-only">Kleur kiezen</label>
            <input
              id="auto-color"
              type="color"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              className="w-12 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
            />
            <span className="text-xs font-mono text-slate-400">{colorHex.toUpperCase()}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={!name || days.length === 0}
        className="w-full py-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 text-sm font-medium hover:bg-amber-500/25 disabled:opacity-40 flex items-center justify-center gap-2"
      >
        <Check size={13} />
        Opslaan
      </button>
    </motion.div>
  );
}
