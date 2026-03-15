import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "#0a0a0f" }}
    >
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #f59e0b 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center border"
            style={{
              background: "rgba(245,158,11,0.15)",
              borderColor: "rgba(245,158,11,0.3)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#f1f5f9" }}>Homeapp</h1>
            <p className="text-sm mt-1" style={{ color: "#64748b" }}>Account aanmaken</p>
          </div>
        </div>

        <SignUp
          appearance={{
            variables: {
              colorPrimary: "#f59e0b",
              colorBackground: "#111118",
              colorInputBackground: "#1a1a24",
              colorInputText: "#f1f5f9",
              colorText: "#f1f5f9",
              colorTextSecondary: "#64748b",
              borderRadius: "12px",
              fontFamily: "Inter, sans-serif",
            },
            elements: {
              card: {
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
                backdropFilter: "blur(20px)",
              },
              headerTitle: { color: "#f1f5f9", fontWeight: "700" },
              headerSubtitle: { color: "#64748b" },
              formButtonPrimary: {
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                color: "#0a0a0f",
                fontWeight: "700",
              },
              footerActionLink: { color: "#f59e0b" },
              formFieldInput: {
                background: "#1a1a24",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#f1f5f9",
              },
            },
          }}
        />
      </div>
    </div>
  );
}
