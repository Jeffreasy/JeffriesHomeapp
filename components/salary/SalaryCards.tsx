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
import { Surface } from "@/components/ui/Surface";
import { SurfaceHeader } from "@/components/ui/SurfaceHeader";
import { Badge } from "@/components/ui/Badge";
import { uiToneClasses, type UiTone } from "@/lib/ui/tones";

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
    <Surface tone="warning" padding="md" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-micro uppercase tracking-wider text-[var(--color-warning)]">
            {isWerkelijk ? "Werkelijke loonstrook" : isRoosterForecast ? "Roosterprognose" : "Lopende maand prognose"}
          </p>
          <p className="text-lg font-bold text-[var(--color-warning)]">
            {MAANDEN[record.maand - 1]} {record.jaar}
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <Badge tone="neutral" size="sm">
            uurloon ORT {mask(fmt(record.uurloonORT))}
          </Badge>
          {record.salarisCalibratie && (
            <Badge tone="info" size="sm">
              {record.salarisCalibratie}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Surface tone="subtle" radius="md" padding="sm">
          <p className="mb-1 text-micro text-[var(--color-text-muted)]">Bruto</p>
          <p className="text-xl font-bold text-[var(--color-text)]">{mask(fmt(record.brutoBetaling))}</p>
        </Surface>
        <Surface tone="success" radius="md" padding="sm">
          <p className="mb-1 text-micro text-[var(--color-success)]">{isWerkelijk ? "Netto werkelijk" : "≈ Netto prognose"}</p>
          <p className="text-xl font-bold text-[var(--color-success)]">{mask(fmt(record.nettoPrognose))}</p>
        </Surface>
      </div>

      {hasHourMetrics && (
        <div>
          {/* S4: bedragen uit de loonstrook, uren uit het rooster — dat
              onderscheid expliciet labelen. */}
          {isWerkelijk && (
            <p className="mb-1.5 text-micro uppercase tracking-wider text-[var(--color-text-muted)]">
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
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-lg py-1.5 text-xs font-semibold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]">
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
          <Surface tone="subtle" radius="sm" padding="sm" className="mt-2 space-y-1">
            <p className="text-micro text-[var(--color-text-muted)] uppercase tracking-wider mb-2">ORT detail</p>
            {Object.entries(ort).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 text-micro">
                <span className="text-[var(--color-text-muted)]">{k}</span>
                <span className="text-right text-[var(--color-text)]">
                  {ortHours[k] ? `${formatHours(ortHours[k])}u · ` : ""}{mask(fmt(v))}
                </span>
              </div>
            ))}
          </Surface>
        )}

        {/* S2: forecast-aannames — alleen relevant voor prognoses; een
            werkelijke loonstrook rekent nergens mee. */}
        {!isWerkelijk && (
          <Surface tone="subtle" radius="sm" padding="sm" className="mt-2 space-y-1">
            <p className="text-micro text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Aannames prognose</p>
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
          </Surface>
        )}
      </details>
    </Surface>
  );
}

function formatHours(value: number) {
  return String(Math.round(value * 10) / 10).replace(".", ",");
}

function AssumptionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-micro">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="text-right text-[var(--color-text)]">{value}</span>
    </div>
  );
}

function MetricPill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Surface tone={accent ? "accent" : "subtle"} radius="md" padding="sm">
      <p className="text-micro uppercase tracking-wider text-[var(--color-text-muted)]">{label}</p>
      <p className={cn("mt-0.5 text-sm font-bold tabular-nums", accent ? "text-[var(--color-primary-hover)]" : "text-[var(--color-text)]")}>{value}</p>
    </Surface>
  );
}

