import { Compass } from "lucide-react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Surface } from "@/components/ui/Surface";

const MAIN_ROUTES = [
  { href: "/agenda", label: "Agenda" },
  { href: "/rooster", label: "Rooster" },
  { href: "/notities", label: "Notities" },
  { href: "/habits", label: "Habits" },
  { href: "/lampen", label: "Lampen" },
  { href: "/finance", label: "Finance" },
  { href: "/settings", label: "Instellingen" },
] as const;

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
      <Surface tone="accent" padding="lg" className="w-full max-w-lg text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]">
          <Compass size={22} aria-hidden="true" />
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[var(--color-primary-hover)]">
          404
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--color-text)]">
          Pagina niet gevonden
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--color-text-muted)]">
          Deze pagina bestaat niet (meer). Controleer het adres of ga terug naar het dashboard.
        </p>

        <div className="mt-6 flex justify-center">
          <ButtonLink href="/" variant="primary">
            Naar Dashboard
          </ButtonLink>
        </div>

        <nav aria-label="Andere onderdelen" className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {MAIN_ROUTES.map(({ href, label }) => (
            <ButtonLink key={href} href={href} variant="ghost" size="sm">
              {label}
            </ButtonLink>
          ))}
        </nav>
      </Surface>
    </div>
  );
}
