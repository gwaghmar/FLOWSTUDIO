import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ensureUserAndWorkspace } from "@/lib/user-sync";
import { isAdminEmail } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    redirect("/login?callbackUrl=" + encodeURIComponent("/app/admin"));
  }
  const { user } = await ensureUserAndWorkspace(email);
  if (user.role !== "admin" && !isAdminEmail(email)) {
    redirect("/app");
  }

  return (
    <>
      <div className="border-b border-amber-200 bg-amber-50/80 px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between text-sm">
          <span className="font-medium text-amber-950">Admin</span>
          <Link href="/app" className="text-amber-900 underline">
            Back to app
          </Link>
        </div>
      </div>
      {children}
    </>
  );
}
