import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { searchParamsSchema } from "@/lib/validators";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const groupByFamily = searchParams.get("group") === "family";

    const parsed = searchParamsSchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      store: searchParams.get("store") ?? undefined,
      minPrice: searchParams.get("minPrice") ?? undefined,
      maxPrice: searchParams.get("maxPrice") ?? undefined,
      onSaleOnly: searchParams.get("onSaleOnly") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { q, category, onSaleOnly, sortBy, page, limit } = parsed.data;

    // Build where clause
    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.category = { slug: category };
    }

    if (onSaleOnly) {
      where.prices = {
        some: { isLatest: true, isOnSale: true },
      };
    }

    // ─── Family-grouped mode ──────────────────────────────
    if (groupByFamily) {
      return handleFamilyGrouped(where, q, sortBy, page, limit);
    }

    // ─── Standard individual product mode ─────────────────
    const skip = (page - 1) * limit;
    let orderBy: Prisma.ProductOrderByWithRelationInput = { name: "asc" };
    if (sortBy === "name") {
      orderBy = { name: "asc" };
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          prices: {
            where: { isLatest: true },
            include: {
              store: {
                select: {
                  id: true, name: true, slug: true,
                  logoUrl: true, color: true, websiteUrl: true,
                },
              },
            },
            orderBy: { price: "asc" },
          },
        },
      }),
    ]);

    const data = products.map((product) => {
      const latestPrices = product.prices;
      const priceValues = latestPrices.map((p) => Number(p.price));
      const minPrice = priceValues.length > 0 ? Math.min(...priceValues) : null;
      const maxPrice = priceValues.length > 0 ? Math.max(...priceValues) : null;
      const cheapest = latestPrices[0] ?? null;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        brand: product.brand,
        imageUrl: product.imageUrl,
        weight: product.weight,
        weightUnit: product.weightUnit,
        category: product.category,
        minPrice,
        maxPrice,
        cheapestStore: cheapest
          ? {
              store: cheapest.store,
              price: Number(cheapest.price),
              originalPrice: cheapest.originalPrice
                ? Number(cheapest.originalPrice)
                : null,
              isOnSale: cheapest.isOnSale,
            }
          : null,
        priceCount: latestPrices.length,
      };
    });

    if (sortBy === "price_asc") {
      data.sort((a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity));
    } else if (sortBy === "price_desc") {
      data.sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0));
    }

    const totalPages = Math.ceil(total / limit);
    return NextResponse.json({ data, total, page, limit, totalPages });
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Family-grouped search: returns one result per product family.
 * Each result aggregates all sizes/stores for that family.
 */
async function handleFamilyGrouped(
  where: Prisma.ProductWhereInput,
  q: string | undefined,
  sortBy: string | undefined,
  page: number,
  limit: number
) {
  // Fetch ALL matching products with their prices (we'll group in JS)
  const products = await prisma.product.findMany({
    where,
    include: {
      category: { select: { id: true, name: true, slug: true } },
      prices: {
        where: { isLatest: true },
        include: {
          store: {
            select: {
              id: true, name: true, slug: true, color: true,
            },
          },
        },
        orderBy: { price: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  // Group by familySlug
  const familyMap = new Map<
    string,
    {
      familySlug: string;
      products: typeof products;
    }
  >();

  for (const product of products) {
    const fSlug = product.familySlug || product.slug;
    if (!familyMap.has(fSlug)) {
      familyMap.set(fSlug, { familySlug: fSlug, products: [] });
    }
    familyMap.get(fSlug)!.products.push(product);
  }

  // Build family results
  const families = [...familyMap.values()].map((family) => {
    const allPrices = family.products.flatMap((p) => p.prices);
    const priceValues = allPrices.map((p) => Number(p.price));
    const unitPrices = allPrices
      .filter((p) => p.unitPrice != null)
      .map((p) => ({
        unitPrice: Number(p.unitPrice),
        unitPriceUnit: p.unitPriceUnit,
        storeName: p.store.name,
        storeSlug: p.store.slug,
      }));

    const stores = new Map<string, { name: string; slug: string; color: string | null }>();
    for (const p of allPrices) {
      stores.set(p.store.slug, p.store);
    }

    const minPrice = priceValues.length > 0 ? Math.min(...priceValues) : null;
    const maxPrice = priceValues.length > 0 ? Math.max(...priceValues) : null;

    // Best unit price
    const bestUnit = unitPrices.length > 0
      ? unitPrices.reduce((best, curr) =>
          curr.unitPrice < best.unitPrice ? curr : best
        )
      : null;

    // Pick representative product: the one with the lowest price
    const cheapestProduct = family.products.reduce((best, curr) => {
      const bestPrice = best.prices[0] ? Number(best.prices[0].price) : Infinity;
      const currPrice = curr.prices[0] ? Number(curr.prices[0].price) : Infinity;
      return currPrice < bestPrice ? curr : best;
    });

    // Build a family display name (the base name without weight)
    // Use the shortest product name as the family name
    const familyName = family.products
      .map((p) => p.name.replace(/\s+\d+(?:\.\d+)?(?:g|kg|ml|l|cl|pk|pack|ltr|litre|litres)\b/gi, "").trim())
      .reduce((shortest, name) => name.length < shortest.length ? name : shortest);

    // Check if any product is on sale
    const hasOnSale = allPrices.some((p) => p.isOnSale);

    return {
      familySlug: family.familySlug,
      familyName,
      slug: cheapestProduct.slug, // link to cheapest variant
      imageUrl: cheapestProduct.imageUrl || family.products.find((p) => p.imageUrl)?.imageUrl || null,
      category: cheapestProduct.category,
      brand: cheapestProduct.brand,
      optionCount: allPrices.length,
      productCount: family.products.length,
      storeCount: stores.size,
      stores: [...stores.values()],
      minPrice,
      maxPrice,
      bestUnitPrice: bestUnit?.unitPrice ?? null,
      bestUnitPriceUnit: bestUnit?.unitPriceUnit ?? null,
      bestUnitStore: bestUnit?.storeName ?? null,
      isOnSale: hasOnSale,
    };
  });

  // Sort
  if (sortBy === "price_asc") {
    families.sort((a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity));
  } else if (sortBy === "price_desc") {
    families.sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0));
  } else {
    // Default: sort by relevance (number of stores desc, then name)
    families.sort((a, b) => {
      if (a.storeCount !== b.storeCount) return b.storeCount - a.storeCount;
      return a.familyName.localeCompare(b.familyName);
    });
  }

  // Paginate
  const total = families.length;
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;
  const paged = families.slice(skip, skip + limit);

  return NextResponse.json({
    data: paged,
    total,
    page,
    limit,
    totalPages,
    grouped: true,
  });
}
