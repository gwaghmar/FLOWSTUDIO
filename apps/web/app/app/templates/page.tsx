import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";
import { TemplatesClient } from "./templates-client";

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=" + encodeURIComponent("/app/templates"));
  }

  return (
    <div style={{ background: "var(--cream)", minHeight: "100vh" }}>
      {/* NAV */}
      <header style={{ background: "var(--cream)", borderBottom: "1.5px solid var(--fs-border)", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", position: "sticky", top: 0, zIndex: 50 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <Logo className="h-6 w-6 rounded-sm shadow-xs shadow-orange-500/20" />
          <span style={{ fontFamily: "var(--font-mono-fs)", fontSize: 15, color: "var(--charcoal)", fontWeight: 500 }}>drawxyz</span>
        </Link>
        <nav style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link href="/app" style={{ fontFamily: "var(--font-mono-fs)", fontSize: 13, color: "var(--charcoal-light)", textDecoration: "none" }}>
            Projects
          </Link>
          <Link
            href="/app/editor"
            className="fs-btn-press"
            style={{ fontFamily: "var(--font-mono-fs)", fontSize: 13, letterSpacing: "0.04em", background: "var(--charcoal)", color: "#fff", padding: "7px 16px", borderRadius: 2, textDecoration: "none" }}
          >
            Open editor →
          </Link>
        </nav>
      </header>

      <TemplatesClient />
    </div>
  );
}
