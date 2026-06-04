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
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-2 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/app" className="flex items-center gap-2 text-sm font-semibold text-slate-900 sm:text-base">
              <Logo className="h-6 w-6 shadow-xs rounded-sm shadow-orange-500/20" />
              <span>Flowchart Studio</span>
            </Link>
            <nav className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-600 sm:justify-end sm:text-sm">
              <Link href="/" className="hidden hover:text-slate-900 sm:inline">
                Home
              </Link>
              <Link href="/app" className="font-medium text-slate-800 hover:text-slate-900">
                Projects
              </Link>
              <Link href="/app/editor" className="hover:text-slate-900">
                Editor
              </Link>
              {creditsLabel ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  {creditsLabel}
                </span>
              ) : null}
              {showAdmin ? (
                <Link href="/app/admin" className="hidden hover:text-slate-900 sm:inline">
                  Admin
                </Link>
              ) : null}
              <Link href="/app/billing" className="hidden hover:text-slate-900 sm:inline">
                Billing
              </Link>
              <Link href="/app/settings" className="hover:text-slate-900">
                Settings
              </Link>
              {headerIdentity ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  {headerIdentity}
                </span>
              ) : null}
              <form
                action={async () => {
                  "use server";
                  await signOut();
                }}
              >
                <button type="submit" className="text-indigo-600">
                  Sign out
                </button>
              </form>
            </nav>
          </div>
        </header>
      </HeaderWrapper>
      {/* Fills viewport under header; children use flex-1 + overflow for scroll vs full-bleed editor */}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
