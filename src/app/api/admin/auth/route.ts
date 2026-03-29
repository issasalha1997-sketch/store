import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/auth — validate admin secret and set HttpOnly cookie
 * DELETE /api/admin/auth — clear the admin cookie (logout)
 */

export async function POST(request: NextRequest) {
  try {
    const { secret } = await request.json();
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret) {
      return NextResponse.json(
        { error: "Admin access is not configured" },
        { status: 503 }
      );
    }

    if (!secret || secret !== adminSecret) {
      return NextResponse.json(
        { error: "Invalid admin secret" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true }, { status: 200 });

    response.cookies.set("admin_auth", adminSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true }, { status: 200 });

  response.cookies.set("admin_auth", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0, // expire immediately
  });

  return response;
}
