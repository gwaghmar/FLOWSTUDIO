import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ApiError } from "@flowchart/core";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    const body: ApiError = { error: "Unauthorized", code: "UNAUTHORIZED" };
    return NextResponse.json(body, { status: 401 });
  }
  if (!stripe) {
    const body: ApiError = { error: "Stripe not configured", code: "INTERNAL_ERROR" };
    return NextResponse.json(body, { status: 501 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user?.stripeCustomerId) {
    const body: ApiError = { error: "No billing account found. Please subscribe first.", code: "NOT_FOUND" };
    return NextResponse.json(body, { status: 404 });
  }

  const origin = new URL(req.url).origin;
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${origin}/app/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
