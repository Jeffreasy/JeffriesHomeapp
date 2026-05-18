"use client";

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useGetSalary } from "@/lib/api/generated/salary/salary";
import type { ModelSalary } from "@/lib/api/model";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SalarisRecord {
  _id:                string;
  periode:            string;
  jaar:               number;
  maand:              number;
  aantalDiensten:     number;
  uurloonORT:         number;
  basisLoon:          number;
  amtZeerintensief:   number;
  toeslagBalansvif:   number;
  ortTotaal:          number;
  extraUrenBedrag:    number;
  toeslagVakatieUren: number;
  reiskosten:         number;
  eenmaligTotaal:     number;
  brutoBetaling:      number;
  pensioenpremie:    number;
  loonheffingSchat:  number;
  nettoPrognose:     number;
  ortDetail?:      string;
  eenmaligDetail?: string;
  berekendOp:      string;
}

function fromRow(r: ModelSalary): SalarisRecord {
  return {
    _id:                r.id ?? "",
    periode:            r.periode ?? "",
    jaar:               r.jaar ?? 0,
    maand:              r.maand ?? 0,
    aantalDiensten:     r.aantal_diensten ?? 0,
    uurloonORT:         r.uurloon_ort ?? 0,
    basisLoon:          r.basis_loon ?? 0,
    amtZeerintensief:   r.amt_zeerintensief ?? 0,
    toeslagBalansvif:   r.toeslag_balansvlf ?? 0,
    ortTotaal:          r.ort_totaal ?? 0,
    extraUrenBedrag:    r.extra_uren_bedrag ?? 0,
    toeslagVakatieUren: r.toeslag_vakatie_uren ?? 0,
    reiskosten:         r.reiskosten ?? 0,
    eenmaligTotaal:     r.eenmalig_totaal ?? 0,
    brutoBetaling:      r.bruto_betaling ?? 0,
    pensioenpremie:     r.pensioenpremie ?? 0,
    loonheffingSchat:   r.loonheffing_schat ?? 0,
    nettoPrognose:      r.netto_prognose ?? 0,
    berekendOp:         r.berekend_op ?? "",
  };
}

// ─── useSalary (Go API) ──────────────────────────────────────────────────────

export function useSalary() {
  const { user } = useUser();
  const userId = user?.id ?? "";

  const { data: salaryRaw, isLoading } = useGetSalary({ userId }, { query: { enabled: !!userId } });

  const raw = useMemo(() => {
    return Array.isArray(salaryRaw?.data) ? salaryRaw.data : undefined;
  }, [salaryRaw]);

  const records: SalarisRecord[] = useMemo(() => {
    if (!raw) return [];
    return raw.map(fromRow);
  }, [raw]);

  const nu = new Date();
  const huidigKey = `${nu.getFullYear()}-${String(nu.getMonth() + 1).padStart(2, "0")}`;
  const huidig = records.find((r) => r.periode === huidigKey) ?? null;

  const perJaar: Record<number, SalarisRecord[]> = {};
  for (const r of records) {
    if (!perJaar[r.jaar]) perJaar[r.jaar] = [];
    perJaar[r.jaar].push(r);
  }

  const totaalBruto = records.reduce((s, r) => s + r.brutoBetaling, 0);
  const totaalNetto = records.reduce((s, r) => s + r.nettoPrognose, 0);

  return {
    records,
    huidig,
    perJaar,
    totaalBruto,
    totaalNetto,
    isLoading,
    berekendOp: records[0]?.berekendOp ?? null,
    isNative: true,
  };
}
