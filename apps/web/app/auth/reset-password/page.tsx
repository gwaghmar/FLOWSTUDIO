"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "@/app/actions/password-reset";
import { Logo } from "@/components/logo";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code) {
      setError("Invalid reset link");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    const result = await resetPassword(password, code);
    if (!result.success) {
      setError(result.error || "Failed to reset password");
      setLoading(false);
    }
  };

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
            Set new password
          </h1>
        </div>

        <div style={{ background: "#fff", border: "1.5px solid var(--fs-border)", borderRadius: 4, padding: 28 }}>
          {error && (
            <p style={{
              marginBottom: 20,
              border: "1.5px solid #fca5a5",
              background: "#fef2f2",
              borderRadius: 2,
              padding: "10px 12px",
              fontFamily: "var(--font-sans-fs)",
              fontSize: 13,
              color: "#991b1b",
            }}>
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label htmlFor="password" style={labelStyle}>New password</label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" style={labelStyle}>Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={inputStyle}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
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
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Resetting..." : "Reset password →"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
