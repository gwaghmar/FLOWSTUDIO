import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUserAndWorkspace } from "@/lib/user-sync";

const WELCOME_PROMPT = "Map the user signup flow for a SaaS app";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app/editor";

  if (code) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const email = data.session?.user?.email;
        let destination: string;

        if (email) {
          const { isNewUser } = await ensureUserAndWorkspace(email);
          if (isNewUser) {
            const welcomeParams = new URLSearchParams({
              prompt: WELCOME_PROMPT,
              welcome: "1",
            });
            destination = `${origin}/app/editor?${welcomeParams.toString()}`;
          } else {
            const forwardSlash = next.startsWith("/") && !next.startsWith("//");
            destination = forwardSlash ? `${origin}${next}` : `${origin}/app/editor`;
          }
        } else {
          const forwardSlash = next.startsWith("/") && !next.startsWith("//");
          destination = forwardSlash ? `${origin}${next}` : `${origin}/app/editor`;
        }

        return NextResponse.redirect(destination);
      }
    } catch {
      // DB or auth failure — fall through to error redirect
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=auth_callback_failed", origin)
  );
}
