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
  // Mock user for development
  return {
    user: {
      id: "dev-user-id",
      email: "dev@example.com",
      name: "Developer",
      image: null,
    },
  };
  /*
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
  */
}

/**
 * Sign the current user out and redirect to home.
 * Use in Server Actions.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
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
