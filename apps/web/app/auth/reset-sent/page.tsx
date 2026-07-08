import Link from "next/link";
import { Logo } from "@/components/logo";

export default function ResetSentPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const sp = searchParams;

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
            Check your email
          </h1>
        </div>

        <div style={{ background: "#fff", border: "1.5px solid var(--fs-border)", borderRadius: 4, padding: 28 }}>
          <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 2, padding: 16, marginBottom: 24 }}>
            <p style={{ fontFamily: "var(--font-sans-fs)", fontSize: 14, color: "#166534", margin: 0 }}>
              ✓ Password reset email sent successfully
            </p>
          </div>

          <p style={{ fontFamily: "var(--font-sans-fs)", fontSize: 14, color: "var(--charcoal)", marginBottom: 16 }}>
            We've sent a password reset link to your email. Click the link in the email to set a new password.
          </p>

          <p style={{ fontFamily: "var(--font-sans-fs)", fontSize: 12, color: "var(--charcoal-light)", marginBottom: 24 }}>
            The link will expire in 1 hour. If you don't see the email, check your spam folder.
          </p>

          <Link
            href="/login"
            style={{
              display: "block",
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
              textDecoration: "none",
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
