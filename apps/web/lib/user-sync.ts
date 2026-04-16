import { eq } from "drizzle-orm";
import { db } from "./db";
import { users, workspaces } from "./db/schema";
import { isAdminEmail, resolveRoleForNewUser } from "./admin";

export async function ensureUserAndWorkspace(email: string) {
  let [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    if (isAdminEmail(email) && existing.role !== "admin") {
      await db.update(users).set({ role: "admin" }).where(eq(users.id, existing.id));
      const [refetched] = await db
        .select()
        .from(users)
        .where(eq(users.id, existing.id))
        .limit(1);
      existing = refetched!;
    }
    const [ws] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.ownerId, existing.id))
      .limit(1);
    if (ws) return { user: existing, workspace: ws };
    const wsId = crypto.randomUUID();
    await db.insert(workspaces).values({
      id: wsId,
      name: "Personal",
      ownerId: existing.id,
    });
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, wsId))
      .limit(1);
    return { user: existing, workspace: workspace! };
  }
  const userId = crypto.randomUUID();
  try {
    await db.insert(users).values({
      id: userId,
      email,
      name: email.split("@")[0],
      plan: "free",
      role: resolveRoleForNewUser(email),
      creditsBalance: 5,
    });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code !== "23505") throw e;
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (!row) throw e;
    return ensureUserAndWorkspace(email);
  }
  const wsId = crypto.randomUUID();
  await db.insert(workspaces).values({
    id: wsId,
    name: "Personal",
    ownerId: userId,
  });
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, wsId))
    .limit(1);
  return { user: user!, workspace: workspace! };
}
