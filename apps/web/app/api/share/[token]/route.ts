import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, shareLinks } from "@/lib/db/schema";
import { sha256Hex } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rl = await rateLimit(`share:${ip}`, 120, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  const { token } = await params;
  const tokenHash = sha256Hex(token);
  const [link] = await db
    .select()
    .from(shareLinks)
    .where(eq(shareLinks.tokenHash, tokenHash))
    .limit(1);
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (link.expiresAt && link.expiresAt < new Date()) {
    return NextResponse.json({ error: "Share link has expired" }, { status: 410 });
  }

  const [p] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, link.projectId))
    .limit(1);
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(
    { id: p.id, title: p.title, source: p.source, themeId: p.themeId, diagramType: p.diagramType },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    }
  );
}

