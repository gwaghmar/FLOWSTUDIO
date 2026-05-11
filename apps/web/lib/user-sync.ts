import { eq } from "drizzle-orm";
import { db } from "./db";
import { users, workspaces } from "./db/schema";
import { isAdminEmail, resolveRoleForNewUser } from "./admin";

export async function ensureUserAndWorkspace(email: string) {
  // Mock for development without DB
  const mockUser = {
    id: "dev-user-id",
    email,
    name: email.split("@")[0],
    plan: "pro", // Give pro plan by default for testing
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
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { user: mockUser as any, workspace: mockWorkspace as any };

  /*
  let [existing] = await db
  ...
  */
}
