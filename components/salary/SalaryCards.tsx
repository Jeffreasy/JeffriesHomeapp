"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SalarisRecord } from "@/hooks/useSalary";
import type { LoonstrookRecord } from "@/hooks/useLoonstroken";
import { FORECAST_ASSUMPTIONS } from "@/lib/salaryForecast";
import { type SalarisDisplayRecord } from "./SalaryTypes";
import { fmt, MAANDEN } from "./SalaryUtils";
import { AppIcon } from "@/components/ui/AppIcon";

/** S1: privacy-mask voor geldbedragen — identiek patroon als finance. */
export type MaskFn = (value: string) => string;
const noMask: MaskFn = (value) => value;

function formatPct(value: number) {
  return `${(Math.round(value * 1000) / 10).toLocaleString("nl-NL")}%`;
}

export function PrognoseCard({ record, mask = noMask }: { record: SalarisDisplayRecord; mask?: MaskFn }) {
  const isWerkelijk = record.bron === "werkelijk";
  const eenmalig: { label: string; bedrag: number }[] = useMemo(() => {
    try { return record.eenmaligDetail ? JSON.parse(record.eenmaligDetail) : []; } catch { return []; }
  }, [record.eenmaligDetail]);

  const ort: Record<string, number> = useMemo(() => {
    try { return record.ortDetail ? JSON.parse(record.ortDetail) : {}; } catch { return {}; }
  }, [record.ortDetail]);
  const ortHours: Record<string, number> = useMemo(() => {
    try { return record.ortUrenDetail ? JSON.parse(record.ortUrenDetail) : {}; } catch { return {}; }
  }, [record.ortUrenDetail]);
  const isRoosterForecast = Boolean(record.generatedFromSchedule);
  const hasHourMetrics = typeof record.totaalUren === "number";

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] text-amber-400/70 uppercase tracking-wider">
            {isWerkelijk ? "Werkelijke loonstrook" : isRoosterForecast ? "Roosterprognose" : "Lopende maand prognose"}
          </p>
          <p className="text-lg font-bold text-amber-300">
            {MAANDEN[record.maand - 1]} {record.jaar}
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span className="text-[10px] text-slate-500 bg-[var(--color-surface)] px-2 py-1 rounded-lg">
            uurloon ORT {mask(fmt(record.uurloonORT))}
          </span>
          {record.salarisCalibratie && (
            <span className="text-[10px] text-slate-400">
              {record.salarisCalibratie}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--color-surface)] rounded-xl p-3 border border-[var(--color-border)]">
          <p className="text-[10px] text-slate-500 mb-1">▶ Bruto</p>
          <p className="text-xl font-bold text-white">{mask(fmt(record.brutoBetaling))}</p>
        </div>
        <div className="bg-emerald-500/8 rounded-xl p-3 border border-emerald-500/20">
          <p className="text-[10px] text-emerald-400/70 mb-1">{isWerkelijk ? "Netto werkelijk" : "≈ Netto prognose"}</p>
          <p className="text-xl font-bold text-emerald-300">{mask(fmt(record.nettoPrognose))}</p>
        </div>
      </div>

      {hasHourMetrics && (
        <div>
          {/* S4: bedragen uit de loonstrook, uren uit het rooster — dat
              onderscheid expliciet labelen. */}
          {isWerkelijk && (
            <p className="mb-1.5 text-[10px] uppercase tracking-wider text-slate-500">
              uren volgens rooster
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricPill label="Gewerkt" value={`${formatHours(record.totaalUren ?? 0)}u`} />
            <MetricPill label="Contract" value={`${formatHours(record.contractUren ?? 0)}u`} />
            <MetricPill label="Extra" value={`${formatHours(record.extraUren ?? 0)}u`} accent={(record.extraUren ?? 0) > 0} />
            <MetricPill label="ORT" value={`${formatHours(record.ortUren ?? 0)}u`} accent={(record.ortUren ?? 0) > 0} />
          </div>
        </div>
      )}

      {/* Full breakdown is collapsed by default — the card opens on netto/bruto
          + the metric pills, content-first. */}
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-200">
          <span>Opbouw{Object.keys(ort).length > 0 ? " & ORT-detail" : ""}</span>
          <ChevronDown size={14} className="shrink-0 transition-transform group-open:rotate-180" />
        </summary>

        <div className="mt-2 space-y-1.5 text-xs">
          <BreakdownRow label="Basisalaris (44,44%)" bedrag={record.basisLoon} mask={mask} />
          <BreakdownRow label="Amt Zeerintensief (5%)" bedrag={record.amtZeerintensief} mask={mask} />
          {record.toeslagBalansvif > 0 && <BreakdownRow label="Balansverlof toeslag" bedrag={record.toeslagBalansvif} mask={mask} />}
          {record.toeslagVakatieUren > 0 && <BreakdownRow label="Vakantie-uren toeslag" bedrag={record.toeslagVakatieUren} mask={mask} />}
          <BreakdownRow label="ORT toeslagen" bedrag={record.ortTotaal} mask={mask} />
          {record.extraUrenBedrag > 0 && <BreakdownRow label="Extra uren" bedrag={record.extraUrenBedrag} mask={mask} />}
          <BreakdownRow label="Reiskosten" bedrag={record.reiskosten} mask={mask} />
          {record.eenmaligTotaal > 0 && (
            <BreakdownRow label={eenmalig.map((e) => e.label).join(" + ") || "Eenmalig"} bedrag={record.eenmaligTotaal} accent mask={mask} />
          )}
          <div className="border-t border-[var(--color-border)] pt-1.5 mt-1.5" />
          <BreakdownRow label="Pensioen PFZW (12,95%)" bedrag={-record.pensioenpremie} negatief mask={mask} />
          <BreakdownRow label={isWerkelijk ? "Loonheffing" : "≈ Loonheffing (schatting)"} bedrag={-record.loonheffingSchat} negatief mask={mask} />
        </div>

        {Object.keys(ort).length > 0 && (
          <div className="mt-2 bg-[var(--color-surface)] rounded-lg p-3 border border-[var(--color-border)] space-y-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">ORT detail</p>
            {Object.entries(ort).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 text-[11px]">
                <span className="text-slate-400">{k}</span>
                <span className="text-right text-slate-300">
                  {ortHours[k] ? `${formatHours(ortHours[k])}u · ` : ""}{mask(fmt(v))}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* S2: forecast-aannames — alleen relevant voor prognoses; een
            werkelijke loonstrook rekent nergens mee. */}
        {!isWerkelijk && (
          <div className="mt-2 bg-[var(--color-surface)] rounded-lg p-3 border border-[var(--color-border)] space-y-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Aannames prognose</p>
            <AssumptionRow
              label="Contracturen"
              value={`${record.contractUrenPerWeek ?? FORECAST_ASSUMPTIONS.contractUrenPerWeek}u per week`}
            />
            <AssumptionRow
              label="Deeltijdfactor"
              value={formatPct(FORECAST_ASSUMPTIONS.deeltijdFactor)}
            />
            <AssumptionRow
              label="Reisafstand"
              value={`${FORECAST_ASSUMPTIONS.reisafstandKmEnkel} km enkele reis`}
            />
            <AssumptionRow
              label="Effectieve loonheffing"
              value={formatPct(record.loonheffingPct ?? FORECAST_ASSUMPTIONS.fallbackLoonheffingPct)}
            />
            {record.tariefVanaf && (
              <AssumptionRow label="Cao-tarief actief vanaf" value={record.tariefVanaf} />
            )}
            {record.salarisCalibratie && (
              <AssumptionRow label="Kalibratie" value={record.salarisCalibratie} />
            )}
          </div>
        )}
      </details>
    </div>
  );
}

function formatHours(value: number) {
  return String(Math.round(value * 10) / 10).replace(".", ",");
}

function AssumptionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-[11px]">
      <span className="text-slate-400">{label}</span>
      <span className="text-right text-slate-300">{value}</span>
    </div>
  );
}

