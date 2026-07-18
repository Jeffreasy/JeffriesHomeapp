import { SignIn } from "@clerk/nextjs";
import { Home } from "lucide-react";
import { Surface } from "@/components/ui/Surface";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[var(--color-background)]">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-1/4 h-[37.5rem] w-[37.5rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--color-primary)_0%,transparent_70%)] opacity-20 blur-[80px]" />
        <div className="absolute bottom-0 right-0 h-[25rem] w-[25rem] rounded-full bg-[radial-gradient(circle,var(--color-info)_0%,transparent_70%)] opacity-10 blur-[60px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Surface
            tone="accent"
            radius="lg"
            padding="none"
            className="flex h-16 w-16 items-center justify-center text-[var(--color-primary)]"
          >
            <Home size={28} aria-hidden="true" />
          </Surface>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
              Jeffries Dashboard
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-subtle)]">
              Jouw persoonlijke dashboard
            </p>
          </div>
        </div>

        <SignIn
          // This private, single-owner app never offers an enrollment path.
          withSignUp={false}
          transferable={false}
          signUpUrl="/sign-in"
          appearance={{
            variables: {
              colorPrimary: "var(--color-primary)",
              colorBackground: "var(--color-surface)",
              colorInput: "var(--color-surface-elevated)",
              colorInputForeground: "var(--color-text)",
              colorForeground: "var(--color-text)",
              colorMutedForeground: "var(--color-text-subtle)",
              borderRadius: "var(--radius-lg)",
              fontFamily: "var(--font-sans)",
            },
            elements: {
              card: {
                background: "var(--color-surface-muted)",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-overlay)",
                backdropFilter: "blur(20px)",
              },
              headerTitle: { color: "var(--color-text)", fontWeight: "700" },
              headerSubtitle: { color: "var(--color-text-subtle)" },
              socialButtonsBlockButton: {
                background: "var(--color-surface-hover)",
                border: "1px solid var(--color-border-hover)",
                color: "var(--color-text)",
              },
              socialButtonsBlockButton__hover: {
                background: "var(--color-surface-active)",
              },
              dividerLine: { background: "var(--color-border)" },
              dividerText: { color: "var(--color-text-subtle)" },
              formFieldInput: {
                background: "var(--color-surface-elevated)",
                border: "1px solid var(--color-border-hover)",
                color: "var(--color-text)",
              },
              formButtonPrimary: {
                background: "var(--color-primary)",
                color: "var(--color-primary-foreground)",
                fontWeight: "700",
              },
              footerAction: { display: "none" },
              identityPreviewText: { color: "var(--color-text)" },
              identityPreviewEditButton: { color: "var(--color-primary)" },
            },
          }}
        />

        <p className="text-xs text-[var(--color-text-subtle)]">
          Persoonlijk gebruik · Jeffrey Lavente
        </p>
      </div>
    </div>
  );
}
