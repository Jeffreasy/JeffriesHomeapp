import { Loader2 } from "lucide-react";

/** Route-level loading state (FH3) — minimal centered spinner in app style. */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Laden">
      <Loader2 size={28} className="animate-spin text-slate-500" />
      <span className="sr-only">Laden…</span>
    </div>
  );
}
