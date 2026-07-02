import { eur } from "@/lib/finance-constants";
import { formatMonth } from "./FinanceUtils";

// ─── Recharts custom tooltips ─────────────────────────────────────────────────

interface TooltipItem { name: string; value: number; color: string; }
interface TooltipProps {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string;
  valueFormatter?: (value: number) => string;
  /** Formatteert het as-label; default = maandformatter, zodat de tooltip
   *  "mrt 2026" toont i.p.v. de rauwe "2026-03" (de as gebruikt dezelfde). */
  labelFormatter?: (label: string) => string;
}

export function ChartTooltip({ active, payload, label, valueFormatter = eur, labelFormatter = formatMonth }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label ? labelFormatter(label) : label}</p>
      {payload.map((p) => (
        <p key={p.name} className="chart-tooltip__value" style={{ color: p.color }}>
          {p.name}: {valueFormatter(p.value)}
        </p>
      ))}
    </div>
  );
}

interface PiePayloadItem { name: string; value: number; color: string; percent?: number; payload?: { bedrag: number; categorie: string }; }
interface PieTooltipProps {
  active?: boolean;
  payload?: PiePayloadItem[];
  valueFormatter?: (value: number) => string;
}

export function PieTooltip({ active, payload, valueFormatter }: PieTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const formatValue = valueFormatter ?? ((value: number) =>
    value.toLocaleString("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }));
  const pct = typeof item.percent === "number"
    ? (item.percent * 100).toFixed(1)
    : null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{item.name}</p>
      <p className="chart-tooltip__value" style={{ color: item.color }}>
        {formatValue(item.value)}
        {pct && <span className="chart-tooltip__pct"> ({pct}%)</span>}
      </p>
    </div>
  );
}
