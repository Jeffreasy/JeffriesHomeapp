"use client";

import { BarChart3, PieChart as PieChartIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Legend,
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
import { cn } from "@/lib/utils";
import { getCatColor, ibanLabel } from "@/lib/finance-constants";
import type { TransactionFilter } from "@/hooks/useTransactions";

type ChartView = "saldo" | "inuit";

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
  stats: any;
  chartView: ChartView;
  setChartView: (v: ChartView) => void;
  ibanFilter?: string;
  privacyOn: boolean;
  inUitMetSalaris: any[];
  loonstrokenCount: number;
  filters: TransactionFilter;
  toggleCategoryFilter: (cat: string) => void;
  formatPrivateEuro: (value: number) => string;
  formatPrivateEuroExact: (value: number) => string;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-lg border border-[var(--color-border)] bg-white/[0.035] p-4">
        <SectionTitle
          icon={BarChart3}
          title={chartView === "saldo" ? "Saldo verloop" : "Inkomsten versus uitgaven"}
          subtitle={ibanFilter ? ibanLabel(ibanFilter) : "Alle rekeningen"}
          action={
            <div className="flex rounded-lg border border-[var(--color-border)] bg-white/[0.03] p-1">
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

        <div className="mt-5 h-[320px] min-h-[320px]">
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
                <XAxis dataKey="maand" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => privacyOn ? "••••" : `€${(Number(value) / 1000).toFixed(0)}k`}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.14)" />
                <Tooltip content={<ChartTooltip valueFormatter={formatPrivateEuro} />} />
                <Area
                  type="monotone"
                  dataKey="saldo"
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
                <XAxis dataKey="maand" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => privacyOn ? "••••" : `€${(Number(value) / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ChartTooltip valueFormatter={formatPrivateEuro} />} />
                <Legend wrapperStyle={{ fontSize: "0.75rem", color: "#64748b" }} />
                <Bar dataKey="inkomsten" name="Inkomsten" fill="#22c55e" radius={[4, 4, 0, 0]} opacity={0.86} />
                <Bar dataKey="uitgaven" name="Uitgaven" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.72} />
                {loonstrokenCount > 0 && (
                  <Bar dataKey="salaris" name="Netto salaris" fill="#818cf8" radius={[4, 4, 0, 0]} opacity={0.76} />
                )}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-white/[0.035] p-4">
        <SectionTitle
          icon={PieChartIcon}
          title="Verdeling"
          subtitle={`${stats.aantalCategorieen} categorieen`}
        />
        <div className="mt-4 h-[238px] min-h-[238px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats.uitPerCategorie.slice(0, 12)}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={94}
                paddingAngle={2}
                dataKey="bedrag"
                nameKey="categorie"
                strokeWidth={0}
              >
                {stats.uitPerCategorie.slice(0, 12).map((entry: any) => (
                  <Cell key={entry.categorie} fill={getCatColor(entry.categorie)} opacity={0.86} />
                ))}
                <Label
                  position="center"
                  content={() => (
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
                      <tspan x="50%" dy="-7" fill="#f8fafc" fontSize="0.92rem" fontWeight="700">
                        {formatPrivateEuro(stats.totaalUit)}
                      </tspan>
                      <tspan x="50%" dy="16" fill="#64748b" fontSize="0.62rem">
                        totaal uit
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
          {stats.uitPerCategorie.slice(0, 7).map((entry: any) => (
            <button
              key={entry.categorie}
              type="button"
              onClick={() => toggleCategoryFilter(entry.categorie)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors",
                filters.categorieFilter === entry.categorie ? "bg-amber-500/10" : "hover:bg-white/[0.04]"
              )}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: getCatColor(entry.categorie) }} />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-300">{entry.categorie}</span>
              <span className="text-xs font-semibold text-slate-500">{entry.percentage}%</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
