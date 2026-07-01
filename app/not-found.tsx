import Link from "next/link";
import { Compass } from "lucide-react";

const MAIN_ROUTES = [
  { href: "/agenda", label: "Agenda" },
  { href: "/rooster", label: "Rooster" },
  { href: "/notities", label: "Notities" },
  { href: "/habits", label: "Habits" },
  { href: "/lampen", label: "Lampen" },
  { href: "/finance", label: "Finance" },
  { href: "/settings", label: "Instellingen" },
];

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-16 text-center text-slate-100">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10">
        <Compass size={22} className="text-amber-300" />
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-amber-300">404</p>
      <h1 className="mt-2 text-2xl font-bold text-white">Pagina niet gevonden</h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
        Deze pagina bestaat niet (meer). Controleer het adres of ga terug naar het dashboard.
      </p>

      <Link
        href="/"
        className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/15 px-4 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20"
      >
        Naar Dashboard
      </Link>

      <div className="mt-5 flex max-w-md flex-wrap items-center justify-center gap-2">
        {MAIN_ROUTES.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="inline-flex h-8 items-center rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-slate-100"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
