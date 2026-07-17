"use client";

import { useMemo } from "react";
import { BarChart3, PieChart as PieChartIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SectionTitle } from "./FinanceCards";
import { ChartTooltip, PieTooltip } from "./ChartTooltips";
import { formatMonth } from "./FinanceUtils";
import { cn } from "@/lib/utils";
import { getCatColor, ibanLabel } from "@/lib/finance-constants";
import type { TransactionFilter, TransactionFullStats } from "@/hooks/useTransactions";

type ChartView = "saldo" | "inuit";
type PieSlice = TransactionFullStats["uitPerCategorie"][number] & {
  isRest?: boolean;
};
type MonthlyCashflowWithSalary =
  TransactionFullStats["inUitPerMaand"][number] & { salaris: number | null };

// Aantal echte categorie-slices in de pie; de rest wordt samengevoegd in één
// "Overige categorieën"-slice zodat pie, legenda en center-totaal kloppen.
const PIE_TOP_SLICES = 7;
const PIE_REST_LABEL = "Overige categorieën";
// Duidelijk anders dan de échte categorie "Overig" (#64748b) — de
// geaggregeerde rest-slice mag niet met die categorie verward worden (C2).
const PIE_REST_COLOR = "#cbd5e1";

// C3: uitgaven in oranje i.p.v. rood — rood/groen naast elkaar is voor
// rood-groen-kleurenblinden niet te onderscheiden; oranje/groen wél.
const INCOME_COLOR = "#22c55e";
const EXPENSE_COLOR = "#f97316";

// Onder de €2.000 zegt "€0k"/"€1k" niets — toon dan hele euro's.
function yAxisEuro(value: number) {
  return Math.abs(value) < 2000
    ? `€${Math.round(value).toLocaleString("nl-NL")}`
    : `€${(value / 1000).toFixed(0)}k`;
}

