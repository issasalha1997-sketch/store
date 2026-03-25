import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/admin/merge
 * Merge two products: move all prices from sourceId to targetId, then delete source.
 * Body: { targetId: string, sourceId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetId, sourceId } = body;

    if (!targetId || !sourceId) {
      return NextResponse.json(
        { error: "targetId and sourceId are required" },
        { status: 400 }
      );
    }

    if (targetId === sourceId) {
      return NextResponse.json(
        { error: "Cannot merge a product with itself" },
        { status: 400 }
      );
    }

    // Verify both products exist
    const [target, source] = await Promise.all([
      prisma.product.findUnique({
        where: { id: targetId },
        include: { prices: { where: { isLatest: true }, include: { store: true } } },
      }),
      prisma.product.findUnique({
        where: { id: sourceId },
        include: { prices: { where: { isLatest: true }, include: { store: true } } },
      }),
    ]);

    if (!target) {
      return NextResponse.json({ error: "Target product not found" }, { status: 404 });
    }
    if (!source) {
      return NextResponse.json({ error: "Source product not found" }, { status: 404 });
    }

    // Move all prices from source to target
    // For each source price, check if target already has a price from that store
    let pricesMoved = 0;
    let pricesSkipped = 0;

    for (const sourcePrice of source.prices) {
      const existingTargetPrice = target.prices.find(
        (p) => p.storeId === sourcePrice.storeId
      );

      if (existingTargetPrice) {
        // Target already has a price from this store — skip (keep target's price)
        pricesSkipped++;
      } else {
        // Move the price to the target product
        await prisma.price.update({
          where: { id: sourcePrice.id },
          data: { productId: targetId },
        });
        pricesMoved++;
      }
    }

    // Move any non-latest prices too (for price history)
    await prisma.price.updateMany({
      where: { productId: sourceId },
      data: { productId: targetId },
    });

    // Move basket items
    const basketItems = await prisma.basketItem.findMany({
      where: { productId: sourceId },
    });
    for (const item of basketItems) {
      // Check if target already in that basket
      const existing = await prisma.basketItem.findFirst({
        where: { basketId: item.basketId, productId: targetId },
      });
      if (existing) {
        await prisma.basketItem.delete({ where: { id: item.id } });
      } else {
        await prisma.basketItem.update({
          where: { id: item.id },
          data: { productId: targetId },
        });
      }
    }

    // Move reviews
    await prisma.review.updateMany({
      where: { productId: sourceId },
      data: { productId: targetId },
    });

    // Update target product with any missing info from source
    const updates: Record<string, unknown> = {};
    if (!target.imageUrl && source.imageUrl) updates.imageUrl = source.imageUrl;
    if (!target.description && source.description) updates.description = source.description;
    if (!target.brand && source.brand) updates.brand = source.brand;
    if (!target.weight && source.weight) {
      updates.weight = source.weight;
      updates.weightUnit = source.weightUnit;
    }
    if (Object.keys(updates).length > 0) {
      await prisma.product.update({ where: { id: targetId }, data: updates });
    }

    // Delete the source product
    await prisma.product.delete({ where: { id: sourceId } });

    return NextResponse.json({
      success: true,
      message: `Merged "${source.name}" into "${target.name}"`,
      pricesMoved,
      pricesSkipped,
      targetId,
      deletedProductId: sourceId,
    });
  } catch (error) {
    console.error("POST /api/admin/merge error:", error);
    return NextResponse.json(
      { error: "Failed to merge products" },
      { status: 500 }
    );
  }
}
