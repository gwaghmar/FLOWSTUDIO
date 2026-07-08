"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  projectCollaborators,
  projectEdits,
  collaboratorPresence,
  projects,
  users,
  workspaces,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function addCollaborator(
  projectId: string,
  email: string,
  role: "viewer" | "editor" | "admin" = "editor"
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });
    if (!project) return { success: false, error: "Project not found" };

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (!user) return { success: false, error: "User not found" };

    const isOwner = project.workspaceId === (
      await db.query.workspaces.findFirst({
        where: eq(workspaces.id, project.workspaceId),
      })
    )?.ownerId === session.user.id;

    if (!isOwner)
      return { success: false, error: "Only workspace owner can add collaborators" };

    await db.insert(projectCollaborators).values({
      projectId,
      userId: user.id,
      role,
    });

    return { success: true };
  } catch (err) {
    console.error("[addCollaborator]", err);
    return { success: false, error: "Failed to add collaborator" };
  }
}

export async function removeCollaborator(
  projectId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });
    if (!project) return { success: false, error: "Project not found" };

    await db
      .delete(projectCollaborators)
      .where(
        and(eq(projectCollaborators.projectId, projectId), eq(projectCollaborators.userId, userId))
      );

    return { success: true };
  } catch (err) {
    console.error("[removeCollaborator]", err);
    return { success: false, error: "Failed to remove collaborator" };
  }
}

export async function recordEdit(
  projectId: string,
  operation: string,
  operationData: string,
  clientId: string,
  lamportTimestamp: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });
    if (!project) return { success: false, error: "Project not found" };

    await db.insert(projectEdits).values({
      projectId,
      userId: session.user.id,
      operation,
      operationData,
      clientId,
      lamportTimestamp,
    });

    return { success: true };
  } catch (err) {
    console.error("[recordEdit]", err);
    return { success: false, error: "Failed to record edit" };
  }
}

export async function updatePresence(
  projectId: string,
  sessionId: string,
  cursorX?: number,
  cursorY?: number,
  selectionStart?: string,
  selectionEnd?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#FFA07A",
      "#98D8C8",
      "#F7DC6F",
    ];
    const colorIndex = Math.abs(session.user.id.charCodeAt(0)) % colors.length;
    const color = colors[colorIndex];

    const existing = await db.query.collaboratorPresence.findFirst({
      where: and(eq(collaboratorPresence.projectId, projectId), eq(collaboratorPresence.sessionId, sessionId)),
    });

    if (existing) {
      await db
        .update(collaboratorPresence)
        .set({
          cursorX,
          cursorY,
          selectionStart,
          selectionEnd,
          lastHeartbeat: new Date(),
        })
        .where(eq(collaboratorPresence.id, existing.id));
    } else {
      await db.insert(collaboratorPresence).values({
        projectId,
        userId: session.user.id,
        sessionId,
        cursorX,
        cursorY,
        selectionStart,
        selectionEnd,
        color,
      });
    }

    return { success: true };
  } catch (err) {
    console.error("[updatePresence]", err);
    return { success: false, error: "Failed to update presence" };
  }
}

export async function getCollaborators(projectId: string) {
  try {
    const collaborators = await db.query.projectCollaborators.findMany({
      where: eq(projectCollaborators.projectId, projectId),
      with: { userId: true },
    });
    return collaborators;
  } catch (err) {
    console.error("[getCollaborators]", err);
    return [];
  }
}

export async function getActivePresence(projectId: string) {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const presence = await db.query.collaboratorPresence.findMany({
      where: and(
        eq(collaboratorPresence.projectId, projectId),
        // lastHeartbeat > fiveMinutesAgo would need custom comparison
      ),
    });
    return presence.filter((p) => p.lastHeartbeat > fiveMinutesAgo);
  } catch (err) {
    console.error("[getActivePresence]", err);
    return [];
  }
}

export async function getProjectEdits(projectId: string, since?: Date) {
  try {
    const edits = await db.query.projectEdits.findMany({
      where: eq(projectEdits.projectId, projectId),
    });
    return since ? edits.filter((e) => e.createdAt > since) : edits;
  } catch (err) {
    console.error("[getProjectEdits]", err);
    return [];
  }
}
