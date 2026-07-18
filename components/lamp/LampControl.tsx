"use client";

import { HexColorPicker } from "react-colorful";
import { useState, useEffect, useRef, useId, useCallback, type CSSProperties } from "react";
import { Thermometer, Sun, Palette, RefreshCw } from "lucide-react";
import { devicesApi, type Device, type DeviceCommand } from "@/lib/api";
import { useLampCommand } from "@/hooks/useHomeapp";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import { FormField } from "@/components/ui/FormField";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Range } from "@/components/ui/Range";
import { useToast } from "@/components/ui/Toast";
import { cn, hexToRgb, kelvinToHex, rgbToHex } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { mergeRefreshedDevice } from "@/lib/lampCommandJournal";
import { runWithAbortTimeout } from "@/lib/lampCommandTransport";
import { createLampAmbientStyle } from "@/lib/lampPresentation";

interface LampControlProps {
  device: Device;
}

type Mode = "white" | "color";

const COLOR_PRESETS = [
  { hex: "#ff4500", label: "Rood" },
  { hex: "#ff8800", label: "Oranje" },
  { hex: "#ffcc00", label: "Geel" },
  { hex: "#00e5ff", label: "Cyaan" },
  { hex: "#00c2a0", label: "Turkoois" },
  { hex: "#3b82f6", label: "Blauw" },
  { hex: "#8b5cf6", label: "Paars" },
  { hex: "#ff69b4", label: "Roze" },
];

const DEVICE_REFRESH_TIMEOUT_MS = 15_000;

