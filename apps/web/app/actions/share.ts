"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { projects, shareLinks } from "@/lib/db/schema";
import { ensureUserAndWorkspace } from "@/lib/user-sync";
import { and, eq, isNull, gt } from "drizzle-orm";
import { sha256Hex, token } from "@/lib/crypto";

export async function createShareLink(projectId: string) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error("Unauthorized");
  const { workspace } = await ensureUserAndWorkspace(email);

  const [p] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!p || p.workspaceId !== workspace.id) throw new Error("Not found");

  // Return an existing active (non-expired) token instead of creating duplicates
  const now = new Date();
  const [existing] = await db
    .select()
    .from(shareLinks)
    .where(
      and(
        eq(shareLinks.projectId, projectId),
        isNull(shareLinks.expiresAt)
      )
    )
    .limit(1);

  if (existing) {
    // Re-derive the raw token isn't possible (we only store the hash), so we
    // need to issue a new token for the same project. But we avoid token sprawl
    // by deleting the old one first so only one active token exists at a time.
    await db.delete(shareLinks).where(eq(shareLinks.id, existing.id));
  }

  const raw = token("sh_", 24);
  const tokenHash = sha256Hex(raw);
  await db.insert(shareLinks).values({
    id: crypto.randomUUID(),
    projectId,
    tokenHash,
    createdAt: now,
  });
  return raw;
}

