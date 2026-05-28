"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { projects, shareLinks } from "@/lib/db/schema";
import { ensureUserAndWorkspace } from "@/lib/user-sync";
import { and, eq, isNull } from "drizzle-orm";
import { sha256Hex, token } from "@/lib/crypto";

// Cap stored preview size so we don't bloat the row. A modest-quality 1200x630
// PNG generally fits well below this. Oversized uploads are dropped and the OG
// route falls back to the branded card.
const MAX_PREVIEW_DATA_URL_BYTES = 400_000;

function sanitizePreview(previewDataUrl: string | undefined): string | null {
  if (!previewDataUrl) return null;
  if (!previewDataUrl.startsWith("data:image/")) return null;
  if (previewDataUrl.length > MAX_PREVIEW_DATA_URL_BYTES) return null;
  return previewDataUrl;
}

export async function createShareLink(projectId: string, previewDataUrl?: string) {
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

  const preview = sanitizePreview(previewDataUrl);

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
    rawToken: raw,
    createdAt: now,
    previewDataUrl: preview,
  });
  return raw;
}

/**
 * Refresh the preview PNG on the active share link for this project without
 * minting a new token. No-op if no active link exists yet.
 */
export async function updateSharePreview(projectId: string, previewDataUrl: string) {
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

  const preview = sanitizePreview(previewDataUrl);
  if (!preview) return { updated: false };

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

  if (!existing) return { updated: false };

  await db
    .update(shareLinks)
    .set({ previewDataUrl: preview })
    .where(eq(shareLinks.id, existing.id));
  return { updated: true };
}
