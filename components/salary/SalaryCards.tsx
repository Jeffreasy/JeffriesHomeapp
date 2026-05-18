"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { SalarisRecord } from "@/hooks/useSalary";
import type { LoonstrookRecord } from "@/hooks/useLoonstroken";
import { type SalarisDisplayRecord } from "./SalaryTypes";
import { fmt, MAANDEN } from "./SalaryUtils";

export function PrognoseCard({ record }: { record: SalarisDisplayRecord }) {
  const isWerkelijk = record.bron === "werkelijk";
  const eenmalig: { label: string; bedrag: number }[] = useMemo(() => {
    try { return record.eenmaligDetail ? JSON.parse(record.eenmaligDetail) : []; } catch { return []; }
  }, [record.eenmaligDetail]);

  const ort: Record<string, number> = useMemo(() => {
    try { return record.ortDetail ? JSON.parse(record.ortDetail) : {}; } catch { return {}; }
  }, [record.ortDetail]);

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-amber-400/70 uppercase tracking-wider">
            {isWerkelijk ? "Werkelijke loonstrook" : "Lopende maand prognose"}
          </p>
          <p className="text-lg font-bold text-amber-300">
            {MAANDEN[record.maand - 1]} {record.jaar}
          </p>
        </div>
        <span className="text-[10px] text-slate-600 bg-white/5 px-2 py-1 rounded-lg">
          uurloon ORT €{record.uurloonORT.toFixed(2)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/4 rounded-xl p-3 border border-white/5">
          <p className="text-[10px] text-slate-500 mb-1">▶ Bruto</p>
          <p className="text-xl font-bold text-white">{fmt(record.brutoBetaling)}</p>
        </div>
        <div className="bg-emerald-500/8 rounded-xl p-3 border border-emerald-500/20">
          <p className="text-[10px] text-emerald-400/70 mb-1">{isWerkelijk ? "Netto werkelijk" : "≈ Netto prognose"}</p>
          <p className="text-xl font-bold text-emerald-300">{fmt(record.nettoPrognose)}</p>
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        <BreakdownRow label="Basisalaris (44,44%)" bedrag={record.basisLoon} />
        <BreakdownRow label="Amt Zeerintensief (5%)" bedrag={record.amtZeerintensief} />
        <BreakdownRow label="ORT toeslagen" bedrag={record.ortTotaal} />
        {record.extraUrenBedrag > 0 && <BreakdownRow label="Extra uren" bedrag={record.extraUrenBedrag} />}
        <BreakdownRow label="Reiskosten" bedrag={record.reiskosten} />
        {record.eenmaligTotaal > 0 && (
          <BreakdownRow label={eenmalig.map((e) => e.label).join(" + ") || "Eenmalig"} bedrag={record.eenmaligTotaal} accent />
        )}
        <div className="border-t border-white/5 pt-1.5 mt-1.5" />
        <BreakdownRow label="Pensioen PFZW (12,95%)" bedrag={-record.pensioenpremie} negatief />
        <BreakdownRow label={isWerkelijk ? "Loonheffing" : "≈ Loonheffing (schatting)"} bedrag={-record.loonheffingSchat} negatief />
      </div>

      {Object.keys(ort).length > 0 && (
        <div className="bg-white/2 rounded-lg p-3 border border-white/5 space-y-1">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">ORT detail</p>
          {Object.entries(ort).map(([k, v]) => (
            <div key={k} className="flex justify-between text-[11px]">
              <span className="text-slate-500">{k}</span>
              <span className="text-slate-400">{fmt(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BreakdownRow({ label, bedrag, negatief, accent }: {
  label: string; bedrag: number; negatief?: boolean; accent?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={cn("text-slate-500", accent && "text-amber-400/80")}>{label}</span>
      <span className={cn(
        "font-medium tabular-nums",
        negatief ? "text-red-400" : accent ? "text-amber-300" : "text-slate-300"
      )}>
        {bedrag < 0 ? `-${fmt(-bedrag)}` : fmt(bedrag)}
      </span>
    </div>
  );
}

export function MaandBalk({ record, maxNetto }: { record: SalarisDisplayRecord; maxNetto: number }) {
  const pct    = maxNetto > 0 ? (record.nettoPrognose / maxNetto) * 100 : 0;
  const isEenm = record.eenmaligTotaal > 0;
  const isWerkelijk = record.bron === "werkelijk";

  return (
    <div className="flex items-end gap-1.5 group cursor-default" title={`${MAANDEN[record.maand - 1]}: ${fmt(record.nettoPrognose)} (${isWerkelijk ? "werkelijk" : "prognose"})`}>
      <div className="flex flex-col items-center gap-0.5 w-full">
        {isEenm && (
          <span className="text-[8px] text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">★</span>
        )}
        <div
          className={cn(
            "w-full rounded-t transition-all duration-300",
            isWerkelijk ? "bg-emerald-400/60" : isEenm ? "bg-amber-400/60" : "bg-blue-500/40 group-hover:bg-blue-500/60"
          )}
          style={{ height: `${Math.max(pct, 4)}%`, minHeight: "4px" }}
        />
        <span className="text-[9px] text-slate-600 group-hover:text-slate-400 transition-colors">
          {MAANDEN[record.maand - 1].slice(0, 1)}
        </span>
      </div>
    </div>
  );
}

export function JaarSectie({ jaar, records }: { jaar: number; records: SalarisDisplayRecord[] }) {
  const sorted   = [...records].sort((a, b) => a.maand - b.maand);
  const maxNetto = Math.max(...sorted.map((r) => r.nettoPrognose));
  const totBruto = sorted.reduce((s, r) => s + r.brutoBetaling, 0);
  const totNetto = sorted.reduce((s, r) => s + r.nettoPrognose, 0);
  const werkelijkAantal = sorted.filter((r) => r.bron === "werkelijk").length;

  return (
    <div className="glass rounded-2xl border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/2">
        <span className="text-sm font-bold text-slate-200">📅 {jaar}</span>
        <div className="flex items-center gap-4 text-xs">
          {werkelijkAantal > 0 && <span className="text-emerald-400">{werkelijkAantal} werkelijk</span>}
          <span className="text-slate-500">Bruto <span className="text-slate-300 font-medium">{fmt(totBruto)}</span></span>
          <span className="text-slate-500">Netto <span className="text-emerald-400 font-bold">{fmt(totNetto)}</span></span>
        </div>
      </div>

      <div
        className="flex items-end gap-0.5 px-3 pt-3 pb-2"
        style={{ height: "88px" }}
      >
        {sorted.map((r) => (
          <MaandBalk key={r.periode} record={r} maxNetto={maxNetto} />
        ))}
      </div>

      <div className="divide-y divide-white/3">
        {sorted.map((r) => (
          <MaandRij key={r.periode} record={r} />
        ))}
      </div>
    </div>
  );
}

export function MaandRij({ record: r }: { record: SalarisDisplayRecord }) {
  const eenmalig: { label: string }[] = useMemo(() => {
    try { return r.eenmaligDetail ? JSON.parse(r.eenmaligDetail) : []; } catch { return []; }
  }, [r.eenmaligDetail]);
  const isWerkelijk = r.bron === "werkelijk";

  return (
    <div className="flex items-center justify-between px-4 py-2.5 hover:bg-white/2 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs font-medium text-slate-400 w-8">{MAANDEN[r.maand - 1]}</span>
        <span className="text-[10px] text-slate-600">{r.aantalDiensten} diensten</span>
        {isWerkelijk && (
          <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full">
            werkelijk
          </span>
        )}
        {eenmalig.map((e) => (
          <span key={e.label} className="text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full">
            {e.label.replace(/^[^\s]+ /, "")}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-4 text-xs tabular-nums shrink-0">
        <span className="text-slate-500 hidden sm:block">{fmt(r.brutoBetaling)}</span>
        <span className="text-red-500/80 text-[11px] hidden sm:block">-{fmt(r.pensioenpremie)}</span>
        <span className="text-emerald-400 font-semibold">{fmt(r.nettoPrognose)}</span>
      </div>
    </div>
  );
}

export function TotaalCard({ icon: Icon, label, value, accent }: {
  icon: any; label: string; value: string; accent: string;
}) {
  return (
    <div className="glass rounded-xl p-3 border border-white/5" style={{ borderColor: accent + "20" }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={11} style={{ color: accent }} />
        <p className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-sm font-bold" style={{ color: accent }}>{value}</p>
    </div>
  );
}

export function VergelijkingSectie({
  berekend,
  werkelijkByPeriode,
}: {
  berekend: SalarisRecord[];
  werkelijkByPeriode: Map<string, LoonstrookRecord>;
}) {
  const rows = berekend
    .filter((r) => werkelijkByPeriode.has(r.periode))
    .map((r) => {
      const w = werkelijkByPeriode.get(r.periode)!;
      const deltaNetto = w.netto - r.nettoPrognose;
      const deltaOrt = w.ortTotaal - r.ortTotaal;
      return { periode: r.periode, maand: r.maand, jaar: r.jaar, berekend: r, werkelijk: w, deltaNetto, deltaOrt };
    })
    .sort((a, b) => a.jaar - b.jaar || a.maand - b.maand);

  if (rows.length === 0) return null;

  const DeltaBadge = ({ delta }: { delta: number }) => {
    const pos = delta >= 0;
    return (
      <span className={cn(
        "text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded",
        pos ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
      )}>
        {pos ? "+" : ""}{fmt(delta)}
      </span>
    );
  };

  return (
    <div className="glass rounded-2xl p-5 border border-white/5">
      <p className="text-[10px] text-teal-400/70 uppercase tracking-wider font-bold mb-3">
        Berekend vs Werkelijk
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: "0.75rem", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--text-muted, #64748b)" }}>Periode</th>
              <th style={{ textAlign: "right", padding: "6px 8px", color: "#f59e0b" }}>Berekend</th>
              <th style={{ textAlign: "right", padding: "6px 8px", color: "#34d399" }}>Werkelijk</th>
              <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--text-muted, #64748b)" }}>Delta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.periode} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "6px 8px", fontWeight: 600 }}>{MAANDEN[r.maand - 1]} {r.jaar}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#f59e0b" }}>{fmt(r.berekend.nettoPrognose)}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#34d399" }}>{fmt(r.werkelijk.netto)}</td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}><DeltaBadge delta={r.deltaNetto} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
