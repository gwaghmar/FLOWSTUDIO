import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase OAuth callback handler.
 *
 * After the user signs in via Google / GitHub / Apple, Supabase redirects here
 * with a one-time `code` in the query string.  We exchange it for a session
 * (this sets the auth cookies) and then redirect the user onward.
 *
 * Set the "Redirect URL" in your Supabase project dashboard to:
 *   https://your-domain.com/api/auth/callback
 *   http://localhost:3040/api/auth/callback   (dev)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app/editor";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Ensure redirect target is safe (same origin only)
      const forwardSlash = next.startsWith("/") && !next.startsWith("//");
      const destination = forwardSlash ? `${origin}${next}` : `${origin}/app/editor`;
      return NextResponse.redirect(destination);
    }
  }

  // Something went wrong — send back to login with an error flag
  return NextResponse.redirect(
    new URL("/login?error=auth_callback_failed", origin)
  );
}
