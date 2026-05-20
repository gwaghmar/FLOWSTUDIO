import { eq } from "drizzle-orm";
import { db } from "./db";
import { users, workspaces } from "./db/schema";
import { resolveRoleForNewUser } from "./admin";
import { isMockAuthEnabled } from "./auth-mode";

type UserRecord = typeof users.$inferSelect;
type WorkspaceRecord = typeof workspaces.$inferSelect;
type UserRole = "admin" | "user";

type UserCreateValues = Pick<
  typeof users.$inferInsert,
  "email" | "name" | "role"
>;
type WorkspaceCreateValues = Pick<
  typeof workspaces.$inferInsert,
  "name" | "ownerId"
>;

export type UserWorkspaceSyncDeps = {
  selectUserByEmail(email: string): Promise<UserRecord | null>;
  createUser(values: UserCreateValues): Promise<UserRecord>;
  selectWorkspaceByOwnerId(ownerId: string): Promise<WorkspaceRecord | null>;
  createWorkspace(values: WorkspaceCreateValues): Promise<WorkspaceRecord>;
  resolveRole(email: string): UserRole;
};

function displayNameFromEmail(email: string): string {
  return email.split("@")[0] || email;
}

function getMockUserAndWorkspace(email: string) {
  const mockUser = {
    id: "dev-user-id",
    email,
    name: displayNameFromEmail(email),
    plan: "pro",
    role: "admin",
    creditsBalance: 100,
    aiApiKeyCipher: null,
    aiKeyLast4: null,
    aiBaseUrl: null,
    aiModel: null,
    aiProvider: "openai",
  };
  const mockWorkspace = {
    id: "dev-ws-id",
    name: "Personal",
    ownerId: "dev-user-id",
    createdAt: new Date(0),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { user: mockUser as any, workspace: mockWorkspace as any };
}

export async function ensureUserAndWorkspaceCore(
  email: string,
  deps: UserWorkspaceSyncDeps,
) {
  const normalizedEmail = email.trim().toLowerCase();
  let user = await deps.selectUserByEmail(normalizedEmail);

  if (!user) {
    user = await deps.createUser({
      email: normalizedEmail,
      name: displayNameFromEmail(normalizedEmail),
      role: deps.resolveRole(normalizedEmail),
    });
  }

  let workspace = await deps.selectWorkspaceByOwnerId(user.id);
  if (!workspace) {
    workspace = await deps.createWorkspace({
      name: "Personal",
      ownerId: user.id,
    });
  }

  return { user, workspace };
}

export async function ensureUserAndWorkspace(email: string) {
  if (isMockAuthEnabled()) return getMockUserAndWorkspace(email);

  return ensureUserAndWorkspaceCore(email, {
    selectUserByEmail: async (userEmail) => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, userEmail))
        .limit(1);
      return user ?? null;
    },
    createUser: async (values) => {
      const [user] = await db.insert(users).values(values).returning();
      if (!user) throw new Error("Failed to create user");
      return user;
    },
    selectWorkspaceByOwnerId: async (ownerId) => {
      const [workspace] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.ownerId, ownerId))
        .limit(1);
      return workspace ?? null;
    },
    createWorkspace: async (values) => {
      const [workspace] = await db.insert(workspaces).values(values).returning();
      if (!workspace) throw new Error("Failed to create workspace");
      return workspace;
    },
    resolveRole: resolveRoleForNewUser,
  });
}
