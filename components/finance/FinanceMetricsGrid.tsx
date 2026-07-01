import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  Hash,
  Landmark,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { MetricCard } from "./FinanceCards";
import { formatPercent, formatMonth, formatShortDate } from "./FinanceUtils";
import type { TransactionFilter } from "@/hooks/useTransactions";

export function FinanceMetricsGrid({
  stats,
  saldoTrend,
  momDelta,
  savingsRate,
  salarisStat,
  topCategory,
  selectedFilterCount,
  filters,
  zoekterm,
  formatPrivateEuro,
  formatPrivateSignedEuro,
}: {
  stats: any;
  saldoTrend: number | null;
  momDelta: { inkomstenDelta: number; uitgavenDelta: number } | null;
  savingsRate: number | null;
  salarisStat: { latest: any; delta: number; gemNetto: number } | null;
  topCategory: any;
  selectedFilterCount: number;
  filters: TransactionFilter;
  zoekterm: string;
  formatPrivateEuro: (value: number) => string;
  formatPrivateSignedEuro: (value: number) => string;
}) {
  if (!stats) return null;

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Saldo"
        value={formatPrivateEuro(stats.huidigSaldo)}
        meta={stats.laatsteSaldoPeildatum
          ? `Laatste import t/m ${formatShortDate(stats.laatsteSaldoPeildatum)}`
          : saldoTrend === null ? "Laatste geïmporteerde bankbalans" : `${formatPrivateSignedEuro(saldoTrend)} sinds eerste maand`}
        icon={Landmark}
        tone={stats.huidigSaldo >= 0 ? "amber" : "rose"}
      />
      <MetricCard
        label="Inkomsten"
        value={formatPrivateEuro(stats.totaalIn)}
        meta={momDelta ? `${formatPercent(momDelta.inkomstenDelta)} versus vorige maand` : `${formatPrivateEuro(stats.gemiddeldIn)} gemiddeld per maand`}
        icon={TrendingUp}
        tone="green"
      />
      <MetricCard
        label="Uitgaven"
        value={formatPrivateEuro(stats.totaalUit)}
        meta={momDelta ? `${formatPercent(momDelta.uitgavenDelta)} versus vorige maand` : `${formatPrivateEuro(stats.gemiddeldUit)} gemiddeld per maand`}
        icon={TrendingDown}
        tone={momDelta && momDelta.uitgavenDelta > 10 ? "rose" : "sky"}
      />
      <MetricCard
        label="Netto stroom"
        value={formatPrivateSignedEuro(stats.nettoStroom)}
        meta={savingsRate === null ? "Kasstroom minus uitgaven" : `${formatPercent(savingsRate)} van inkomsten`}
        icon={stats.nettoStroom >= 0 ? ArrowUpRight : ArrowDownRight}
        tone={stats.nettoStroom >= 0 ? "green" : "rose"}
      />
      <MetricCard
        label="Categorieën"
        value={`${stats.aantalCategorieen}`}
        meta={topCategory ? `${topCategory.categorie} is grootste uitgavenpost` : "Nog geen categorieën"}
        icon={Hash}
        tone="indigo"
      />
      <MetricCard
        label="Storneringen"
        value={`${stats.storneringen}`}
        meta={stats.storneringen > 0 ? "Controleer mislukte incasso's" : "Geen storneringen actief"}
        icon={AlertTriangle}
        tone={stats.storneringen > 0 ? "rose" : "green"}
      />
      {salarisStat && (
        <MetricCard
          label="Netto salaris"
          value={formatPrivateEuro(salarisStat.latest.netto)}
          // De loonstrookperiode hoort in de meta: zonder die context is een
          // verouderde (stale) loonstrook onzichtbaar.
          meta={`${salarisStat.latest.periodeLabel ? `${formatMonth(salarisStat.latest.periodeLabel)} · ` : ""}${
            salarisStat.delta !== 0
              ? `${formatPrivateSignedEuro(salarisStat.delta)} versus vorige loonstrook`
              : `${formatPrivateEuro(salarisStat.gemNetto)} gemiddeld`
          }`}
          icon={Wallet}
          tone="amber"
        />
      )}
      <MetricCard
        label="Filters"
        value={`${selectedFilterCount}`}
        meta={filters.maandFilter ? `Maand ${formatMonth(filters.maandFilter)} actief` : zoekterm ? `Zoeken op "${zoekterm}"` : "Standaard transactieweergave"}
        icon={Filter}
        tone={selectedFilterCount > 0 || zoekterm ? "sky" : "slate"}
      />
    </section>
  );
}
