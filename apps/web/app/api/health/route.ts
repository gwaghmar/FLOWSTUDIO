import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function checkDb() {
  await db.execute(sql`select 1`);
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
