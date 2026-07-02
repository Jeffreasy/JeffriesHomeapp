"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Receipt,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { InsightRow, SectionTitle } from "./FinanceCards";
import { CategoryCard } from "./CategoryCard";
import { getDeltaTone } from "./FinanceUtils";
import type { TransactionFilter, TransactionRow } from "@/hooks/useTransactions";

// ─── F3: lichte client-side recurring-detectie ────────────────────────────────
// Zelfde tegenpartij in ≥3 verschillende maanden met een maandbedrag dat
// minder dan 5% varieert = terugkerende uitgave. Berekend over een bredere,
// periode-scoped steekproef (fetchRecurringSample) i.p.v. de eerste 50 geladen
// lijstrijen — die dekten hooguit een paar weken, waardoor de detectie in de
// praktijk nooit ≥3 maanden zag en dus altijd leeg bleef.

type RecurringItem = { naam: string; gemiddeld: number; maanden: number };

const RECURRING_MIN_MONTHS = 3;
const RECURRING_MAX_VARIANCE = 0.05;
const RECURRING_MAX_ROWS = 6;

function detectRecurring(transactions: TransactionRow[]): RecurringItem[] {
  const perMerchant = new Map<string, Map<string, number>>();

  for (const tx of transactions) {
    if (tx.bedrag >= 0) continue;
    if (tx.isInterneOverboeking || tx.is_interne_overboeking) continue;
    const naam = tx.tegenpartijNaam || tx.tegenpartij_naam;
    const maand = tx.datum?.slice(0, 7);
    if (!naam || !maand) continue;
    const months = perMerchant.get(naam) ?? new Map<string, number>();
    months.set(maand, (months.get(maand) ?? 0) + Math.abs(tx.bedrag));
    perMerchant.set(naam, months);
  }

  const items: RecurringItem[] = [];
  for (const [naam, months] of perMerchant) {
    if (months.size < RECURRING_MIN_MONTHS) continue;
    const totals = Array.from(months.values());
    const mean = totals.reduce((s, v) => s + v, 0) / totals.length;
    if (mean <= 0) continue;
    const max = Math.max(...totals);
    const min = Math.min(...totals);
    if ((max - min) / mean > RECURRING_MAX_VARIANCE) continue;
    items.push({ naam, gemiddeld: mean, maanden: months.size });
  }

  return items
    .sort((a, b) => b.gemiddeld - a.gemiddeld)
    .slice(0, RECURRING_MAX_ROWS);
}

