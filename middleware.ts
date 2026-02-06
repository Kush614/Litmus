import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PROTECTED_ROUTES = ["/dashboard", "/submit"];
const PROTECTED_PATTERNS = [/^\/agents\/[^/]+\/benchmark$/, /^\/agents\/[^/]+\/voice-eval$/];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected =
    PROTECTED_ROUTES.includes(pathname) ||
    PROTECTED_PATTERNS.some((pattern) => pattern.test(pathname));

  if (isProtected) {
    const supabaseAuth = request.cookies.get("sb-oruhaepsclqzwfsjnqdj-auth-token")?.value;

    if (!supabaseAuth) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/submit/:path*",
    "/agents/:slug/benchmark",
    "/agents/:slug/voice-eval",
  ],
};