export function FinanceCharts({
  stats,
  chartView,
  setChartView,
  ibanFilter,
  privacyOn,
  inUitMetSalaris,
  loonstrokenCount,
  filters,
  toggleCategoryFilter,
  formatPrivateEuro,
  formatPrivateEuroExact,
}: {
  stats: TransactionFullStats;
  chartView: ChartView;
  setChartView: (v: ChartView) => void;
  ibanFilter?: string;
  privacyOn: boolean;
  inUitMetSalaris: MonthlyCashflowWithSalary[];
  loonstrokenCount: number;
  filters: TransactionFilter;
  toggleCategoryFilter: (cat: string) => void;
  formatPrivateEuro: (value: number) => string;
  formatPrivateEuroExact: (value: number) => string;
}) {
  // F1/scope: de charts beslaan de hele periode; categorie-/richting-/bedrag-
  // filters gelden alléén voor de lijst. Label dat op de pie zodra zo'n filter
  // actief is (zoekterm leeft in de page, dus die dekt de metrics-grid-label).
  const listOnlyFilterActive = Boolean(
    filters.categorieFilter || filters.richting ||
    filters.minBedrag !== undefined || filters.maxBedrag !== undefined ||
    filters.onlyStorneringen
  );

  // Top-N categorieën + één geaggregeerde rest-slice, zodat de pie, de
  // legenda én het center-totaal exact dezelfde dataset beschrijven.
  const pieData = useMemo(() => {
    const all: PieSlice[] = stats.uitPerCategorie ?? [];
    const top = all.slice(0, PIE_TOP_SLICES);
    const rest = all.slice(PIE_TOP_SLICES);
    if (rest.length === 0) return top;
    // C2: één overgebleven categorie niet wegaggregeren tot "Overige
    // categorieën" — toon hem gewoon als zichzelf (zelfde aantal slices).
    if (rest.length === 1) return [...top, ...rest];
    const restBedrag = rest.reduce((sum, category) => sum + category.bedrag, 0);
    const restCount = rest.reduce((sum, category) => sum + category.count, 0);
    const restPct = stats.totaalUit > 0
      ? Math.round((restBedrag / stats.totaalUit) * 1000) / 10
      : 0;
    return [
      ...top,
      { categorie: PIE_REST_LABEL, bedrag: restBedrag, count: restCount, percentage: restPct, isRest: true },
    ];
  }, [stats.uitPerCategorie, stats.totaalUit]);

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="glass p-4">
        <SectionTitle
          icon={BarChart3}
          title={chartView === "saldo" ? "Saldo verloop" : "Inkomsten versus uitgaven"}
          subtitle={ibanFilter ? ibanLabel(ibanFilter) : "Alle rekeningen"}
          action={
            <div className="flex glass p-1">
              <button
                type="button"
                onClick={() => setChartView("saldo")}
                className={cn(
                  "h-9 rounded-md px-3 text-sm font-semibold transition-colors",
                  chartView === "saldo" ? "bg-amber-500/15 text-amber-200" : "text-slate-400 hover:text-slate-200"
                )}
              >
                Saldo
              </button>
              <button
                type="button"
                onClick={() => setChartView("inuit")}
                className={cn(
                  "h-9 rounded-md px-3 text-sm font-semibold transition-colors",
                  chartView === "inuit" ? "bg-amber-500/15 text-amber-200" : "text-slate-400 hover:text-slate-200"
                )}
              >
                In/uit
              </button>
            </div>
          }
        />

        <div
          className="mt-5 h-[320px] min-h-[320px]"
          role="img"
          aria-label={
            chartView === "saldo"
              ? `Lijndiagram: saldoverloop per maand, ${stats.saldoPerMaand.length} maanden`
              : `Staafdiagram: inkomsten (groen) en uitgaven (oranje) per maand, ${inUitMetSalaris.length} maanden`
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            {chartView === "saldo" ? (
              <AreaChart data={stats.saldoPerMaand} margin={{ top: 10, right: 14, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="financeSaldoGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="maand" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={formatMonth} />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => privacyOn ? "••••" : yAxisEuro(Number(value))}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.14)" />
                <Tooltip content={<ChartTooltip valueFormatter={formatPrivateEuro} />} />
                <Area
                  type="monotone"
                  dataKey="saldo"
                  name="Saldo"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fill="url(#financeSaldoGradient)"
                  dot={false}
                  activeDot={{ r: 5, fill: "#f59e0b", strokeWidth: 0 }}
                />
              </AreaChart>
            ) : (
              <BarChart data={inUitMetSalaris} margin={{ top: 10, right: 14, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="maand" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={formatMonth} />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => privacyOn ? "••••" : yAxisEuro(Number(value))}
                />
                <Tooltip content={<ChartTooltip valueFormatter={formatPrivateEuro} />} />
                {/* C1: geen decoratieve recharts-Legend — tooltip, gekleurde
                    series en het aria-label dekken de betekenis al; de enige
                    legend-conventie die overblijft is de interactieve pie. */}
                <Bar dataKey="inkomsten" name="Inkomsten" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} opacity={0.86} />
                <Bar dataKey="uitgaven" name="Uitgaven" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} opacity={0.86} />
                {loonstrokenCount > 0 && (
                  <Bar dataKey="salaris" name="Netto salaris" fill="#818cf8" radius={[4, 4, 0, 0]} opacity={0.76} />
                )}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass p-4">
        <SectionTitle
          icon={PieChartIcon}
          title="Verdeling"
          subtitle={
            listOnlyFilterActive
              ? `${stats.aantalCategorieen} categorieën · hele periode (lijst-filters gelden hier niet)`
              : `${stats.aantalCategorieen} categorieën`
          }
        />
        <div
          className="mt-4 h-[238px] min-h-[238px]"
          role="img"
          aria-label={`Cirkeldiagram: uitgavenverdeling over ${stats.aantalCategorieen} categorieën, totaal ${formatPrivateEuro(stats.totaalUit)}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={94}
                paddingAngle={2}
                dataKey="bedrag"
                nameKey="categorie"
                strokeWidth={0}
              >
                {pieData.map((entry) => (
                  <Cell
                    key={entry.categorie}
                    fill={entry.isRest ? PIE_REST_COLOR : getCatColor(entry.categorie)}
                    opacity={0.86}
                  />
                ))}
                <Label
                  position="center"
                  content={() => (
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
                      <tspan x="50%" dy="-7" fill="#f8fafc" fontSize="0.92rem" fontWeight="700">
                        {formatPrivateEuro(stats.totaalUit)}
                      </tspan>
                      <tspan x="50%" dy="16" fill="#64748b" fontSize="0.62rem">
                        totaal uitgaven (periode)
                      </tspan>
                    </text>
                  )}
                />
              </Pie>
              <Tooltip content={<PieTooltip valueFormatter={formatPrivateEuroExact} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 space-y-1">
          {/* Legenda toont exact dezelfde slices als de pie, inclusief de
              geaggregeerde rest-slice (die is niet klikbaar: het is geen
              echte categorie om op te filteren). */}
          {pieData.map((entry) =>
            entry.isRest ? (
              <div
                key={entry.categorie}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left"
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PIE_REST_COLOR }} />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-400">{entry.categorie}</span>
                <span className="text-xs font-semibold text-slate-500">{entry.percentage}%</span>
              </div>
            ) : (
              <button
                key={entry.categorie}
                type="button"
                onClick={() => toggleCategoryFilter(entry.categorie)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors",
                  filters.categorieFilter === entry.categorie ? "bg-amber-500/10" : "hover:bg-[rgba(255,255,255,0.04)]"
                )}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: getCatColor(entry.categorie) }} />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-300">{entry.categorie}</span>
                <span className="text-xs font-semibold text-slate-500">{entry.percentage}%</span>
              </button>
            )
          )}
        </div>
      </div>
    </section>
  );
}
