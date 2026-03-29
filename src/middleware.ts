import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware to protect admin routes.
 *
 * - /api/admin/* : requires ADMIN_SECRET as "x-admin-secret" header or "secret" query param
 * - /admin/*     : requires "admin_auth" cookie matching ADMIN_SECRET
 * - /admin/login : always accessible (so the user can authenticate)
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminSecret = process.env.ADMIN_SECRET;

  // If ADMIN_SECRET is not configured, block all admin access
  if (!adminSecret) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json(
        { error: "Admin access is not configured" },
        { status: 503 }
      );
    }
    // For admin pages, redirect to homepage
    return NextResponse.redirect(new URL("/", request.url));
  }

  // ── Protect API routes: /api/admin/* ──────────────────────────
  if (pathname.startsWith("/api/admin")) {
    const headerSecret = request.headers.get("x-admin-secret");
    const querySecret = request.nextUrl.searchParams.get("secret");
    const cookieSecret = request.cookies.get("admin_auth")?.value;

    if (
      headerSecret !== adminSecret &&
      querySecret !== adminSecret &&
      cookieSecret !== adminSecret
    ) {
      return NextResponse.json(
        { error: "Unauthorized — invalid or missing admin secret" },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  // ── Allow the login page without auth ─────────────────────────
  if (pathname === "/admin/login") {
    // If already authenticated, redirect to admin dashboard
    const cookieSecret = request.cookies.get("admin_auth")?.value;
    if (cookieSecret === adminSecret) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // ── Protect admin pages: /admin/* ─────────────────────────────
  if (pathname.startsWith("/admin")) {
    const cookieSecret = request.cookies.get("admin_auth")?.value;
    if (cookieSecret !== adminSecret) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
