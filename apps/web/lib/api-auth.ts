import { eq } from "drizzle-orm";
import { db } from "./db";
import { apiKeys, users } from "./db/schema";
import { sha256Hex } from "./crypto";

export type ApiPrincipal =
  | { type: "user"; userId: string; plan: "free" | "pro" }
  | { type: "anonymous" };

export async function getPrincipalFromRequest(
  req: Request
): Promise<ApiPrincipal> {
  const authz = req.headers.get("authorization") ?? "";
  const m = authz.match(/^Bearer\s+(.+)$/i);
  if (!m) return { type: "anonymous" };
  const raw = m[1].trim();
  if (!raw.startsWith("fc_")) return { type: "anonymous" };

  const keyHash = sha256Hex(raw);
  const [k] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);
  if (!k) return { type: "anonymous" };

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, k.id));

  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.id, k.userId))
    .limit(1);
  return { type: "user", userId: k.userId, plan: (u?.plan === "pro" ? "pro" : "free") };
}

