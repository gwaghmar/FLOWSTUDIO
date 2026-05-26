import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isMockAuthEnabled, hasSupabaseConfig } from "@/lib/auth-mode";

export async function middleware(request: NextRequest) {
  if (isMockAuthEnabled() || !hasSupabaseConfig()) {
    return NextResponse.next({ request });
  }

  let user = null;
  let response: NextResponse;
  try {
    const result = await updateSession(request);
    response = result.response;
    user = result.user;
  } catch (e) {
    console.error("Middleware: updateSession failed, passing through.", e);
    return NextResponse.next({ request });
  }

  if (
    !user &&
    request.nextUrl.pathname.startsWith("/app")
  ) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set(
      "callbackUrl",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public files (images etc.)
     * Required so Supabase can refresh the session cookie on every route.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
