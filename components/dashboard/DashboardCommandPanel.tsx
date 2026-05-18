"use client";

import { Power } from "lucide-react";
import { CUSTOM_SCENES, type ScenePreset } from "@/lib/scenes";
import { Panel } from "./DashboardPrimitives";

export function SceneButton({
  scene,
  disabled,
  onClick,
}: {
  scene: ScenePreset;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={`Scene ${scene.label} toepassen`}
      className="flex min-h-[72px] min-w-0 flex-col items-start justify-between rounded-xl border border-white/8 bg-white/[0.035] p-3 text-left transition-colors hover:border-white/14 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span
        className="h-3 w-8 rounded-full border border-white/20"
        style={{ backgroundColor: scene.color }}
      />
      <span className="truncate text-sm font-semibold text-slate-200">{scene.label}</span>
    </button>
  );
}

export function CommandPanel({
  allOn,
  onlineCount,
  totalCount,
  onCount,
  onToggleAll,
  onApplyScene,
}: {
  allOn: boolean;
  onlineCount: number;
  totalCount: number;
  onCount: number;
  onToggleAll: () => void;
  onApplyScene: (scene: ScenePreset) => void;
}) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Direct bedienen
          </p>
          <h2 className="mt-1 text-lg font-bold text-white">Licht en sfeer</h2>
          <p className="mt-1 text-sm text-slate-500">
            {totalCount === 0 ? "Geen devices gekoppeld" : `${onlineCount}/${totalCount} online - ${onCount} aan`}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleAll}
          disabled={onlineCount === 0}
          title={allOn ? "Alle online lampen uitzetten" : "Alle online lampen aanzetten"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-200 transition-colors hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:border-[var(--color-border)] disabled:bg-white/[0.03] disabled:text-slate-600"
        >
          <Power size={18} />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {CUSTOM_SCENES.slice(0, 6).map((scene) => (
          <SceneButton
            key={scene.id}
            scene={scene}
            disabled={onlineCount === 0}
            onClick={() => onApplyScene(scene)}
          />
        ))}
      </div>
    </Panel>
  );
}