export function BreakdownRow({ label, bedrag, negatief, accent, mask = noMask }: {
  label: string; bedrag: number; negatief?: boolean; accent?: boolean; mask?: MaskFn;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={cn("text-[var(--color-text-muted)]", accent && "text-[var(--color-warning)]")}>{label}</span>
      <span className={cn(
        "font-medium tabular-nums",
        negatief ? "text-[var(--color-danger)]" : accent ? "text-[var(--color-primary-hover)]" : "text-[var(--color-text)]"
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
  const isEenm = record.eenmaligTotaal > 0;
  const isWerkelijk = record.bron === "werkelijk";
  // Privacy: mask() maskeert alleen de tekst, maar de bar-hoogte lekt de
  // relatieve netto-verhoudingen nog. Detecteer de mask-staat en vlak de
  // balken af tot een uniforme hoogte zodra privacy aanstaat.
  const isMasked = mask("") === "••••";
  const pct = isMasked
    ? 100
    : maxNetto > 0 ? (record.nettoPrognose / maxNetto) * 100 : 0;
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
        "group flex h-full min-h-11 w-full appearance-none items-end gap-1.5 rounded border-0 bg-transparent p-0",
        selected && "bg-[var(--color-surface-hover)]"
      )}
    >
      <div className="flex flex-col items-center gap-0.5 w-full">
        {isEenm && (
          <span className={cn(
            "text-micro text-[var(--color-warning)] transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}>★</span>
        )}
        {/* Semantic chart colors encode source and one-off pay; height encodes the salary value. */}
        <div
          className={cn(
            "min-h-1 w-full rounded-t transition-[height,background-color] duration-[var(--motion-slow)]",
            isWerkelijk
              ? "bg-[color-mix(in_srgb,var(--color-success)_60%,transparent)]"
              : isEenm
                ? "bg-[color-mix(in_srgb,var(--color-warning)_60%,transparent)]"
                : "bg-[color-mix(in_srgb,var(--color-info)_40%,transparent)] group-hover:bg-[color-mix(in_srgb,var(--color-info)_60%,transparent)]"
          )}
          style={{ height: `${Math.max(pct, 4)}%` }}
        />
        <span className={cn(
          "text-micro transition-colors",
          selected ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]"
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
    <Surface padding="none" className="overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
          <AppIcon name="calendar" tone="neutral" size="sm" />
          {jaar}
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {/* Scope: jaartotalen mengen werkelijke loonstrookmaanden met
              prognosemaanden — label dat zodra beide soorten meetellen. */}
          {werkelijkAantal > 0 && werkelijkAantal < sorted.length && (
            <span className="text-[var(--color-text-muted)]">{werkelijkAantal} werkelijk · {sorted.length - werkelijkAantal} prognose</span>
          )}
          {werkelijkAantal > 0 && werkelijkAantal === sorted.length && (
            <Badge tone="success" size="sm">{werkelijkAantal} werkelijk</Badge>
          )}
          <span className="text-[var(--color-text-muted)]">Bruto <span className="font-medium text-[var(--color-text)]">{mask(fmt(totBruto))}</span></span>
          <span className="text-[var(--color-text-muted)]">Netto <span className="font-bold text-[var(--color-success)]">{mask(fmt(totNetto))}</span></span>
        </div>
      </div>

      <div className="flex h-[88px] items-end gap-0.5 px-3 pb-2 pt-3">
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
        <p className="px-4 pb-2 text-micro text-[var(--color-text-muted)]" aria-live="polite">
          {MAANDEN[selectedRecord.maand - 1]} {selectedRecord.jaar}:{" "}
          <span className="font-semibold text-[var(--color-text)]">{mask(fmt(selectedRecord.nettoPrognose))}</span>{" "}
          ({selectedRecord.bron === "werkelijk" ? "werkelijk" : "prognose"}
          {selectedRecord.eenmaligTotaal > 0 ? " · incl. eenmalig" : ""})
        </p>
      )}

      <div className="divide-y divide-[var(--color-border)]">
        {sorted.map((r) => (
          <MaandRij key={r.periode} record={r} mask={mask} />
        ))}
      </div>
    </Surface>
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
        <span className="w-8 text-xs font-medium text-[var(--color-text-muted)]">{MAANDEN[r.maand - 1]}</span>
        <span className="text-micro text-[var(--color-text-muted)]">{r.aantalDiensten} diensten</span>
        {typeof r.totaalUren === "number" && (
          <span className="text-micro text-[var(--color-text-muted)]">{formatHours(r.totaalUren)}u{isWerkelijk ? " (rooster)" : ""}</span>
        )}
        {isRoosterForecast && (
          <Badge tone="info" size="sm">rooster</Badge>
        )}
        {isWerkelijk && (
          <Badge tone="success" size="sm">werkelijk</Badge>
        )}
        {eenmalig.map((e) => (
          <Badge key={e.label} tone="warning" size="sm">
            {e.label.replace(/^[^\s]+ /, "")}
          </Badge>
        ))}
      </div>
      <div className="flex items-center justify-between gap-4 text-xs tabular-nums shrink-0 sm:justify-end">
        <span className="text-[var(--color-text-muted)] hidden sm:block">{mask(fmt(r.brutoBetaling))}</span>
        <span className="hidden text-micro text-[var(--color-danger)] sm:block">{mask(`-${fmt(r.pensioenpremie)}`)}</span>
        <span className="font-semibold text-[var(--color-success)]">{mask(fmt(r.nettoPrognose))}</span>
      </div>
    </div>
  );
}

type TotaalCardTone = Extract<UiTone, "accent" | "info" | "success" | "warning">;

export function TotaalCard({ icon: Icon, label, value, tone }: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: TotaalCardTone;
}) {
  const toneClasses = uiToneClasses[tone];

  return (
    <Surface tone={tone} radius="md" padding="sm">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon size={14} className={cn("shrink-0", toneClasses.icon)} aria-hidden="true" />
        <p className="text-micro uppercase tracking-wider text-[var(--color-text-muted)]">
          {label}
        </p>
      </div>
      <p className={cn("text-sm font-bold", toneClasses.text)}>{value}</p>
    </Surface>
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
      <Badge tone={pos ? "success" : "danger"} size="sm" className="tabular-nums">
        {mask(`${pos ? "+" : ""}${fmt(delta)}`)}
      </Badge>
    );
  };

  return (
    <Surface padding="md">
      <SurfaceHeader
        eyebrow="Validatie"
        title="Berekend vs werkelijk"
        headingLevel={3}
        compact
      />
      {/* Desktop: dense table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th scope="col" className="px-2 py-1.5 text-left text-[var(--color-text-muted)]">Periode</th>
              <th scope="col" className="px-2 py-1.5 text-right text-[var(--color-warning)]">Berekend</th>
              <th scope="col" className="px-2 py-1.5 text-right text-[var(--color-success)]">Werkelijk</th>
              <th scope="col" className="px-2 py-1.5 text-right text-[var(--color-text-muted)]">Δ Netto</th>
              <th scope="col" className="px-2 py-1.5 text-right text-[var(--color-text-muted)]">Δ ORT</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.periode} className="border-b border-[var(--color-border)]">
                <td className="px-2 py-1.5 font-semibold">{MAANDEN[r.maand - 1]} {r.jaar}</td>
                <td className="px-2 py-1.5 text-right text-[var(--color-warning)]">{mask(fmt(r.berekend.nettoPrognose))}</td>
                <td className="px-2 py-1.5 text-right text-[var(--color-success)]">{mask(fmt(r.werkelijk.netto))}</td>
                <td className="px-2 py-1.5 text-right"><DeltaBadge delta={r.deltaNetto} /></td>
                <td className="px-2 py-1.5 text-right"><DeltaBadge delta={r.deltaOrt} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone: stacked card rows — no horizontal scroll */}
      <div className="space-y-2 sm:hidden">
        {rows.map((r) => (
          <Surface key={r.periode} tone="subtle" radius="sm" padding="sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[var(--color-text)]">{MAANDEN[r.maand - 1]} {r.jaar}</span>
              <DeltaBadge delta={r.deltaNetto} />
            </div>
            <div className="mt-1.5 flex items-center gap-4 text-micro tabular-nums">
              <span className="text-[var(--color-text-muted)]">Berekend <span className="font-medium text-[var(--color-warning)]">{mask(fmt(r.berekend.nettoPrognose))}</span></span>
              <span className="text-[var(--color-text-muted)]">Werkelijk <span className="font-medium text-[var(--color-success)]">{mask(fmt(r.werkelijk.netto))}</span></span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-micro tabular-nums">
              <span className="text-[var(--color-text-muted)]">Δ ORT</span>
              <DeltaBadge delta={r.deltaOrt} />
            </div>
          </Surface>
        ))}
      </div>
    </Surface>
  );
}
