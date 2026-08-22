import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return true;
  }
  // Next.js internals and static assets never need a session.
  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return true;
  }
  // Every API route enforces its own authorization internally (some,
  // like /api/auth/login and /api/invites/accept, must be reachable
  // by logged-out users in the first place; others check the session
  // or a bearer secret themselves — see each route handler). Redirecting
  // an unauthenticated *page* request to /login makes sense; redirecting
  // a JSON fetch() call to an HTML login page does not, so API routes
  // are exempted from this page-level gate rather than redirected.
  if (pathname.startsWith("/api/")) {
    return true;
  }
  return false;
}

/**
 * Refreshes the Supabase auth session on every request and redirects
 * unauthenticated users away from private pages. This is the single
 * gate that keeps the whole app private — every route not explicitly
 * listed above requires a valid, non-expired session.
 *
 * Runs in the Edge middleware runtime, where request/response cookies
 * are plain synchronous NextRequest/NextResponse APIs (the Next.js 15+
 * "cookies() is now async" change only affects the next/headers
 * cookies() helper used in Server Components/Route Handlers, not this).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const publicPath = isPublicPath(pathname);

  if (!user && !publicPath) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}
