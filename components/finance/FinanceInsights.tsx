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
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { Surface } from "@/components/ui/Surface";
import { InsightRow, SectionTitle } from "./FinanceCards";
import { CategoryCard } from "./CategoryCard";
import { getDeltaTone } from "./FinanceUtils";
import type { TransactionFilter, TransactionFullStats, TransactionRow } from "@/hooks/useTransactions";

// ─── F3: lichte client-side recurring-detectie ────────────────────────────────
// Zelfde tegenpartij in ≥3 verschillende maanden met een maandbedrag dat
// minder dan 5% varieert = terugkerende uitgave. Berekend over een bredere,
// periode-scoped steekproef (fetchRecurringSample) i.p.v. de eerste 50 geladen
// lijstrijen — die dekten hooguit een paar weken, waardoor de detectie in de
// praktijk nooit ≥3 maanden zag en dus altijd leeg bleef.

type RecurringItem = { naam: string; gemiddeld: number; maanden: number };

type MonthlyCashflow = TransactionFullStats["inUitPerMaand"][number];
type CategoryStat = TransactionFullStats["uitPerCategorie"][number];
type MerchantStat = TransactionFullStats["topMerchants"][number];
type RecurringSampleState = {
  periodKey: string | undefined;
  rows: TransactionRow[] | null;
};

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
  stats: TransactionFullStats;
  latestCashflow: MonthlyCashflow | null;
  /** "YYYY-MM" van de lopende (onvolledige) maand — label de laatste-maand-kaart. */
  runningMonthKey?: string;
  topCategory: CategoryStat | null;
  topMerchant: MerchantStat | null;
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
  const [sampleState, setSampleState] = useState<RecurringSampleState | null>(null);
  const sample = sampleState && sampleState.periodKey === periodKey ? sampleState.rows : null;
  useEffect(() => {
    if (!fetchRecurringSample) return;
    let cancelled = false;
    fetchRecurringSample()
      .then((rows) => {
        if (!cancelled) setSampleState({ periodKey, rows });
      })
      .catch(() => {
        if (!cancelled) setSampleState({ periodKey, rows: null });
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
        <Surface padding="md">
          <SectionTitle
            icon={ShoppingBag}
            title="Uitgaven per categorie"
            subtitle={stats.aantalCategorieen + " categorieën - " + formatPrivateEuro(stats.totaalUit) + " totaal"}
          />
          <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-3">
            {stats.uitPerCategorie.map((cat) => (
              <CategoryCard
                key={cat.categorie}
                categorie={cat.categorie}
                bedrag={cat.bedrag}
                amountLabel={formatPrivateEuro(cat.bedrag)}
                count={cat.count}
                percentage={cat.percentage ?? 0}
                onClick={() => toggleCategoryFilter(cat.categorie)}
                isActive={filters.categorieFilter === cat.categorie}
              />
            ))}
          </div>
        </Surface>

        <Surface padding="md">
          <SectionTitle icon={Receipt} title="Top uitgaven" subtitle="Per tegenpartij" />
          <div className="mt-4">
            {stats.topMerchants?.length ? (
              <div className="space-y-1">
                {stats.topMerchants.map((merchant, index) => {
                  const isActive = zoekterm === merchant.naam;
                  return (
                  <Button
                    key={merchant.naam}
                    type="button"
                    variant={isActive ? "primary" : "ghost"}
                    fullWidth
                    onClick={() => setZoekterm(merchant.naam)}
                    aria-pressed={isActive}
                    className="grid h-auto min-h-11 grid-cols-[2rem_minmax(0,1fr)_auto] items-center justify-normal gap-3 px-2 py-2 text-left"
                  >
                    <Badge tone="accent" className="h-7 w-7 justify-center px-0">
                      {index + 1}
                    </Badge>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[var(--color-text)]">{merchant.naam}</span>
                      <span className="mt-0.5 block text-xs text-[var(--color-text-subtle)]">{merchant.count} transacties</span>
                    </span>
                    <span className="text-sm font-bold tabular-nums text-[var(--color-text)]">{formatPrivateEuroExact(merchant.bedrag)}</span>
                  </Button>
                  );
                })}
              </div>
            ) : (
              <FeedbackState
                compact
                title="Geen topuitgaven"
                description="Er zijn geen topuitgaven in deze periode."
              />
            )}
          </div>
        </Surface>
      </section>

      <Surface padding="md">
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
                  <Button
                    key={item.naam}
                    type="button"
                    variant={isActive ? "primary" : "ghost"}
                    fullWidth
                    onClick={() => setZoekterm(item.naam)}
                    aria-pressed={isActive}
                    className="grid h-auto min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center justify-normal gap-3 px-2 py-2 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[var(--color-text)]">
                        Terugkerend: {item.naam}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--color-text-subtle)]">
                        {item.maanden} maanden · vrijwel gelijk bedrag
                      </span>
                    </span>
                    <span className="text-sm font-bold tabular-nums text-[var(--color-text)]">
                      ~{formatPrivateEuroExact(item.gemiddeld)}/maand
                    </span>
                  </Button>
                );
              })}
            </div>
          ) : (
            <FeedbackState
              compact
              title="Geen terugkerende uitgaven herkend"
              description={"Geen patroon gevonden met dezelfde tegenpartij in minstens " + RECURRING_MIN_MONTHS + " maanden en een vrijwel gelijk bedrag."}
            />
          )}
        </div>
      </Surface>

      <Surface padding="md">
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
            tone={latestCashflow ? getDeltaTone(latestCashflow.netto) : "neutral"}
          />
          <InsightRow
            icon={ShoppingBag}
            label="Grootste categorie"
            value={topCategory ? `${topCategory.categorie} (${topCategory.percentage}%)` : "Geen data"}
            tone="info"
          />
          <InsightRow
            icon={Receipt}
            label="Grootste tegenpartij"
            value={topMerchant ? `${topMerchant.naam} · ${formatPrivateEuroExact(topMerchant.bedrag)}` : "Geen data"}
            tone="accent"
          />
          <InsightRow
            icon={ShieldCheck}
            label="Interne boekingen"
            value={filters.excludeIntern === false ? "Zichtbaar" : "Verborgen"}
            tone={filters.excludeIntern === false ? "info" : "success"}
          />
        </div>
      </Surface>
    </>
  );
}
