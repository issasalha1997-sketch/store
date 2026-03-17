import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const stores = await prisma.store.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        websiteUrl: true,
        color: true,
        createdAt: true,
        _count: {
          select: { locations: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const data = stores.map((store) => ({
      id: store.id,
      name: store.name,
      slug: store.slug,
      logoUrl: store.logoUrl,
      websiteUrl: store.websiteUrl,
      color: store.color,
      createdAt: store.createdAt,
      locationCount: store._count.locations,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/stores error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
