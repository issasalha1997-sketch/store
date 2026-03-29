import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/staging - List staged batches and their products
 * Query params: ?batchId=xxx or ?status=pending
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const batchId = searchParams.get("batchId");
    const status = searchParams.get("status") || "pending";

    if (batchId) {
      // Get products for a specific batch
      const batch = await prisma.stagedBatch.findUnique({
        where: { id: batchId },
      });
      if (!batch) {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      }

      const products = await prisma.stagedProduct.findMany({
        where: { batchId },
        orderBy: [{ status: "asc" }, { canonName: "asc" }],
      });

      return NextResponse.json({ batch, products });
    }

    // List all batches
    const batches = await prisma.stagedBatch.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ batches });
  } catch (error) {
    console.error("GET /api/admin/staging error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/staging - Apply or reject a staged batch
 * Body: { batchId: string, action: "approve" | "reject" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batchId, action } = body;

    if (!batchId || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid request. Need batchId and action (approve/reject)" },
        { status: 400 }
      );
    }

    const batch = await prisma.stagedBatch.findUnique({
      where: { id: batchId },
    });
    if (!batch || batch.status !== "pending") {
      return NextResponse.json(
        { error: "Batch not found or already processed" },
        { status: 404 }
      );
    }

    if (action === "reject") {
      await prisma.$transaction([
        prisma.stagedProduct.updateMany({
          where: { batchId },
          data: { status: "rejected" },
        }),
        prisma.stagedBatch.update({
          where: { id: batchId },
          data: { status: "rejected" },
        }),
      ]);
      return NextResponse.json({ success: true, action: "rejected" });
    }

    // APPROVE — apply staged data to live tables
    const stagedProducts = await prisma.stagedProduct.findMany({
      where: { batchId, status: "pending" },
    });

    const store = await prisma.store.findUnique({
      where: { slug: batch.storeSlug },
    });
    if (!store) {
      return NextResponse.json(
        { error: `Store '${batch.storeSlug}' not found` },
        { status: 404 }
      );
    }

    // Get category mapping
    const categories = await prisma.category.findMany();
    const catMap = new Map(categories.map((c) => [c.slug, c.id]));

    const CATEGORY_MAP: Record<string, string> = {
      "dairy & eggs": "dairy-eggs",
      "meat & poultry": "meat-poultry",
      "fruits & vegetables": "fruits-vegetables",
      bakery: "bakery",
      drinks: "drinks",
      frozen: "frozen",
      "snacks & sweets": "snacks-sweets",
      "pantry & cupboard": "pantry-cupboard",
      household: "household",
      "personal care": "personal-care",
      baby: "baby",
    };

    let applied = 0;
    let errors = 0;

    for (const sp of stagedProducts) {
      try {
        const catSlug = sp.category
          ? CATEGORY_MAP[sp.category.toLowerCase()]
          : undefined;
        const categoryId = catSlug ? catMap.get(catSlug) : undefined;

        // Upsert product
        const product = await prisma.product.upsert({
          where: { slug: sp.matchSlug },
          create: {
            name: sp.canonName,
            slug: sp.matchSlug,
            brand: sp.brand || null,
            imageUrl: sp.imageUrl || null,
            description: sp.description?.slice(0, 500) || null,
            weight: sp.weight || null,
            weightUnit: sp.weightUnit || null,
            categoryId: categoryId || null,
            isActive: true,
          },
          update: {
            ...(sp.imageUrl ? { imageUrl: sp.imageUrl } : {}),
            ...(sp.brand ? { brand: sp.brand } : {}),
            ...(sp.description
              ? { description: sp.description.slice(0, 500) }
              : {}),
          },
        });

        // Mark old prices as not latest
        await prisma.price.updateMany({
          where: { productId: product.id, storeId: store.id, isLatest: true },
          data: { isLatest: false },
        });

        // Create new price
        await prisma.price.create({
          data: {
            productId: product.id,
            storeId: store.id,
            price: sp.price,
            originalPrice: sp.originalPrice || null,
            isOnSale: sp.isOnSale,
            unitPrice: sp.unitPrice || null,
            unitPriceUnit: sp.unitPriceUnit || null,
            currency: "EUR",
            isLatest: true,
            scrapedAt: sp.createdAt,
          },
        });

        await prisma.stagedProduct.update({
          where: { id: sp.id },
          data: { status: "applied", existingProductId: product.id },
        });

        applied++;
      } catch {
        errors++;
      }
    }

    await prisma.stagedBatch.update({
      where: { id: batchId },
      data: { status: "applied", appliedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      action: "approved",
      applied,
      errors,
      total: stagedProducts.length,
    });
  } catch (error) {
    console.error("POST /api/admin/staging error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
