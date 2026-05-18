import type { SalarisRecord } from "@/hooks/useSalary";
import type { LoonstrookRecord } from "@/hooks/useLoonstroken";
import type { SalarisDisplayRecord } from "./SalaryTypes";

export const MAANDEN = ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

export const fmt = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);

export function eenmaligUitLoonstrook(w: LoonstrookRecord) {
  return [
    w.vakantietoeslag ? { label: "Vakantietoeslag", bedrag: w.vakantietoeslag } : null,
    w.ejuBedrag ? { label: "Eindejaarsuitkering", bedrag: w.ejuBedrag } : null,
  ].filter(Boolean) as { label: string; bedrag: number }[];
}

export function displayRecordVanLoonstrook(w: LoonstrookRecord, basis?: SalarisRecord): SalarisDisplayRecord {
  const eenmalig = eenmaligUitLoonstrook(w);
  return {
    _id:                basis?._id ?? w._id,
    periode:            w.periodeLabel,
    jaar:               w.jaar,
    maand:              w.periode,
    aantalDiensten:     basis?.aantalDiensten ?? 0,
    uurloonORT:         w.uurloon ?? basis?.uurloonORT ?? 0,

    basisLoon:          w.salarisBasis,
    amtZeerintensief:   w.amtZeerintensief ?? basis?.amtZeerintensief ?? 0,
    toeslagBalansvif:   w.toeslagBalansvlf ?? basis?.toeslagBalansvif ?? 0,
    ortTotaal:          w.ortTotaal,
    extraUrenBedrag:    w.extraUrenBedrag ?? basis?.extraUrenBedrag ?? 0,
    toeslagVakatieUren: basis?.toeslagVakatieUren ?? 0,
    reiskosten:         w.reiskosten ?? basis?.reiskosten ?? 0,
    eenmaligTotaal:     eenmalig.reduce((sum, item) => sum + item.bedrag, 0),
    brutoBetaling:      w.brutoBetaling,

    pensioenpremie:    w.pensioenpremie ?? basis?.pensioenpremie ?? 0,
    loonheffingSchat:  w.loonheffing ?? basis?.loonheffingSchat ?? 0,
    nettoPrognose:     w.netto,

    ortDetail:      w.ortDetail,
    eenmaligDetail: eenmalig.length ? JSON.stringify(eenmalig) : basis?.eenmaligDetail,
    berekendOp:     w.geimporteerdOp,
    bron:           "werkelijk",
    werkelijk:      w,
  };
}

export function displayRecord(r: SalarisRecord, werkelijkByPeriode: Map<string, LoonstrookRecord>): SalarisDisplayRecord {
  const w = werkelijkByPeriode.get(r.periode);
  return w ? displayRecordVanLoonstrook(w, r) : { ...r, bron: "prognose" };
}