function MetricPill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn(
      "rounded-xl border px-3 py-2",
      accent
        ? "border-amber-400/20 bg-amber-400/10"
        : "border-[var(--color-border)] bg-[var(--color-surface)]"
    )}>
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className={cn("mt-0.5 text-sm font-bold tabular-nums", accent ? "text-amber-200" : "text-slate-200")}>{value}</p>
    </div>
  );
}

export function BreakdownRow({ label, bedrag, negatief, accent, mask = noMask }: {
  label: string; bedrag: number; negatief?: boolean; accent?: boolean; mask?: MaskFn;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={cn("text-slate-500", accent && "text-amber-400/80")}>{label}</span>
      <span className={cn(
        "font-medium tabular-nums",
        negatief ? "text-red-400" : accent ? "text-amber-300" : "text-slate-300"
      )}>
        {mask(bedrag < 0 ? `-${fmt(-bedrag)}` : fmt(bedrag))}
      </span>
    </div>
  );
}

export function MaandBalk({ record, maxNetto, mask = noMask, selected, onSelect }: {
  record: SalarisDisplayRecord;
  maxNetto: number;
  mask?: MaskFn;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const pct    = maxNetto > 0 ? (record.nettoPrognose / maxNetto) * 100 : 0;
  const isEenm = record.eenmaligTotaal > 0;
  const isWerkelijk = record.bron === "werkelijk";
  const detail = `${MAANDEN[record.maand - 1]}: ${mask(fmt(record.nettoPrognose))} (${isWerkelijk ? "werkelijk" : "prognose"})`;

  return (
    // S6: title-only werkt niet op touch — tap toont het detail (via JaarSectie).
    <button
      type="button"
      onClick={onSelect}
      title={detail}
      aria-pressed={selected}
      aria-label={detail}
      className={cn(
        "flex w-full items-end gap-1.5 group appearance-none border-0 bg-transparent p-0 rounded",
        selected && "bg-white/[0.05]"
      )}
    >
      <div className="flex flex-col items-center gap-0.5 w-full">
        {isEenm && (
          <span className={cn(
            "text-[10px] text-amber-400 transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}>★</span>
        )}
        <div
          className={cn(
            "w-full rounded-t transition-all duration-300",
            isWerkelijk ? "bg-emerald-400/60" : isEenm ? "bg-amber-400/60" : "bg-blue-500/40 group-hover:bg-blue-500/60"
          )}
          style={{ height: `${Math.max(pct, 4)}%`, minHeight: "4px" }}
        />
        <span className={cn(
          "text-[10px] transition-colors",
          selected ? "text-slate-200" : "text-slate-400 group-hover:text-slate-300"
        )}>
          {MAANDEN[record.maand - 1].slice(0, 3)}
        </span>
      </div>
    </button>
  );
}

export function JaarSectie({ jaar, records, mask = noMask }: { jaar: number; records: SalarisDisplayRecord[]; mask?: MaskFn }) {
  const sorted   = [...records].sort((a, b) => a.maand - b.maand);
  const maxNetto = Math.max(...sorted.map((r) => r.nettoPrognose));
  const totBruto = sorted.reduce((s, r) => s + r.brutoBetaling, 0);
  const totNetto = sorted.reduce((s, r) => s + r.nettoPrognose, 0);
  const werkelijkAantal = sorted.filter((r) => r.bron === "werkelijk").length;
  // S6: tap-to-show detail voor de maandbalkjes (title werkt niet op touch).
  const [selectedPeriode, setSelectedPeriode] = useState<string | null>(null);
  const selectedRecord = sorted.find((r) => r.periode === selectedPeriode) ?? null;

  return (
    <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden min-w-0">
      <div className="flex flex-col gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-200">
          <AppIcon name="calendar" tone="slate" size="sm" />
          {jaar}
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {werkelijkAantal > 0 && <span className="text-emerald-400">{werkelijkAantal} werkelijk</span>}
          <span className="text-slate-500">Bruto <span className="text-slate-300 font-medium">{mask(fmt(totBruto))}</span></span>
          <span className="text-slate-500">Netto <span className="text-emerald-400 font-bold">{mask(fmt(totNetto))}</span></span>
        </div>
      </div>

      <div
        className="flex items-end gap-0.5 px-3 pt-3 pb-2"
        style={{ height: "88px" }}
      >
        {sorted.map((r) => (
          <MaandBalk
            key={r.periode}
            record={r}
            maxNetto={maxNetto}
            mask={mask}
            selected={selectedPeriode === r.periode}
            onSelect={() => setSelectedPeriode((current) => (current === r.periode ? null : r.periode))}
          />
        ))}
      </div>

      {selectedRecord && (
        <p className="px-4 pb-2 text-[11px] text-slate-400" aria-live="polite">
          {MAANDEN[selectedRecord.maand - 1]} {selectedRecord.jaar}:{" "}
          <span className="font-semibold text-slate-200">{mask(fmt(selectedRecord.nettoPrognose))}</span>{" "}
          ({selectedRecord.bron === "werkelijk" ? "werkelijk" : "prognose"}
          {selectedRecord.eenmaligTotaal > 0 ? " · incl. eenmalig" : ""})
        </p>
      )}

      <div className="divide-y divide-[var(--color-border)]">
        {sorted.map((r) => (
          <MaandRij key={r.periode} record={r} mask={mask} />
        ))}
      </div>
    </div>
  );
}

export function MaandRij({ record: r, mask = noMask }: { record: SalarisDisplayRecord; mask?: MaskFn }) {
  const eenmalig: { label: string }[] = useMemo(() => {
    try { return r.eenmaligDetail ? JSON.parse(r.eenmaligDetail) : []; } catch { return []; }
  }, [r.eenmaligDetail]);
  const isWerkelijk = r.bron === "werkelijk";
  const isRoosterForecast = Boolean(r.generatedFromSchedule);

  return (
    <div className="flex flex-col gap-2 px-4 py-3 hover:bg-[var(--color-surface-hover)] transition-colors sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <span className="text-xs font-medium text-slate-400 w-8">{MAANDEN[r.maand - 1]}</span>
        <span className="text-[10px] text-slate-500">{r.aantalDiensten} diensten</span>
        {typeof r.totaalUren === "number" && (
          <span className="text-[10px] text-slate-500">{formatHours(r.totaalUren)}u{isWerkelijk ? " (rooster)" : ""}</span>
        )}
        {isRoosterForecast && (
          <span className="text-[10px] bg-sky-500/15 text-sky-300 px-1.5 py-0.5 rounded-full">
            rooster
          </span>
        )}
        {isWerkelijk && (
          <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full">
            werkelijk
          </span>
        )}
        {eenmalig.map((e) => (
          <span key={e.label} className="text-[10px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full">
            {e.label.replace(/^[^\s]+ /, "")}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between gap-4 text-xs tabular-nums shrink-0 sm:justify-end">
        <span className="text-slate-500 hidden sm:block">{mask(fmt(r.brutoBetaling))}</span>
        <span className="text-red-500/80 text-[11px] hidden sm:block">{mask(`-${fmt(r.pensioenpremie)}`)}</span>
        <span className="text-emerald-400 font-semibold">{mask(fmt(r.nettoPrognose))}</span>
      </div>
    </div>
  );
}

export function TotaalCard({ icon: Icon, label, value, accent }: {
  icon: LucideIcon; label: string; value: string; accent: string;
}) {
  return (
    <div className="glass rounded-xl p-3 border border-[var(--color-border)] min-w-0" style={{ borderColor: accent + "20" }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={11} style={{ color: accent }} />
        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-sm font-bold" style={{ color: accent }}>{value}</p>
    </div>
  );
}

export function VergelijkingSectie({
  berekend,
  werkelijkByPeriode,
  mask = noMask,
}: {
  berekend: SalarisRecord[];
  werkelijkByPeriode: Map<string, LoonstrookRecord>;
  mask?: MaskFn;
}) {
  const rows = berekend
    .filter((r) => werkelijkByPeriode.has(r.periode))
    .map((r) => {
      const w = werkelijkByPeriode.get(r.periode)!;
      const deltaNetto = w.netto - r.nettoPrognose;
      const deltaOrt = w.ortTotaal - r.ortTotaal;
      return { periode: r.periode, maand: r.maand, jaar: r.jaar, berekend: r, werkelijk: w, deltaNetto, deltaOrt };
    })
    .sort((a, b) => a.jaar - b.jaar || a.maand - b.maand);

  if (rows.length === 0) return null;

  const DeltaBadge = ({ delta }: { delta: number }) => {
    const pos = delta >= 0;
    return (
      <span className={cn(
        "text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded",
        pos ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
      )}>
        {mask(`${pos ? "+" : ""}${fmt(delta)}`)}
      </span>
    );
  };

  return (
    <div className="glass rounded-2xl p-5 border border-[var(--color-border)] min-w-0">
      <p className="text-[10px] text-teal-400/70 uppercase tracking-wider font-bold mb-3">
        Berekend vs Werkelijk
      </p>
      {/* Desktop: dense table */}
      <div className="hidden overflow-x-auto sm:block">
        <table style={{ width: "100%", fontSize: "0.75rem", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
              <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--color-text-muted)" }}>Periode</th>
              <th style={{ textAlign: "right", padding: "6px 8px", color: "#f59e0b" }}>Berekend</th>
              <th style={{ textAlign: "right", padding: "6px 8px", color: "#34d399" }}>Werkelijk</th>
              <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--color-text-muted)" }}>Δ Netto</th>
              <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--color-text-muted)" }}>Δ ORT</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.periode} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <td style={{ padding: "6px 8px", fontWeight: 600 }}>{MAANDEN[r.maand - 1]} {r.jaar}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#f59e0b" }}>{mask(fmt(r.berekend.nettoPrognose))}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#34d399" }}>{mask(fmt(r.werkelijk.netto))}</td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}><DeltaBadge delta={r.deltaNetto} /></td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}><DeltaBadge delta={r.deltaOrt} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone: stacked card rows — no horizontal scroll */}
      <div className="space-y-2 sm:hidden">
        {rows.map((r) => (
          <div key={r.periode} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-300">{MAANDEN[r.maand - 1]} {r.jaar}</span>
              <DeltaBadge delta={r.deltaNetto} />
            </div>
            <div className="mt-1.5 flex items-center gap-4 text-[11px] tabular-nums">
              <span className="text-slate-500">Berekend <span className="font-medium text-amber-300">{mask(fmt(r.berekend.nettoPrognose))}</span></span>
              <span className="text-slate-500">Werkelijk <span className="font-medium text-emerald-300">{mask(fmt(r.werkelijk.netto))}</span></span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] tabular-nums">
              <span className="text-slate-500">Δ ORT</span>
              <DeltaBadge delta={r.deltaOrt} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