export function FinanceInsights({
  stats,
  latestCashflow,
  runningMonthKey,
  topCategory,
  topMerchant,
  transactions = [],
  fetchRecurringSample,
  periodKey,
  filters,
  zoekterm,
  setZoekterm,
  toggleCategoryFilter,
  formatPrivateEuro,
  formatPrivateEuroExact,
  formatPrivateSignedEuro,
}: {
  stats: any;
  latestCashflow: any;
  /** "YYYY-MM" van de lopende (onvolledige) maand — label de laatste-maand-kaart. */
  runningMonthKey?: string;
  topCategory: any;
  topMerchant: any;
  /** Geladen transactielijst — fallback-bron voor de recurring-detectie (F3). */
  transactions?: TransactionRow[];
  /** F3: haalt een bredere periode-scoped steekproef op voor recurring-detectie. */
  fetchRecurringSample?: () => Promise<TransactionRow[]>;
  /** Verandert wanneer de periode-selectie wijzigt → herlaad de steekproef. */
  periodKey?: string;
  filters: TransactionFilter;
  zoekterm: string;
  setZoekterm: (term: string) => void;
  toggleCategoryFilter: (cat: string) => void;
  formatPrivateEuro: (value: number) => string;
  formatPrivateEuroExact: (value: number) => string;
  formatPrivateSignedEuro: (value: number) => string;
}) {
  // F3: laad een bredere periode-scoped steekproef zodra de sectie mount (en
  // opnieuw als de periode wijzigt). Zolang die er nog niet is, valt de
  // detectie terug op de al geladen lijstrijen.
  const [sample, setSample] = useState<TransactionRow[] | null>(null);
  useEffect(() => {
    if (!fetchRecurringSample) return;
    let cancelled = false;
    setSample(null);
    fetchRecurringSample()
      .then((rows) => {
        if (!cancelled) setSample(rows);
      })
      .catch(() => {
        if (!cancelled) setSample(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchRecurringSample, periodKey]);

  const recurring = useMemo(
    () => detectRecurring(sample ?? transactions),
    [sample, transactions]
  );

  return (
    <>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="glass p-4">
          <SectionTitle
            icon={ShoppingBag}
            title="Uitgaven per categorie"
            subtitle={`${stats.aantalCategorieen} categorieën - ${formatPrivateEuro(stats.totaalUit)} totaal`}
          />
          <div className="category-grid mt-5">
            {stats.uitPerCategorie.map((cat: any) => (
              <CategoryCard
                key={cat.categorie}
                categorie={cat.categorie}
                bedrag={cat.bedrag}
                amountLabel={formatPrivateEuro(cat.bedrag)}
                count={cat.count}
                percentage={cat.percentage}
                onClick={() => toggleCategoryFilter(cat.categorie)}
                isActive={filters.categorieFilter === cat.categorie}
              />
            ))}
          </div>
        </div>

        <div className="glass p-4">
          <SectionTitle icon={Receipt} title="Top uitgaven" subtitle="Per tegenpartij" />
          <div className="mt-4">
            {stats.topMerchants?.length ? (
              <div className="space-y-1">
                {stats.topMerchants.map((merchant: any, index: any) => {
                  const isActive = zoekterm === merchant.naam;
                  return (
                  <button
                    key={merchant.naam}
                    type="button"
                    onClick={() => setZoekterm(merchant.naam)}
                    aria-pressed={isActive}
                    className={`grid w-full grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
                      isActive
                        ? "bg-amber-500/10 ring-1 ring-amber-500/30"
                        : "hover:bg-[rgba(255,255,255,0.04)]"
                    }`}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-xs font-bold text-amber-200">
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-200">{merchant.naam}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{merchant.count} transacties</span>
                    </span>
                    <span className="text-sm font-bold text-slate-100">{formatPrivateEuroExact(merchant.bedrag)}</span>
                  </button>
                  );
                })}
              </div>
            ) : (
              <div className="glass p-4 text-sm text-slate-500">
                Geen topuitgaven in deze periode.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="glass p-4">
        <SectionTitle
          icon={RefreshCw}
          title="Terugkerende uitgaven"
          subtitle={sample ? "op basis van de geselecteerde periode" : "op basis van geladen transacties"}
        />
        <div className="mt-4">
          {recurring.length > 0 ? (
            <div className="space-y-1">
              {recurring.map((item) => {
                const isActive = zoekterm === item.naam;
                return (
                  <button
                    key={item.naam}
                    type="button"
                    onClick={() => setZoekterm(item.naam)}
                    aria-pressed={isActive}
                    className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
                      isActive
                        ? "bg-amber-500/10 ring-1 ring-amber-500/30"
                        : "hover:bg-[rgba(255,255,255,0.04)]"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-200">
                        Terugkerend: {item.naam}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {item.maanden} maanden · vrijwel gelijk bedrag
                      </span>
                    </span>
                    <span className="text-sm font-bold text-slate-100">
                      ~{formatPrivateEuroExact(item.gemiddeld)}/maand
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="glass p-4 text-sm text-slate-500">
              Geen terugkerende uitgaven herkend in de geladen transacties
              (zelfde tegenpartij in minstens {RECURRING_MIN_MONTHS} maanden met een vrijwel gelijk bedrag).
            </div>
          )}
        </div>
      </section>

      <section className="glass p-4">
        <SectionTitle icon={Wallet} title="Financiële signalen" subtitle="Korte checks op de geselecteerde periode" />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InsightRow
            icon={ArrowLeftRight}
            // F8: de laatste maand is doorgaans de lopende (onvolledige) maand —
            // label dat expliciet zodat een lage netto niet als daling leest.
            label={
              latestCashflow && runningMonthKey && latestCashflow.maand === runningMonthKey
                ? "Lopende maand (onvolledig)"
                : "Laatste maand"
            }
            value={latestCashflow ? `${formatPrivateSignedEuro(latestCashflow.netto)}` : "Geen data"}
            tone={latestCashflow ? getDeltaTone(latestCashflow.netto) : "slate"}
          />
          <InsightRow
            icon={ShoppingBag}
            label="Grootste categorie"
            value={topCategory ? `${topCategory.categorie} (${topCategory.percentage}%)` : "Geen data"}
            tone="indigo"
          />
          <InsightRow
            icon={Receipt}
            label="Grootste tegenpartij"
            value={topMerchant ? `${topMerchant.naam} · ${formatPrivateEuroExact(topMerchant.bedrag)}` : "Geen data"}
            tone="amber"
          />
          <InsightRow
            icon={ShieldCheck}
            label="Interne boekingen"
            value={filters.excludeIntern === false ? "Zichtbaar" : "Verborgen"}
            tone={filters.excludeIntern === false ? "sky" : "green"}
          />
        </div>
      </section>
    </>
  );
}
