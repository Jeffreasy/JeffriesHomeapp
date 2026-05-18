"use client";

import {
  ArrowLeftRight,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { InsightRow, SectionTitle } from "./FinanceCards";
import { CategoryCard } from "./CategoryCard";
import { getDeltaTone } from "./FinanceUtils";
import type { TransactionFilter } from "@/hooks/useTransactions";

export function FinanceInsights({
  stats,
  latestCashflow,
  topCategory,
  topMerchant,
  filters,
  setZoekterm,
  toggleCategoryFilter,
  formatPrivateEuro,
  formatPrivateEuroExact,
  formatPrivateSignedEuro,
}: {
  stats: any;
  latestCashflow: any;
  topCategory: any;
  topMerchant: any;
  filters: TransactionFilter;
  setZoekterm: (term: string) => void;
  toggleCategoryFilter: (cat: string) => void;
  formatPrivateEuro: (value: number) => string;
  formatPrivateEuroExact: (value: number) => string;
  formatPrivateSignedEuro: (value: number) => string;
}) {
  return (
    <>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="glass p-4">
          <SectionTitle
            icon={ShoppingBag}
            title="Uitgaven per categorie"
            subtitle={`${stats.aantalCategorieen} categorieen - ${formatPrivateEuro(stats.totaalUit)} totaal`}
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
                {stats.topMerchants.map((merchant: any, index: any) => (
                  <button
                    key={merchant.naam}
                    type="button"
                    onClick={() => setZoekterm(merchant.naam)}
                    className="grid w-full grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[rgba(255,255,255,0.04)]"
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
                ))}
              </div>
            ) : (
              <div className="glass p-4 text-sm text-slate-500">
                Geen topuitgaven in deze selectie.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="glass p-4">
        <SectionTitle icon={Wallet} title="Financiele signalen" subtitle="Korte checks op je huidige selectie" />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InsightRow
            icon={ArrowLeftRight}
            label="Laatste maand"
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
            value={topMerchant ? formatPrivateEuroExact(topMerchant.bedrag) : "Geen data"}
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
