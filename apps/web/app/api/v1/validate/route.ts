import { NextResponse } from "next/server";
import { MermaidSourceSchema, type ApiError } from "@flowchart/core";
import { rateLimit } from "@/lib/rate-limit";
import { getPrincipalFromRequest } from "@/lib/api-auth";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const principal = await getPrincipalFromRequest(req);
  const rlKey =
    principal.type === "user" ? `validate:key:${principal.userId}` : `validate:ip:${ip}`;
  const rl = await rateLimit(rlKey, principal.type === "user" ? 600 : 60, 60_000);
  if (!rl.ok) {
    const body: ApiError = {
      error: "Too many requests",
      code: "RATE_LIMITED",
      details: { retryAfter: rl.retryAfter },
    };
    return NextResponse.json(body, {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfter) },
    });
  }

  try {
    const json = await req.json();
    const source = MermaidSourceSchema.parse(json.source);
    return NextResponse.json({ ok: true, length: source.length });
  } catch (e) {
    const body: ApiError = {
      error: e instanceof Error ? e.message : "Invalid body",
      code: "VALIDATION_ERROR",
    };
    return NextResponse.json(body, { status: 400 });
  }
}
