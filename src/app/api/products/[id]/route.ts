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

    // Fetch family members — same product in different sizes across stores
    let familyMembers: Array<{
      id: string;
      name: string;
      slug: string;
      weight: number | null;
      weightUnit: string | null;
      imageUrl: string | null;
      brand: string | null;
      store: string;
      storeSlug: string;
      storeColor: string | null;
      price: number;
      unitPrice: number | null;
      unitPriceUnit: string | null;
    }> = [];

    if (product.familySlug) {
      const siblings = await prisma.product.findMany({
        where: {
          familySlug: product.familySlug,
          isActive: true,
          id: { not: product.id },
        },
        include: {
          prices: {
            where: { isLatest: true },
            include: {
              store: { select: { name: true, slug: true, color: true } },
            },
          },
        },
      });

      for (const sib of siblings) {
        for (const p of sib.prices) {
          familyMembers.push({
            id: sib.id,
            name: sib.name,
            slug: sib.slug,
            weight: sib.weight,
            weightUnit: sib.weightUnit,
            imageUrl: sib.imageUrl,
            brand: sib.brand,
            store: p.store.name,
            storeSlug: p.store.slug,
            storeColor: p.store.color,
            price: Number(p.price),
            unitPrice: p.unitPrice ? Number(p.unitPrice) : null,
            unitPriceUnit: p.unitPriceUnit,
          });
        }
      }

      // Also include this product's own prices in the family view
      for (const p of product.prices) {
        familyMembers.push({
          id: product.id,
          name: product.name,
          slug: product.slug,
          weight: product.weight,
          weightUnit: product.weightUnit,
          imageUrl: product.imageUrl,
          brand: product.brand,
          store: p.store.name,
          storeSlug: p.store.slug,
          storeColor: p.store.color,
          price: Number(p.price),
          unitPrice: p.unitPrice ? Number(p.unitPrice) : null,
          unitPriceUnit: p.unitPriceUnit,
        });
      }

      // Sort by unit price (cheapest first), fallback to price
      familyMembers.sort((a, b) => {
        if (a.unitPrice && b.unitPrice) return a.unitPrice - b.unitPrice;
        if (a.unitPrice) return -1;
        if (b.unitPrice) return 1;
        return a.price - b.price;
      });
    }

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
      familyMembers: familyMembers.length > 1 ? familyMembers : [],
      similarProducts: await getSimilarProducts(product.id, product.categoryId, product.familySlug),
    });
  } catch (error) {
    console.error("GET /api/products/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get similar products from the same category but different family.
 * Returns up to 8 product families to show as recommendations.
 */
async function getSimilarProducts(
  productId: string,
  categoryId: string | null,
  familySlug: string | null
) {
  if (!categoryId) return [];

  const similar = await prisma.product.findMany({
    where: {
      categoryId,
      isActive: true,
      id: { not: productId },
      ...(familySlug ? { familySlug: { not: familySlug } } : {}),
    },
    include: {
      prices: {
        where: { isLatest: true },
        include: {
          store: { select: { name: true, slug: true, color: true } },
        },
        orderBy: { price: "asc" },
        take: 1,
      },
    },
    take: 100, // get more to group by family
  });

  // Group by familySlug, pick one representative per family
  const familyMap = new Map<
    string,
    {
      id: string;
      name: string;
      slug: string;
      imageUrl: string | null;
      familySlug: string;
      minPrice: number | null;
      storeCount: number;
    }
  >();

  for (const p of similar) {
    const fSlug = p.familySlug || p.slug;
    if (familyMap.has(fSlug)) continue;

    familyMap.set(fSlug, {
      id: p.id,
      name: p.name
        .replace(
          /\s+\d+(?:\.\d+)?(?:g|kg|ml|l|cl|pk|pack|ltr|litre|litres)\b/gi,
          ""
        )
        .trim(),
      slug: p.slug,
      imageUrl: p.imageUrl,
      familySlug: fSlug,
      minPrice: p.prices[0] ? Number(p.prices[0].price) : null,
      storeCount: p.prices.length,
    });
  }

  return [...familyMap.values()].slice(0, 8);
}
