import Link from "next/link";
import { auth, signOut } from "@/auth";
import { ensureUserAndWorkspace } from "@/lib/user-sync";
import { isAdminEmail } from "@/lib/admin";
import { HeaderWrapper } from "@/components/header-wrapper";
import { Logo } from "@/components/logo";
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  let creditsLabel: string | null = null;
  let showAdmin = false;
  let dbError: string | null = null;
  const email = session?.user?.email;
  const headerIdentity =
    email === "demo@example.com"
      ? "Demo"
      : (session?.user?.name?.trim() || (email ? email.split("@")[0] : null));
  if (email) {
    try {
      const { user } = await ensureUserAndWorkspace(email);
      creditsLabel =
        user.plan === "pro" ? "Pro · AI unlimited" : `${user.creditsBalance} credits`;
      showAdmin = user.role === "admin" || isAdminEmail(email);
    } catch (e) {
      console.error("[ensureUserAndWorkspace]", e);
      dbError =
        e instanceof Error ? e.message : "Database error — check DATABASE_URL and network.";
    }
  }
  return (
    <div className="dot-grid-bg flex h-svh min-h-0 flex-col overflow-hidden">
      {dbError ? (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-6 py-2 text-center text-sm text-red-900">
          {dbError}
        </div>
      ) : null}
      <HeaderWrapper>
        <header style={{ background: "var(--cream)", borderBottom: "1.5px solid var(--fs-border)", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", flexShrink: 0 }}>
          <Link href="/app" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <Logo className="h-6 w-6 shadow-xs rounded-sm shadow-orange-500/20" />
            <span style={{ fontFamily: "var(--font-mono-fs)", fontSize: 14, color: "var(--charcoal)", fontWeight: 500 }}>FlowStudio</span>
          </Link>
          <nav style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Link href="/app" style={{ fontFamily: "var(--font-mono-fs)", fontSize: 12, color: "var(--charcoal-light)", textDecoration: "none", letterSpacing: "0.01em" }}>
              Projects
            </Link>
            <Link href="/app/editor" style={{ fontFamily: "var(--font-mono-fs)", fontSize: 12, color: "var(--charcoal-light)", textDecoration: "none" }}>
              Editor
            </Link>
            {creditsLabel ? (
              <span style={{ fontFamily: "var(--font-mono-fs)", fontSize: 10, letterSpacing: "0.04em", background: "var(--fs-indigo-bg)", color: "var(--fs-indigo)", padding: "3px 10px", borderRadius: 2, border: "1px solid var(--fs-indigo-border)" }}>
                {creditsLabel}
              </span>
            ) : null}
            {showAdmin ? (
              <Link href="/app/admin" style={{ fontFamily: "var(--font-mono-fs)", fontSize: 12, color: "var(--charcoal-light)", textDecoration: "none" }}>
                Admin
              </Link>
            ) : null}
            <Link href="/app/settings" style={{ fontFamily: "var(--font-mono-fs)", fontSize: 12, color: "var(--charcoal-light)", textDecoration: "none" }}>
              Settings
            </Link>
            {headerIdentity ? (
              <span style={{ fontFamily: "var(--font-mono-fs)", fontSize: 11, color: "#999", letterSpacing: "0.02em" }}>
                {headerIdentity}
              </span>
            ) : null}
            <form action={async () => { "use server"; await signOut(); }}>
              <button type="submit" style={{ fontFamily: "var(--font-mono-fs)", fontSize: 12, color: "var(--charcoal-light)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                Sign out
              </button>
            </form>
            <Link
              href="/app/editor"
              style={{ fontFamily: "var(--font-mono-fs)", fontSize: 12, letterSpacing: "0.04em", background: "var(--charcoal)", color: "#fff", padding: "6px 14px", borderRadius: 2, textDecoration: "none" }}
            >
              Open editor →
            </Link>
          </nav>
        </header>
      </HeaderWrapper>
      {/* Fills viewport under header; children use flex-1 + overflow for scroll vs full-bleed editor */}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
