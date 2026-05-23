import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmbedViewer } from "@/components/embed-viewer";
import { db } from "@/lib/db";
import { shareLinks, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sha256Hex } from "@/lib/crypto";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

async function resolveEmbed(token: string) {
  try {
    const tokenHash = sha256Hex(token);
    const [link] = await db.select().from(shareLinks).where(eq(shareLinks.tokenHash, tokenHash)).limit(1);
    if (!link) return { kind: "missing" as const };
    if (link.expiresAt && link.expiresAt < new Date()) return { kind: "expired" as const };
    const [p] = await db
      .select({ title: projects.title, diagramType: projects.diagramType })
      .from(projects)
      .where(eq(projects.id, link.projectId))
      .limit(1);
    if (!p) return { kind: "missing" as const };
    return { kind: "ok" as const };
  } catch {
    return { kind: "missing" as const };
  }
}

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await resolveEmbed(token);
  if (result.kind === "missing") notFound();
  if (result.kind === "expired") {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-sm text-slate-500">
        This embed link has expired.
      </div>
    );
  }
  return <EmbedViewer token={token} />;
}
