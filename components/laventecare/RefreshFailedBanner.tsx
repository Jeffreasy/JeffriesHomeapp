import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { RotateCcw, TriangleAlert } from "lucide-react";

export function RefreshFailedBanner({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <Surface
      role="status"
      tone="warning"
      padding="none"
      className="flex flex-wrap items-center gap-3 px-4 py-3"
    >
      <TriangleAlert size={16} className="shrink-0 text-[var(--color-warning)]" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm leading-5 text-[var(--color-warning)]">{text}</p>
      <Button type="button" onClick={onRetry} variant="primary" size="sm" className="shrink-0">
        <RotateCcw size={13} />
        Opnieuw laden
      </Button>
    </Surface>
  );
}
