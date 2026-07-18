import { eur } from "@/lib/finance-constants";
import { Surface } from "@/components/ui/Surface";
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
    <Surface tone="elevated" radius="sm" padding="xs" className="min-w-36 text-xs">
      <p className="mb-1.5 font-semibold text-[var(--color-text)]">
        {label ? labelFormatter(label) : label}
      </p>
      <div className="space-y-1">
        {payload.map((p) => (
          <p key={p.name} className="flex items-center gap-2 font-medium tabular-nums text-[var(--color-text)]">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span>{p.name}: {valueFormatter(p.value)}</span>
          </p>
        ))}
      </div>
    </Surface>
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
    <Surface tone="elevated" radius="sm" padding="xs" className="min-w-36 text-xs">
      <p className="mb-1.5 font-semibold text-[var(--color-text)]">{item.name}</p>
      <p className="flex items-center gap-2 font-medium tabular-nums text-[var(--color-text)]">
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: item.color }}
        />
        <span>
          {formatValue(item.value)}
          {pct && <span className="text-[var(--color-text-subtle)]"> ({pct}%)</span>}
        </span>
      </p>
    </Surface>
  );
}
