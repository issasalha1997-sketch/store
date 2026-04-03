import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSizeTier, getSizeTierLabel } from "@/lib/scraper/matcher";
import type { SizeTier } from "@/lib/scraper/matcher";

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
          select: {
            id: true,
            rating: true,
            title: true,
            body: true,
            createdAt: true,
            user: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
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

    // Separate reviews for the computed fields, keep them in response
    const { reviews, ...productData } = product;

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

    // Compute freshness for each price based on scrapedAt
    const now = Date.now();
    function getFreshness(scrapedAt: Date): "fresh" | "recent" | "stale" {
      const ageMs = now - new Date(scrapedAt).getTime();
      const ageHours = ageMs / 3600000;
      if (ageHours < 24) return "fresh";
      if (ageHours < 48) return "recent";
      return "stale";
    }

    // Compute overall price freshness from the most recent scraped price
    const latestScrapedAt = product.prices.reduce((latest, p) => {
      const t = new Date(p.scrapedAt).getTime();
      return t > latest ? t : latest;
    }, 0);
    const overallFreshness = latestScrapedAt > 0 ? getFreshness(new Date(latestScrapedAt)) : "stale";

    // Summarize price history into a trend
    let priceTrend: {
      direction: "down" | "up" | "stable";
      oldPrice: number | null;
      newPrice: number | null;
      changePercent: number | null;
      dataPoints: number;
    } | null = null;

    if (priceHistory.length >= 2) {
      // Group by store, find the store with the most data points
      const byStore = new Map<string, Array<{ price: number; scrapedAt: Date }>>();
      for (const ph of priceHistory) {
        const storeId = ph.store.id;
        if (!byStore.has(storeId)) byStore.set(storeId, []);
        byStore.get(storeId)!.push({ price: Number(ph.price), scrapedAt: ph.scrapedAt });
      }
      // Pick the store with most data points
      let bestStore: Array<{ price: number; scrapedAt: Date }> = [];
      for (const entries of byStore.values()) {
        if (entries.length > bestStore.length) bestStore = entries;
      }
      if (bestStore.length >= 2) {
        const oldest = bestStore[0].price;
        const newest = bestStore[bestStore.length - 1].price;
        const diff = newest - oldest;
        const pct = oldest > 0 ? Math.round((diff / oldest) * 100) : 0;
        priceTrend = {
          direction: diff < -0.01 ? "down" : diff > 0.01 ? "up" : "stable",
          oldPrice: oldest,
          newPrice: newest,
          changePercent: pct,
          dataPoints: bestStore.length,
        };
      }
    }

    // ─── NEW: Build storeComparison (best price per store across same-tier siblings) ───
    const mainTier = getSizeTier(product.weight, product.weightUnit, product.name);

    // Collect all products in the same tier: the main product + siblings that share the tier
    type PriceCandidate = {
      storeName: string;
      storeSlug: string;
      storeColor: string | null;
      price: number;
      originalPrice: number | null;
      isOnSale: boolean;
      productName: string;
      productSlug: string;
      unitPrice: string | null;
      freshness: "fresh" | "recent" | "stale";
      scrapedAt: Date;
    };

    const allCandidates: PriceCandidate[] = [];

    // Add main product prices
    for (const p of product.prices) {
      allCandidates.push({
        storeName: p.store.name,
        storeSlug: p.store.slug,
        storeColor: p.store.color,
        price: Number(p.price),
        originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
        isOnSale: p.isOnSale,
        productName: product.name,
        productSlug: product.slug,
        unitPrice: p.unitPrice && p.unitPriceUnit
          ? `${Number(p.unitPrice).toFixed(2)}/${p.unitPriceUnit}`
          : null,
        freshness: getFreshness(p.scrapedAt),
        scrapedAt: p.scrapedAt,
      });
    }

    // Fetch siblings if we have a familySlug (reuse already-fetched siblings data)
    let otherTiers: Array<{
      tierLabel: string;
      cheapestPrice: number;
      cheapestStore: string;
      productSlug: string;
    }> = [];

    if (product.familySlug) {
      const siblingProducts = await prisma.product.findMany({
        where: {
          familySlug: product.familySlug,
          isActive: true,
          id: { not: product.id },
        },
        include: {
          prices: {
            where: { isLatest: true },
            include: { store: true },
          },
        },
      });

      for (const sib of siblingProducts) {
        const sibTier = getSizeTier(sib.weight, sib.weightUnit, sib.name);
        if (sibTier === mainTier) {
          // Same tier — include as price candidate
          for (const p of sib.prices) {
            allCandidates.push({
              storeName: p.store.name,
              storeSlug: p.store.slug,
              storeColor: p.store.color,
              price: Number(p.price),
              originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
              isOnSale: p.isOnSale,
              productName: sib.name,
              productSlug: sib.slug,
              unitPrice: p.unitPrice && p.unitPriceUnit
                ? `${Number(p.unitPrice).toFixed(2)}/${p.unitPriceUnit}`
                : null,
              freshness: getFreshness(p.scrapedAt),
              scrapedAt: p.scrapedAt,
            });
          }
        }
      }

      // ─── Build otherTiers: group non-main-tier siblings by tier ───
      const tierMap = new Map<SizeTier, {
        tierLabel: string;
        cheapestPrice: number;
        cheapestStore: string;
        productSlug: string;
      }>();

      for (const sib of siblingProducts) {
        const sibTier = getSizeTier(sib.weight, sib.weightUnit, sib.name);
        if (sibTier === mainTier) continue; // skip same tier
        for (const p of sib.prices) {
          const price = Number(p.price);
          const existing = tierMap.get(sibTier);
          if (!existing || price < existing.cheapestPrice) {
            tierMap.set(sibTier, {
              tierLabel: getSizeTierLabel(sibTier),
              cheapestPrice: price,
              cheapestStore: p.store.name,
              productSlug: sib.slug,
            });
          }
        }
      }

      otherTiers = Array.from(tierMap.values());
      // Sort tiers in logical size order
      const tierOrder: SizeTier[] = ['single-serve', 'small', 'regular', 'large', 'multipack'];
      otherTiers.sort((a, b) => {
        const aIdx = tierOrder.indexOf(a.tierLabel.toLowerCase().replace(' ', '-') as SizeTier);
        const bIdx = tierOrder.indexOf(b.tierLabel.toLowerCase().replace(' ', '-') as SizeTier);
        return aIdx - bIdx;
      });
    }

    // Pick the cheapest price per store from allCandidates
    const storeMap = new Map<string, PriceCandidate>();
    for (const c of allCandidates) {
      const existing = storeMap.get(c.storeSlug);
      if (!existing || c.price < existing.price) {
        storeMap.set(c.storeSlug, c);
      }
    }

    const storeComparison = Array.from(storeMap.values())
      .sort((a, b) => a.price - b.price)
      .map((c) => ({
        storeName: c.storeName,
        storeSlug: c.storeSlug,
        storeColor: c.storeColor,
        price: c.price,
        originalPrice: c.originalPrice,
        isOnSale: c.isOnSale,
        productName: c.productName,
        productSlug: c.productSlug,
        unitPrice: c.unitPrice,
        freshness: c.freshness,
      }));

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
        freshness: getFreshness(p.scrapedAt),
        sourceUrl: p.sourceUrl,
        store: p.store,
      })),
      overallFreshness,
      averageRating: averageRating ? Math.round(averageRating * 10) / 10 : null,
      reviewCount,
      reviews,
      priceHistory: priceHistory.map((p) => ({
        price: Number(p.price),
        originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
        isOnSale: p.isOnSale,
        scrapedAt: p.scrapedAt,
        store: p.store,
      })),
      priceTrend,
      sizeTier: getSizeTierLabel(mainTier),
      storeComparison,
      otherTiers,
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
