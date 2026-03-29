import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/products?q=search&page=1&limit=50
 * Search products for admin panel. Returns products with their store prices.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { brand: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q.toLowerCase() } },
          ],
        }
      : {};

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          category: { select: { name: true } },
          prices: {
            where: { isLatest: true },
            include: {
              store: { select: { id: true, name: true, slug: true, color: true } },
            },
            orderBy: { price: "asc" },
          },
        },
      }),
    ]);

    const data = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand,
      weight: p.weight,
      weightUnit: p.weightUnit,
      imageUrl: p.imageUrl,
      category: p.category?.name || null,
      storeCount: p.prices.length,
      prices: p.prices.map((pr) => ({
        store: pr.store.name,
        storeSlug: pr.store.slug,
        storeColor: pr.store.color,
        price: Number(pr.price),
      })),
    }));

    return NextResponse.json({ data, total, page, limit });
  } catch (error) {
    console.error("GET /api/admin/products error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/products
 * Update a product's name or other fields.
 * Body: { id: string, name?: string, brand?: string, weight?: number, weightUnit?: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Product id required" }, { status: 400 });
    }

    // Whitelist allowed fields to prevent mass-assignment attacks
    const allowedFields = ['name', 'brand', 'description', 'weight', 'weightUnit', 'imageUrl', 'categoryId', 'isActive'];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Generate new slug if name changed
    if (updates.name) {
      updates.slug = (updates.name as string)
        .toLowerCase()
        .replace(/['']/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    const product = await prisma.product.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("PATCH /api/admin/products error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
