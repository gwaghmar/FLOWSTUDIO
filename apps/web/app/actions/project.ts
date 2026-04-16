"use server";

import { auth } from "@/auth";
import { ensureUserAndWorkspace } from "@/lib/user-sync";
import { db } from "@/lib/db";
import { projects, revisions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { DiagramType } from "@flowchart/core";

export async function listProjects() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return [];
  const { workspace } = await ensureUserAndWorkspace(email);
  return db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, workspace.id))
    .orderBy(desc(projects.updatedAt));
}

export async function createProject(
  title: string,
  source: string,
  themeId: string,
  diagramType: DiagramType = "mermaid"
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error("Unauthorized");
  const { workspace } = await ensureUserAndWorkspace(email);
  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(projects).values({
    id,
    workspaceId: workspace.id,
    title,
    source,
    themeId,
    diagramType,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(revisions).values({
    id: crypto.randomUUID(),
    projectId: id,
    source,
    label: "Initial",
    createdAt: now,
  });
  revalidatePath("/app");
  return id;
}

export async function saveProject(
  id: string,
  patch: { source?: string; themeId?: string; title?: string; diagramType?: DiagramType }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error("Unauthorized");
  const { workspace } = await ensureUserAndWorkspace(email);
  const [p] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  if (!p || p.workspaceId !== workspace.id) throw new Error("Not found");
  const now = new Date();
  await db
    .update(projects)
    .set({ ...patch, updatedAt: now })
    .where(eq(projects.id, id));
  if (patch.source) {
    await db.insert(revisions).values({
      id: crypto.randomUUID(),
      projectId: id,
      source: patch.source,
      createdAt: now,
    });
  }
  revalidatePath("/app");
  revalidatePath(`/app/editor`);
}

export async function deleteProject(id: string) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error("Unauthorized");
  const { workspace } = await ensureUserAndWorkspace(email);
  const [p] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  if (!p || p.workspaceId !== workspace.id) throw new Error("Not found");
  await db.delete(projects).where(eq(projects.id, id));
  revalidatePath("/app");
}

export async function getProject(id: string) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  const { workspace } = await ensureUserAndWorkspace(email);
  const [p] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  if (!p || p.workspaceId !== workspace.id) return null;
  return p;
}
