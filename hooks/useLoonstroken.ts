"use client";

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useGetLoonstroken } from "@/lib/api/generated/loonstroken/loonstroken";
import type { ModelLoonstrook } from "@/lib/api/model";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoonstrookRecord {
  _id:              string;
  jaar:             number;
  periode:          number;
  periodeLabel:     string;
  type:             string;
  netto:            number;
  brutoBetaling:    number;
  brutoInhouding:   number;
  salarisBasis:     number;
  ortTotaal:        number;
  ortDetail:        string;
  amtZeerintensief?: number;
  pensioenpremie?:  number;
  loonheffing?:     number;
  reiskosten?:      number;
  vakantietoeslag?: number;
  ejuBedrag?:       number;
  toeslagBalansvlf?: number;
  extraUrenBedrag?: number;
  schaalnummer:     string;
  trede:            string;
  parttimeFactor:   number;
  uurloon?:         number;
  componenten:      string;
  geimporteerdOp:   string;
}

function fromRow(r: ModelLoonstrook): LoonstrookRecord {
  return {
    _id:              r.id ?? "",
    jaar:             r.jaar ?? 0,
    periode:          r.periode ?? 0,
    periodeLabel:     r.periode_label ?? "",
    type:             r.type ?? "",
    netto:            r.netto ?? 0,
    brutoBetaling:    r.bruto_betaling ?? 0,
    brutoInhouding:   r.bruto_inhouding ?? 0,
    salarisBasis:     r.salaris_basis ?? 0,
    ortTotaal:        r.ort_totaal ?? 0,
    ortDetail:        r.ort_detail ? JSON.stringify(r.ort_detail) : "",
    amtZeerintensief: r.amt_zeerintensief,
    pensioenpremie:   r.pensioenpremie,
    loonheffing:      r.loonheffing,
    reiskosten:       r.reiskosten,
    vakantietoeslag:  r.vakantietoeslag,
    ejuBedrag:        r.eju_bedrag,
    toeslagBalansvlf: r.toeslag_balansvlf,
    extraUrenBedrag:  r.extra_uren_bedrag,
    schaalnummer:     r.schaalnummer ?? "",
    trede:            r.trede ?? "",
    parttimeFactor:   r.parttime_factor ?? 0,
    uurloon:          r.uurloon,
    componenten:      r.componenten ? JSON.stringify(r.componenten) : "",
    geimporteerdOp:   r.geimporteerd_op ?? "",
  };
}

// ─── Hook (Orval React Query) ───────────────────────────────────────────────────────────

export function useLoonstroken() {
  const { user } = useUser();
  const userId = user?.id ?? "";

  const { data: queryData, isLoading, isError, error, refetch } = useGetLoonstroken(
    { userId },
    { query: { enabled: !!userId } }
  );

  const raw = queryData?.data;

  const records = useMemo(() => {
    if (!raw || !Array.isArray(raw)) return [];
    return raw
      .map(fromRow)
      .filter((r) => r.type === "loonstrook")
      .sort((a, b) => a.jaar - b.jaar || a.periode - b.periode);
  }, [raw]);

  const perJaar = useMemo(() => {
    const map: Record<number, LoonstrookRecord[]> = {};
    for (const r of records) {
      if (!r.jaar) continue;
      (map[r.jaar] ??= []).push(r);
    }
    return map;
  }, [records]);

  const byPeriode = useMemo(() => {
    const map = new Map<string, LoonstrookRecord>();
    for (const r of records) {
      if (r.periodeLabel) map.set(r.periodeLabel, r);
    }
    return map;
  }, [records]);

  const totaalNetto = records.reduce((s, r) => s + r.netto, 0);
  const totaalBruto = records.reduce((s, r) => s + r.brutoBetaling, 0);

  return {
    records,
    perJaar,
    byPeriode,
    totaalNetto,
    totaalBruto,
    isLoading,
    // Failed ≠ empty: home/salaris consumers render an error branch instead of
    // an empty state when the loonstroken-load fails (R2 DEEL 2 #1).
    isError,
    error,
    refetch,
    count: records.length,
  };
}
