/**
 * Supabase Auth — drop-in replacement for the old NextAuth exports.
 *
 * All existing call-sites use:
 *   const session = await auth();
 *   const email = session?.user?.email;
 *
 * This keeps that exact shape so every server action / route handler
 * continues to work without change.
 */

import { createClient } from "@/lib/supabase/server";
import { getMockSession, hasSupabaseConfig, isMockAuthEnabled } from "@/lib/auth-mode";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export type AuthSession = {
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
  };
} | null;

/**
 * Get the current authenticated user.
 * Works in Server Components, Server Actions, and Route Handlers.
 */
export async function auth(): Promise<AuthSession> {
  if (isMockAuthEnabled()) return getMockSession();

  // Without Supabase config the client would throw on construction, hard-500ing
  // every server-rendered page. Treat it as "signed out" so the app degrades to
  // its public surface instead of crashing.
  if (!hasSupabaseConfig()) return null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) return null;

    return {
      user: {
        id: user.id,
        email: user.email,
        name:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          user.email.split("@")[0],
        image:
          (user.user_metadata?.avatar_url as string | undefined) ??
          (user.user_metadata?.picture as string | undefined) ??
          null,
      },
    };
  } catch (err) {
    console.error("[auth] Supabase unreachable, treating request as signed out:", err);
    return null;
  }
}

/**
 * Sign the current user out and redirect to home.
 * Use in Server Actions.
 */
export async function signOut() {
  if (isMockAuthEnabled() || !hasSupabaseConfig()) {
    redirect("/");
  }

  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("[auth] signOut failed, redirecting home anyway:", err);
  }
  redirect("/");
}

// ---------------------------------------------------------------------------
// Legacy stub — keeps /api/auth/[...nextauth]/route.ts compiling.
// Actual OAuth is now handled by /api/auth/callback and Supabase.
// ---------------------------------------------------------------------------

type RouteHandler = (req: NextRequest) => Promise<NextResponse> | NextResponse;

export const handlers: { GET: RouteHandler; POST: RouteHandler } = {
  GET: (req) =>
    NextResponse.redirect(new URL("/login", req.url)),
  POST: (req) =>
    NextResponse.redirect(new URL("/login", req.url)),
};
