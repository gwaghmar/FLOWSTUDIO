import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/password-reset";
import { Logo } from "@/components/logo";

export default function ForgotPasswordPage() {
  const inputStyle = {
    width: "100%",
    background: "#fff",
    border: "1.5px solid var(--fs-border)",
    borderRadius: 2,
    padding: "10px 12px",
    fontFamily: "var(--font-sans-fs)",
    fontSize: 14,
    color: "var(--charcoal)",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    display: "block",
    fontFamily: "var(--font-mono-fs)",
    fontSize: 10,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: "var(--charcoal-light)",
    marginBottom: 6,
  };

  return (
    <div style={{ background: "var(--cream)", minHeight: "100vh" }}>
      {/* NAV */}
      <header style={{ maxWidth: 960, margin: "0 auto", padding: "24px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <Logo className="h-6 w-6" />
          <span style={{ fontFamily: "var(--font-mono-fs)", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--charcoal)", fontWeight: 500 }}>
            drawxyz
          </span>
        </Link>
        <Link
          href="/login"
          style={{ fontFamily: "var(--font-mono-fs)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--charcoal-light)", textDecoration: "none" }}
        >
          Back to login
        </Link>
      </header>

      {/* CARD */}
      <div style={{ maxWidth: 400, margin: "48px auto 0", padding: "0 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <p style={{ fontFamily: "var(--font-mono-fs)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fs-indigo)", marginBottom: 12 }}>
            drawxyz
          </p>
          <h1 style={{ fontFamily: "var(--font-mono-fs)", fontSize: 28, fontWeight: 400, textTransform: "uppercase", letterSpacing: "-0.01em", color: "var(--charcoal)", margin: 0 }}>
            Reset password
          </h1>
        </div>

        <div style={{ background: "#fff", border: "1.5px solid var(--fs-border)", borderRadius: 4, padding: 28 }}>
          <p style={{ fontFamily: "var(--font-sans-fs)", fontSize: 14, color: "var(--charcoal-light)", marginBottom: 24 }}>
            Enter your email address and we'll send you a link to reset your password.
          </p>

          <form
            action={async (formData: FormData) => {
              "use server";
              const email = (formData.get("email") as string)?.trim();
              const result = await requestPasswordReset(email);
              if (result.success) {
                const { redirect } = await import("next/navigation");
                redirect(`/auth/reset-sent?email=${encodeURIComponent(email)}`);
              }
            }}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <div>
              <label htmlFor="email" style={labelStyle}>Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                style={inputStyle}
              />
            </div>
            <button
              type="submit"
              style={{
                width: "100%",
                background: "var(--charcoal)",
                color: "#fff",
                border: "1.5px solid var(--charcoal)",
                borderRadius: 2,
                padding: "11px 0",
                fontFamily: "var(--font-mono-fs)",
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Send reset link →
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: "center" }}>
            <Link
              href="/login"
              style={{ fontFamily: "var(--font-sans-fs)", fontSize: 12, color: "var(--fs-indigo)", textDecoration: "none" }}
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
