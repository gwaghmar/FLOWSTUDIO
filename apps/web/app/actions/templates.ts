"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ensureUserAndWorkspace } from "@/lib/user-sync";
import { db } from "@/lib/db";
import { projects, revisions } from "@/lib/db/schema";
import { getTemplate } from "@/lib/templates";

/**
 * Fork a template into a new project for the current user. Mirrors createProject
 * but with the template's title/source/diagramType/themeId and an "Initial (from
 * template)" revision label so it shows up cleanly in History.
 */
export async function forkTemplate(templateId: string) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error("Unauthorized");
  const t = getTemplate(templateId);
  if (!t) throw new Error("Template not found");

  const { workspace, user } = await ensureUserAndWorkspace(email);
  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(projects).values({
    id,
    workspaceId: workspace.id,
    title: t.title,
    source: t.source,
    themeId: t.themeId,
    diagramType: t.diagramType,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(revisions).values({
    id: crypto.randomUUID(),
    projectId: id,
    source: t.source,
    label: `Initial (forked from "${t.title}")`,
    createdAt: now,
    createdBy: user.id,
  });

  redirect(`/app/editor?id=${encodeURIComponent(id)}`);
}
