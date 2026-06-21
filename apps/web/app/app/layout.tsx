import { auth, signOut } from "@/auth";
import { ensureUserAndWorkspace } from "@/lib/user-sync";
import { isAdminEmail } from "@/lib/admin";
import { HeaderWrapper } from "@/components/header-wrapper";
import { AppHeader } from "@/components/app-header";

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

  async function doSignOut() {
    "use server";
    await signOut();
  }

  return (
    <div className="dot-grid-bg flex h-svh min-h-0 flex-col overflow-hidden">
      {dbError ? (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-6 py-2 text-center text-sm text-red-900">
          {dbError}
        </div>
      ) : null}
      <HeaderWrapper>
        <AppHeader
          creditsLabel={creditsLabel}
          showAdmin={showAdmin}
          headerIdentity={headerIdentity ?? null}
          signOutAction={doSignOut}
        />
      </HeaderWrapper>
      {/* Fills viewport under header; children use flex-1 + overflow for scroll vs full-bleed editor */}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
