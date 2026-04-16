import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./db/schema";

export async function getPlanForEmail(email: string): Promise<"free" | "pro"> {
  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (u?.plan === "pro") return "pro";
  return "free";
}