export function LampControl({ device }: LampControlProps) {
  const {
    mutateAsync: sendCommand,
    isPending,
    subscribeToBarriers,
    hasPendingCommands,
  } = useLampCommand(device.id);
  const queryClient = useQueryClient();
  const { error: toastError } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const state = device.current_state;

  // Anti-snap-back: sla de server→lokaal-sync over zolang de gebruiker sleept
  // of er nog een (gedebouncet) commando onderweg is, anders springt de slider
  // terug naar de oude serverwaarde midden in een drag.
  const activePointersRef = useRef(0);
  const inFlightSendsRef = useRef(0);
  // Grace-window dat het gat dekt tussen de laatste lokale edit en het moment
  // dat de gedebouncete send daadwerkelijk vertrekt (max 200ms debounce).
  const localEditUntilRef = useRef(0);
  const failedSyncPendingRef = useRef(false);
  const [syncRevision, setSyncRevision] = useState(0);

  const requestLocalSync = useCallback(() => {
    setSyncRevision((revision) => revision + 1);
  }, []);

  const flushDeferredSync = useCallback(() => {
    if (
      !failedSyncPendingRef.current ||
      activePointersRef.current > 0 ||
      inFlightSendsRef.current > 0
    ) {
      return false;
    }
    failedSyncPendingRef.current = false;
    localEditUntilRef.current = 0;
    requestLocalSync();
    return true;
  }, [requestLocalSync]);

  // R12: increment op het element, maar decrement op window-niveau — een
  // pointerup die buiten het element landt (of verloren gaat door alt-tab)
  // mag de server-sync niet permanent blokkeren tot remount.
  const interactionProps = {
    onPointerDown: () => { activePointersRef.current += 1; },
  };

  useEffect(() => {
    const releasePointer = () => {
      const wasActive = activePointersRef.current > 0;
      activePointersRef.current = Math.max(0, activePointersRef.current - 1);
      if (wasActive && activePointersRef.current === 0 && !flushDeferredSync()) {
        requestLocalSync();
      }
    };
    // Tab-switch mid-drag: er komt nooit meer een pointerup — teller resetten.
    const resetPointers = () => {
      const wasActive = activePointersRef.current > 0;
      activePointersRef.current = 0;
      if (wasActive && !flushDeferredSync()) requestLocalSync();
    };
    window.addEventListener("pointerup", releasePointer);
    window.addEventListener("pointercancel", releasePointer);
    document.addEventListener("visibilitychange", resetPointers);
    return () => {
      window.removeEventListener("pointerup", releasePointer);
      window.removeEventListener("pointercancel", releasePointer);
      document.removeEventListener("visibilitychange", resetPointers);
    };
  }, [flushDeferredSync, requestLocalSync]);

  const isOn = state?.on ?? false;

  const trackedSend = (
    cmd: DeviceCommand,
    continuousKey?: "brightness" | "color-temperature" | "color",
  ) => {
    // M7: bediening op een uitgeschakelde lamp zet hem ook aan — de backend
    // impliceert geen on:true bij brightness/kleur (zie lib/deviceCommands).
    const effective: DeviceCommand =
      cmd.on === undefined && (continuousKey !== undefined || !isOn)
        ? { ...cmd, on: true }
        : cmd;
    inFlightSendsRef.current += 1;
    void sendCommand({ id: device.id, cmd: effective, continuousKey })
      .catch(() => {
        // React Query has already rolled the failed optimistic operation back.
        // This includes intentionally superseded drafts: defer a local sync
        // until every newer send and active pointer interaction has finished.
        localEditUntilRef.current = 0;
        failedSyncPendingRef.current = true;
      })
      .finally(() => {
        inFlightSendsRef.current = Math.max(0, inFlightSendsRef.current - 1);
        if (inFlightSendsRef.current === 0 && !flushDeferredSync()) {
          requestLocalSync();
        }
      });
  };

  const refresh = async () => {
    const stateAtRequestStart = queryClient
      .getQueryData<Device[]>(["devices"])
      ?.find((cachedDevice) => cachedDevice.id === device.id)
      ?.current_state;
    setRefreshing(true);
    try {
      const fresh = await runWithAbortTimeout(
        (signal) => devicesApi.get(device.id, signal),
        DEVICE_REFRESH_TIMEOUT_MS,
      );
      queryClient.setQueryData(["devices"], (old: Device[] | undefined) =>
        old?.map((current) => {
          if (current.id !== device.id) return current;
          const stateChangedSinceStart =
            stateAtRequestStart !== undefined &&
            current.current_state !== stateAtRequestStart;
          return mergeRefreshedDevice(
            current,
            fresh,
            hasPendingCommands() || stateChangedSinceStart,
          );
        }),
      );
    } catch {
      // Dit haalt de laatst bekende serverstaat op (DB-rij), niet de lamp zelf —
      // een fout betekent dat de API onbereikbaar is, niet per se de lamp.
      toastError("Serverstatus ophalen mislukt — probeer het opnieuw");
    } finally {
      setRefreshing(false);
    }
  };

  const [mode, setMode] = useState<Mode>(
    state?.r > 0 || state?.g > 0 || state?.b > 0 ? "color" : "white"
  );

  // Local color state — UI updates immediately, API gets debounced
  const [localHex, setLocalHex] = useState(
    rgbToHex(state?.r ?? 255, state?.g ?? 200, state?.b ?? 100)
  );
  const [localBrightness, setLocalBrightness] = useState(state?.brightness ?? 100);
  const [localMireds, setLocalMireds] = useState(
    Math.round(1_000_000 / (state?.color_temp ?? 2700))
  );

  // Sync local state when device state changes from outside (e.g. another user)
  useEffect(() => {
    // Niet syncen terwijl de gebruiker sleept of een send onderweg is — anders
    // springt de slider terug naar de (nog niet bijgewerkte) serverwaarde.
    if (activePointersRef.current > 0 || inFlightSendsRef.current > 0) {
      return;
    }

    const graceRemaining = localEditUntilRef.current - Date.now();
    if (graceRemaining > 0) {
      const timer = window.setTimeout(
        requestLocalSync,
        graceRemaining + 1,
      );
      return () => window.clearTimeout(timer);
    }

    setLocalBrightness(state?.brightness ?? 100);
    setLocalMireds(Math.round(1_000_000 / (state?.color_temp ?? 2700)));

    // Sync color + mode when RGB changes externally
    const r = state?.r ?? 0;
    const g = state?.g ?? 0;
    const b = state?.b ?? 0;
    if (r > 0 || g > 0 || b > 0) {
      setLocalHex(rgbToHex(r, g, b));
      setMode("color");
    } else {
      setMode("white");
    }
  }, [
    requestLocalSync,
    state?.on,
    state?.brightness,
    state?.color_temp,
    state?.r,
    state?.g,
    state?.b,
    syncRevision,
  ]);

  // ─── Debounced API callers (200ms) ─────────────────────────────────────────

  const sendBrightness = useDebouncedCallback((v: number) => {
    trackedSend({ brightness: v }, "brightness");
  }, 200, { flushOnUnmount: false });

  const sendColorTemp = useDebouncedCallback((mireds: number) => {
    trackedSend({ color_temp_mireds: mireds }, "color-temperature");
  }, 200, { flushOnUnmount: false });

  const sendColor = useDebouncedCallback((hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    trackedSend({ r, g, b }, "color");
  }, 120, { flushOnUnmount: false });

  // Barriers can originate in this panel, a LampCard, a room/global toggle or
  // a scene. Cancel drafts synchronously when the transport reserves one so a
  // near-expired debounce can never re-enable a lamp after power-off.
  useEffect(
    () =>
      subscribeToBarriers(() => {
        sendBrightness.cancel();
        sendColorTemp.cancel();
        sendColor.cancel();
        localEditUntilRef.current = 0;
        failedSyncPendingRef.current = true;
      }),
    [sendBrightness, sendColor, sendColorTemp, subscribeToBarriers],
  );

  useEffect(() => {
    if (!isPending) flushDeferredSync();
  }, [flushDeferredSync, isPending]);

  useEffect(() => {
    if (isOn) return;
    sendBrightness.cancel();
    sendColorTemp.cancel();
    sendColor.cancel();
  }, [isOn, sendBrightness, sendColor, sendColorTemp]);

  // ─── Handlers (local state + debounced API) ────────────────────────────────

  const handleBrightness = (v: number) => {
    localEditUntilRef.current = Date.now() + 400;
    setLocalBrightness(v);
    sendBrightness(v);
  };

  const handleColorTemp = (mireds: number) => {
    localEditUntilRef.current = Date.now() + 400;
    setLocalMireds(mireds);
    sendColorTemp(mireds);
  };

  const handleColor = (hex: string) => {
    // Only update local — does NOT call setQueryData on every move
    localEditUntilRef.current = Date.now() + 400;
    setLocalHex(hex);
    sendColor(hex);
  };

  // L7: een moduswissel stuurt ook echt een commando, zodat de lamp de UI
  // volgt. Alleen als de lamp aan is — een tabwissel op een uitgeschakelde
  // lamp mag hem niet onverwacht aanzetten.
  const handleModeSwitch = (m: Mode) => {
    if (m === mode || isPending) return;
    setMode(m);
    sendBrightness.cancel();
    sendColorTemp.cancel();
    sendColor.cancel();
    if (!isOn) return;
    localEditUntilRef.current = Date.now() + 400;
    if (m === "white") {
      trackedSend({ color_temp_mireds: localMireds });
    } else {
      const { r, g, b } = hexToRgb(localHex);
      trackedSend({ r, g, b });
    }
  };

  // L5: los hex-invoerveld naast de picker (valideert #rrggbb).
  const generatedControlId = useId();
  const hexInputId = `lamp-color-hex-${generatedControlId.replaceAll(":", "")}`;
  const hexInputRef = useRef<HTMLInputElement>(null);
  const [hexDraft, setHexDraft] = useState(localHex);
  useEffect(() => {
    // Niet klobberen terwijl de gebruiker in het veld typt.
    if (document.activeElement !== hexInputRef.current) setHexDraft(localHex);
  }, [localHex]);
  const normalizeHex = (raw: string) => (raw.startsWith("#") ? raw : `#${raw}`);
  const hexDraftValid = /^#[0-9a-fA-F]{6}$/.test(normalizeHex(hexDraft.trim()));
  const handleHexInput = (raw: string) => {
    setHexDraft(raw);
    const normalized = normalizeHex(raw.trim());
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) handleColor(normalized.toLowerCase());
  };

  const kelvin = localMireds > 0 ? Math.round(1_000_000 / localMireds) : 2700;
  const controlAccent = mode === "color" ? localHex : kelvinToHex(kelvin);
  const controlStyle = {
    ...createLampAmbientStyle(controlAccent, true),
    "--control-brightness": `${localBrightness}%`,
  } as CSSProperties;

  return (
    <div
      className="space-y-5 p-4"
      style={controlStyle}
      onClick={(event) => event.stopPropagation()}
    >
      {isPending && (
        <p role="status" aria-live="polite" className="rounded-lg border border-[var(--lamp-ambient-border)] bg-[var(--lamp-ambient-soft)] px-3 py-2 text-center text-xs text-[var(--lamp-text)]">
          Wijziging wordt toegepast - de gewenste staat blijft zichtbaar tot bevestiging.
        </p>
      )}
      {/* M7: eerlijk zijn over de uit-staat — bediening zet de lamp aan */}
      {!isOn && (
        <p className="rounded-lg border border-[var(--lamp-ambient-border)] bg-[var(--lamp-ambient-soft)] px-3 py-2 text-center text-xs text-[var(--lamp-text)]">
          Lamp staat uit — bediening zet hem aan
        </p>
      )}
      <div className={cn("space-y-5 transition-opacity", !isOn && "opacity-50")}>
      {/* Helderheid + Refresh */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
            <Sun size={13} />
            <span>Helderheid</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[var(--lamp-text)]">{localBrightness}%</span>
            <IconButton
              onClick={refresh}
              disabled={isPending}
              loading={refreshing}
              label="Serverstatus ophalen"
              title="Haal de laatst bekende serverstatus op"
              icon={<RefreshCw size={13} />}
            />
          </div>
        </div>
        <Range
          min={10}
          max={100}
          value={localBrightness}
          fillValue={localBrightness}
          track="lamp"
          onChange={(e) => handleBrightness(+e.target.value)}
          aria-label="Helderheid"
          {...interactionProps}
        />
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 rounded-xl bg-[var(--color-surface-hover)] p-1">
        {(["white", "color"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeSwitch(m)}
            disabled={isPending}
            aria-pressed={mode === m}
            className={`flex min-h-[var(--touch-target)] flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs transition-[background-color,border-color,color,opacity] duration-[var(--motion-standard)] disabled:cursor-wait disabled:opacity-50 ${
              mode === m
                ? "border border-[var(--lamp-ambient-border)] bg-[var(--lamp-ambient-medium)] font-medium text-[var(--lamp-text)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {m === "white" ? <Thermometer size={12} /> : <Palette size={12} />}
            {m === "white" ? "Wit licht" : "Kleur"}
          </button>
        ))}
      </div>

      {/* Color temp */}
      {mode === "white" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <Thermometer size={13} />
              <span>Kleurtemperatuur</span>
            </div>
            <span className="text-xs text-[var(--color-text-muted)] font-mono">{kelvin}K</span>
          </div>
          <Range
            min={154}
            max={455}
            value={localMireds}
            track="temperature"
            onChange={(e) => handleColorTemp(+e.target.value)}
            aria-label="Kleurtemperatuur"
            aria-valuetext={`${kelvin} Kelvin`}
            {...interactionProps}
          />
          <div className="flex justify-between mt-1 text-micro text-[var(--color-text-subtle)]">
            <span>Koel 6500K</span>
            <span>Warm 2200K</span>
          </div>
        </div>
      )}

      {/* Color picker */}
      {mode === "color" && (
        <div className="space-y-3">
          {/* Preset swatches */}
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-1.5">
            {COLOR_PRESETS.map(({ hex, label }) => (
              <button
                key={hex}
                type="button"
                onClick={() => handleColor(hex)}
                aria-label={label}
                title={label}
                className={cn(
                  "aspect-square min-h-[var(--touch-target)] w-full rounded-lg border-2 bg-[var(--lamp-accent)] transition-[background-color,border-color,transform] duration-[var(--motion-standard)] hover:scale-105 active:scale-95 motion-reduce:transform-none",
                  localHex.toLowerCase() === hex
                    ? "border-[var(--color-text)]"
                    : "border-transparent",
                )}
                style={createLampAmbientStyle(hex, true)}
              />
            ))}
          </div>

          {/* Full color picker */}
          <div {...interactionProps}>
            <HexColorPicker
              color={localHex}
              onChange={handleColor}
              className="!h-32 !w-full"
            />
          </div>
          <FormField
            id={hexInputId}
            label="Hexkleur (#rrggbb)"
            error={!hexDraftValid ? "Voer een geldige hexkleur in (#rrggbb)." : undefined}
            visuallyHiddenLabel
          >
            {(controlProps) => (
              <div className="flex items-center gap-2">
                <div
                  className="h-7 min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--lamp-accent)] transition-colors duration-[var(--motion-fast)]"
                />
                <Input
                  {...controlProps}
                  ref={hexInputRef}
                  type="text"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  maxLength={7}
                  placeholder="#ff8800"
                  value={hexDraft}
                  onChange={(e) => handleHexInput(e.target.value)}
                  onBlur={() => setHexDraft(localHex)}
                  invalid={!hexDraftValid}
                  className="w-24 shrink-0 text-center font-mono text-xs"
                />
              </div>
            )}
          </FormField>
        </div>
      )}
      </div>
    </div>
  );
}
