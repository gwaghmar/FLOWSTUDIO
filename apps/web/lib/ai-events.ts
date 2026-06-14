import { db } from "@/lib/db";
import { aiEvents } from "@/lib/db/schema";

/** Best-effort analytics insert — never throws (analytics must not break a response). */
export async function recordAiEvent(row: typeof aiEvents.$inferInsert): Promise<void> {
  try {
    await db.insert(aiEvents).values(row);
  } catch (e) {
    console.warn("[ai-event] insert failed:", e instanceof Error ? e.message : e);
  }
}
