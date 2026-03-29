"use client";

import { useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";

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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLoonstroken() {
  const { user } = useUser();
  const userId = user?.id ?? "";

  const raw = useQuery(
    api.loonstroken.list,
    userId ? { userId } : "skip"
  ) as LoonstrookRecord[] | undefined;

  const records = useMemo(
    () =>
      (raw ?? [])
        .filter((r) => r.type === "loonstrook")
        .sort((a, b) => a.jaar - b.jaar || a.periode - b.periode),
    [raw]
  );

  // Per-jaar groepering
  const perJaar = useMemo(() => {
    const map: Record<number, LoonstrookRecord[]> = {};
    for (const r of records) {
      (map[r.jaar] ??= []).push(r);
    }
    return map;
  }, [records]);

  // Lookup by periodeLabel ("2026-03")
  const byPeriode = useMemo(() => {
    const map = new Map<string, LoonstrookRecord>();
    for (const r of records) map.set(r.periodeLabel, r);
    return map;
  }, [records]);

  // Totalen
  const totaalNetto = records.reduce((s, r) => s + r.netto, 0);
  const totaalBruto = records.reduce((s, r) => s + r.brutoBetaling, 0);

  return {
    records,
    perJaar,
    byPeriode,
    totaalNetto,
    totaalBruto,
    isLoading: raw === undefined,
    count: records.length,
  };
}
