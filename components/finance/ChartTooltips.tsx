import { eur } from "@/lib/finance-constants";

// ─── Recharts custom tooltips ─────────────────────────────────────────────────

interface TooltipItem { name: string; value: number; color: string; }
interface TooltipProps { active?: boolean; payload?: TooltipItem[]; label?: string; }

export function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="chart-tooltip__value" style={{ color: p.color }}>
          {p.name}: {eur(p.value)}
        </p>
      ))}
    </div>
  );
}

interface PiePayloadItem { name: string; value: number; color: string; percent?: number; payload?: { bedrag: number; categorie: string }; }
interface PieTooltipProps { active?: boolean; payload?: PiePayloadItem[]; }

export function PieTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const pct = typeof item.percent === "number"
    ? (item.percent * 100).toFixed(1)
    : null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{item.name}</p>
      <p className="chart-tooltip__value" style={{ color: item.color }}>
        {item.value.toLocaleString("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 2 })}
        {pct && <span className="chart-tooltip__pct"> ({pct}%)</span>}
      </p>
    </div>
  );
}
