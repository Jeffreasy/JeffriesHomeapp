import { RotateCcw, TriangleAlert } from "lucide-react";

export function RefreshFailedBanner({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.08] px-4 py-3"
    >
      <TriangleAlert size={16} className="shrink-0 text-amber-300" />
      <p className="min-w-0 flex-1 text-sm leading-5 text-amber-100">{text}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 text-xs font-bold text-amber-100 transition hover:bg-amber-400/20"
      >
        <RotateCcw size={13} />
        Opnieuw laden
      </button>
    </div>
  );
}
