import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: slug } = await params;

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { error: "Product slug is required" },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        prices: {
          where: { isLatest: true },
          include: {
            store: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                color: true,
                websiteUrl: true,
              },
            },
          },
          orderBy: { price: "asc" },
        },
        reviews: {
          select: { rating: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Calculate average rating and review count
    const reviewCount = product.reviews.length;
    const averageRating =
      reviewCount > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
        : null;

    // Fetch price history for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const priceHistory = await prisma.price.findMany({
      where: {
        productId: product.id,
        scrapedAt: { gte: thirtyDaysAgo },
      },
      select: {
        price: true,
        originalPrice: true,
        isOnSale: true,
        scrapedAt: true,
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
          },
        },
      },
      orderBy: { scrapedAt: "asc" },
    });

    // Remove raw reviews array from response and build clean object
    const { reviews: _reviews, ...productData } = product;

    return NextResponse.json({
      ...productData,
      prices: product.prices.map((p) => ({
        id: p.id,
        price: Number(p.price),
        originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
        isOnSale: p.isOnSale,
        unitPrice: p.unitPrice ? Number(p.unitPrice) : null,
        unitPriceUnit: p.unitPriceUnit,
        scrapedAt: p.scrapedAt,
        store: p.store,
      })),
      averageRating: averageRating ? Math.round(averageRating * 10) / 10 : null,
      reviewCount,
      priceHistory: priceHistory.map((p) => ({
        price: Number(p.price),
        originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
        isOnSale: p.isOnSale,
        scrapedAt: p.scrapedAt,
        store: p.store,
      })),
    });
  } catch (error) {
    console.error("GET /api/products/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
