import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function checkDb() {
  // Queries the real users table (not just "select 1") so a missing schema
  // (db:push never run) fails this check instead of silently passing.
  await db.select({ id: users.id }).from(users).limit(1);
}

async function checkAuth() {
  const supabase = await createClient();
  const { error } = await supabase.auth.getSession();
  if (error) throw error;
}

export async function GET() {
  const [dbResult, authResult] = await Promise.allSettled([checkDb(), checkAuth()]);

  const dbOk = dbResult.status === "fulfilled";
  const authOk = authResult.status === "fulfilled";

  if (dbResult.status === "rejected") console.error("[health] DB check failed:", dbResult.reason);
  if (authResult.status === "rejected") console.error("[health] Auth check failed:", authResult.reason);

  return NextResponse.json(
    { ok: dbOk && authOk, service: "flowchart-studio-web", db: dbOk, auth: authOk },
    { status: dbOk && authOk ? 200 : 503 }
  );
}
