"use server";

import { auth } from "@/auth";
import { ensureUserAndWorkspace } from "@/lib/user-sync";
import { db } from "@/lib/db";
import { users, workspaces, projects, shareLinks } from "@/lib/db/schema";
import { eq, and, isNull, or, gt, desc } from "drizzle-orm";
import { slugify } from "@/lib/slugify";

export { slugify };

export async function ensureHandle(userId: string, name: string | null, email: string): Promise<string> {
  const [u] = await db.select({ handle: users.handle }).from(users).where(eq(users.id, userId)).limit(1);
  if (u?.handle) return u.handle;

  const base = slugify(name ?? email.split("@")[0]).slice(0, 28);
  let candidate = base;
  let i = 2;
  while (true) {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.handle, candidate)).limit(1);
    if (!existing) break;
    candidate = `${base}-${i++}`;
  }
  await db.update(users).set({ handle: candidate }).where(eq(users.id, userId));
  return candidate;
}

export async function resolveProfile(handle: string) {
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, handle: users.handle })
    .from(users)
    .where(eq(users.handle, handle))
    .limit(1);
  return user ?? null;
}

export async function getPublicDiagrams(userId: string) {
  const now = new Date();
  return db
    .select({
      rawToken: shareLinks.rawToken,
      previewDataUrl: shareLinks.previewDataUrl,
      createdAt: shareLinks.createdAt,
      title: projects.title,
      diagramType: projects.diagramType,
    })
    .from(shareLinks)
    .innerJoin(projects, eq(shareLinks.projectId, projects.id))
    .innerJoin(workspaces, eq(projects.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaces.ownerId, userId),
        or(isNull(shareLinks.expiresAt), gt(shareLinks.expiresAt, now))
      )
    )
    .orderBy(desc(shareLinks.createdAt));
}

export async function updateHandle(newHandle: string) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error("Unauthorized");

  const trimmed = newHandle.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(trimmed)) {
    throw new Error("Handle must be 3–30 chars: lowercase letters, numbers, hyphens (not at start/end)");
  }

  const { user } = await ensureUserAndWorkspace(email);
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.handle, trimmed)).limit(1);
  if (existing && existing.id !== user.id) throw new Error("Handle already taken");

  await db.update(users).set({ handle: trimmed }).where(eq(users.id, user.id));
}

export async function getMyHandle(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  const { user } = await ensureUserAndWorkspace(email);
  const [u] = await db.select({ handle: users.handle }).from(users).where(eq(users.id, user.id)).limit(1);
  return u?.handle ?? null;
}
