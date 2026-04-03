import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { searchParamsSchema } from "@/lib/validators";
import { getSizeTier, getSizeTierLabel } from "@/lib/scraper/matcher";
import type { SizeTier } from "@/lib/scraper/matcher";
import type { Prisma } from "@prisma/client";

// Simple in-memory rate limiter (per serverless instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    rateLimitMap.set(ip, { count: 1, resetAt });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt };
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count, resetAt: entry.resetAt };
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting by IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimit = checkRateLimit(ip);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

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
        { error: "Invalid query parameters" },
        { status: 400 }
      );
    }

    const { q, category, store, onSaleOnly, sortBy, page, limit } = parsed.data;

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

    // Support comma-separated store slugs (e.g., "tesco,aldi,lidl")
    const storeSlugs = store ? store.split(",").map((s) => s.trim()).filter(Boolean) : [];

    if (storeSlugs.length > 0) {
      where.prices = {
        some: {
          isLatest: true,
          store: { slug: { in: storeSlugs } },
          ...(onSaleOnly ? { isOnSale: true } : {}),
        },
      };
    } else if (onSaleOnly) {
      where.prices = {
        some: { isLatest: true, isOnSale: true },
      };
    }

    // ─── Family-grouped mode ──────────────────────────────
    if (groupByFamily) {
      return handleFamilyGrouped(q, category, store, onSaleOnly, sortBy, page, limit);
    }

    // ─── Standard individual product mode ─────────────────
    const skip = (page - 1) * limit;
    const isPriceSort = sortBy === "price_asc" || sortBy === "price_desc";

    let total: number;
    let products: Awaited<ReturnType<typeof prisma.product.findMany<{
      include: {
        category: { select: { id: true; name: true; slug: true } };
        prices: {
          where: { isLatest: true };
          include: {
            store: {
              select: {
                id: true; name: true; slug: true;
                logoUrl: true; color: true; websiteUrl: true;
              };
            };
          };
          orderBy: { price: "asc" };
        };
      };
    }>>>;

    if (isPriceSort) {
      // Price sorting: use raw SQL to get correctly ordered+paginated product IDs
      const conditions: string[] = [`p."isActive" = true`];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (q) {
        conditions.push(
          `(p.name ILIKE $${paramIndex} OR p.brand ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`
        );
        params.push(`%${q}%`);
        paramIndex++;
      }

      if (category) {
        conditions.push(`c.slug = $${paramIndex}`);
        params.push(category);
        paramIndex++;
      }

      if (storeSlugs.length > 0) {
        conditions.push(`s.slug = ANY($${paramIndex})`);
        params.push(storeSlugs);
        paramIndex++;
      }

      if (onSaleOnly) {
        conditions.push(`pr."isOnSale" = true`);
      }

      const whereSQL = conditions.join(" AND ");
      const direction = sortBy === "price_asc" ? "ASC" : "DESC";

      // Count total matching products
      const countQuery = `
        SELECT COUNT(DISTINCT p.id)::int as total
        FROM "Product" p
        LEFT JOIN "Category" c ON c.id = p."categoryId"
        LEFT JOIN "Price" pr ON pr."productId" = p.id AND pr."isLatest" = true
        LEFT JOIN "Store" s ON s.id = pr."storeId"
        WHERE ${whereSQL}
      `;

      // Get ordered product IDs with price-based sorting at the DB level
      const idsQuery = `
        SELECT p.id, MIN(pr.price::numeric) as min_price
        FROM "Product" p
        LEFT JOIN "Category" c ON c.id = p."categoryId"
        LEFT JOIN "Price" pr ON pr."productId" = p.id AND pr."isLatest" = true
        LEFT JOIN "Store" s ON s.id = pr."storeId"
        WHERE ${whereSQL}
        GROUP BY p.id
        ORDER BY min_price ${direction} NULLS LAST, p.name ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const [countResult, idRows] = await Promise.all([
        prisma.$queryRawUnsafe<[{ total: number }]>(countQuery, ...params),
        prisma.$queryRawUnsafe<Array<{ id: string; min_price: number | null }>>(
          idsQuery, ...params, limit, skip
        ),
      ]);

      total = countResult[0]?.total ?? 0;
      const orderedIds = idRows.map((r) => r.id);

      if (orderedIds.length > 0) {
        // Fetch full product data for the ordered IDs
        const unorderedProducts = await prisma.product.findMany({
          where: { id: { in: orderedIds } },
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
        });

        // Re-sort to match the SQL ordering
        const idOrder = new Map(orderedIds.map((id, idx) => [id, idx]));
        products = unorderedProducts.sort(
          (a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0)
        );
      } else {
        products = [];
      }
    } else {
      // Non-price sorting: use standard Prisma query
      let orderBy: Prisma.ProductOrderByWithRelationInput = { name: "asc" };
      if (sortBy === "name") {
        orderBy = { name: "asc" };
      }

      const [countResult, productResult] = await Promise.all([
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

      total = countResult;
      products = productResult;
    }

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
 * Family-grouped search: returns one result per product family + size tier.
 * First uses DB-level GROUP BY for family pagination, then fetches all products
 * for those families and sub-groups by computed size tier in JS.
 */
async function handleFamilyGrouped(
  q: string | undefined,
  category: string | undefined,
  store: string | undefined,
  onSaleOnly: boolean | undefined,
  sortBy: string | undefined,
  page: number,
  limit: number
) {
  // Build dynamic WHERE clauses and params
  const conditions: string[] = [
    `p."isActive" = true`,
    `p."familySlug" IS NOT NULL`,
  ];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (q) {
    conditions.push(
      `(p.name ILIKE $${paramIndex} OR p.brand ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`
    );
    params.push(`%${q}%`);
    paramIndex++;
  }

  if (category) {
    conditions.push(`c.slug = $${paramIndex}`);
    params.push(category);
    paramIndex++;
  }

  // Support comma-separated store slugs
  const storeSlugs = store ? store.split(",").map((s) => s.trim()).filter(Boolean) : [];
  if (storeSlugs.length > 0) {
    conditions.push(`s.slug = ANY($${paramIndex})`);
    params.push(storeSlugs);
    paramIndex++;
  }

  if (onSaleOnly) {
    conditions.push(`pr."isOnSale" = true`);
  }

  const whereClause = conditions.join(" AND ");

  // Determine ORDER BY (at the family level for pagination)
  let orderByClause: string;
  if (sortBy === "price_asc") {
    orderByClause = `MIN(pr.price::numeric) ASC NULLS LAST, family_name ASC`;
  } else if (sortBy === "price_desc") {
    orderByClause = `MAX(pr.price::numeric) DESC NULLS LAST, family_name ASC`;
  } else if (sortBy === "savings_desc") {
    orderByClause = `MAX(COALESCE(pr."originalPrice"::numeric, 0) - pr.price::numeric) DESC NULLS LAST, family_name ASC`;
  } else {
    orderByClause = `store_count DESC, family_name ASC`;
  }

  const offset = (page - 1) * limit;

  // Count total families (pagination is still at the family level)
  const countQuery = `
    SELECT COUNT(*) as total FROM (
      SELECT p."familySlug"
      FROM "Product" p
      JOIN "Price" pr ON pr."productId" = p.id AND pr."isLatest" = true
      JOIN "Store" s ON s.id = pr."storeId"
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      WHERE ${whereClause}
      GROUP BY p."familySlug"
    ) sub
  `;

  // Get paginated family slugs
  const familyPageQuery = `
    SELECT
      p."familySlug" as family_slug,
      MIN(p.name) as family_name,
      COUNT(DISTINCT pr."storeId") as store_count,
      MAX(pr."scrapedAt") as latest_scraped_at
    FROM "Product" p
    JOIN "Price" pr ON pr."productId" = p.id AND pr."isLatest" = true
    JOIN "Store" s ON s.id = pr."storeId"
    LEFT JOIN "Category" c ON c.id = p."categoryId"
    WHERE ${whereClause}
    GROUP BY p."familySlug"
    ORDER BY ${orderByClause}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const familyPageParams = [...params, limit, offset];

  const [countResult, familyPage] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{ total: bigint }>>(countQuery, ...params),
    prisma.$queryRawUnsafe<
      Array<{
        family_slug: string;
        family_name: string;
        store_count: bigint;
        latest_scraped_at: Date | null;
      }>
    >(familyPageQuery, ...familyPageParams),
  ]);

  const total = Number(countResult[0]?.total ?? 0);
  const totalPages = Math.ceil(total / limit);
  const familySlugs = familyPage.map((f) => f.family_slug);

  if (familySlugs.length === 0) {
    return NextResponse.json({
      data: [],
      total,
      page,
      limit,
      totalPages,
      grouped: true,
      lastUpdated: null,
    });
  }

  // Fetch ALL products + prices for these families to compute size tiers in JS
  const productsQuery = `
    SELECT
      p.id,
      p.name,
      p.slug,
      p."familySlug" as family_slug,
      p.weight,
      p."weightUnit" as weight_unit,
      p."imageUrl" as image_url,
      p.brand,
      pr.price::numeric as price,
      pr."originalPrice"::numeric as original_price,
      pr."isOnSale" as is_on_sale,
      pr."unitPrice"::numeric as unit_price,
      pr."unitPriceUnit" as unit_price_unit,
      pr."scrapedAt" as scraped_at,
      s.name as store_name,
      s.slug as store_slug,
      s.color as store_color
    FROM "Product" p
    JOIN "Price" pr ON pr."productId" = p.id AND pr."isLatest" = true
    JOIN "Store" s ON s.id = pr."storeId"
    WHERE p."familySlug" = ANY($1) AND p."isActive" = true
    ORDER BY p."familySlug", pr.price ASC
  `;

  const productRows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      name: string;
      slug: string;
      family_slug: string;
      weight: number | null;
      weight_unit: string | null;
      image_url: string | null;
      brand: string | null;
      price: number;
      original_price: number | null;
      is_on_sale: boolean;
      unit_price: number | null;
      unit_price_unit: string | null;
      scraped_at: Date;
      store_name: string;
      store_slug: string;
      store_color: string | null;
    }>
  >(productsQuery, familySlugs);

  // Group products by familySlug + sizeTier
  type TierGroupKey = string; // "familySlug::sizeTier"
  interface TierGroup {
    familySlug: string;
    familyName: string;
    sizeTier: SizeTier;
    sizeTierLabel: string;
    products: typeof productRows;
  }

  const tierGroups = new Map<TierGroupKey, TierGroup>();

  // Build a lookup from the family page data for canonical names
  const familyNameMap = new Map<string, string>();
  for (const f of familyPage) {
    familyNameMap.set(f.family_slug, f.family_name);
  }

  for (const row of productRows) {
    const tier = getSizeTier(row.weight, row.weight_unit, row.name);
    const key = `${row.family_slug}::${tier}`;

    if (!tierGroups.has(key)) {
      tierGroups.set(key, {
        familySlug: row.family_slug,
        familyName: familyNameMap.get(row.family_slug) ?? row.name,
        sizeTier: tier,
        sizeTierLabel: getSizeTierLabel(tier),
        products: [],
      });
    }
    tierGroups.get(key)!.products.push(row);
  }

  // Build the response: one entry per family+tier, ordered by family order then tier order
  const TIER_ORDER: Record<SizeTier, number> = {
    'single-serve': 0,
    'small': 1,
    'regular': 2,
    'large': 3,
    'multipack': 4,
  };

  // Preserve the original family ordering from the paginated query
  const familyOrder = new Map(familySlugs.map((slug, idx) => [slug, idx]));

  const sortedGroups = Array.from(tierGroups.values()).sort((a, b) => {
    const familyDiff = (familyOrder.get(a.familySlug) ?? 0) - (familyOrder.get(b.familySlug) ?? 0);
    if (familyDiff !== 0) return familyDiff;
    return TIER_ORDER[a.sizeTier] - TIER_ORDER[b.sizeTier];
  });

  const data = sortedGroups.map((group) => {
    const products = group.products;
    // Products are already sorted by price ASC from the SQL query
    const cheapest = products[0];
    const uniqueStores = new Set(products.map((p) => p.store_slug));

    // Compute savings: find the product with biggest discount
    let savingsAmount: number | null = null;
    let savingsPercent: number | null = null;
    let salePrice: number | null = null;
    let originalPrice: number | null = null;
    let dealStore: string | null = null;
    let dealStoreSlug: string | null = null;

    for (const p of products) {
      if (p.original_price != null && p.is_on_sale) {
        const saving = Number(p.original_price) - Number(p.price);
        if (savingsAmount === null || saving > savingsAmount) {
          savingsAmount = saving;
          salePrice = Number(p.price);
          originalPrice = Number(p.original_price);
          dealStore = p.store_name;
          dealStoreSlug = p.store_slug;
          savingsPercent = originalPrice > 0
            ? Math.round((savingsAmount / originalPrice) * 100)
            : null;
        }
      }
    }

    // Build products array for this tier
    const tierProducts = products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      weight: p.weight != null ? String(p.weight) : null,
      weightUnit: p.weight_unit,
      storeName: p.store_name,
      storeSlug: p.store_slug,
      price: Number(p.price),
      originalPrice: p.original_price != null ? Number(p.original_price) : null,
      isOnSale: p.is_on_sale,
      unitPrice: p.unit_price != null ? String(p.unit_price) : null,
      imageUrl: p.image_url,
    }));

    // Best unit price in this tier
    const withUnitPrice = products.filter((p) => p.unit_price != null);
    const bestUnitRow = withUnitPrice.length > 0
      ? withUnitPrice.reduce((best, p) =>
          Number(p.unit_price) < Number(best.unit_price) ? p : best
        )
      : null;

    return {
      familySlug: group.familySlug,
      familyName: group.familyName,
      sizeTier: group.sizeTier,
      sizeTierLabel: group.sizeTierLabel,
      slug: cheapest.slug,
      imageUrl: cheapest.image_url,
      brand: cheapest.brand,
      optionCount: products.length,
      productCount: new Set(products.map((p) => p.id)).size,
      storeCount: uniqueStores.size,
      stores: Array.from(
        new Map(
          products.map((p) => [p.store_slug, { name: p.store_name, slug: p.store_slug, color: p.store_color }])
        ).values()
      ).sort((a, b) => a.name.localeCompare(b.name)),
      minPrice: Number(cheapest.price),
      maxPrice: Number(products[products.length - 1].price),
      bestUnitPrice: bestUnitRow ? Number(bestUnitRow.unit_price) : null,
      bestUnitPriceUnit: bestUnitRow?.unit_price_unit ?? null,
      bestUnitStore: bestUnitRow?.store_name ?? null,
      isOnSale: products.some((p) => p.is_on_sale),
      cheapestProductId: cheapest.id,
      cheapestProductSlug: cheapest.slug,
      cheapestProductName: cheapest.name,
      cheapestPrice: Number(cheapest.price),
      cheapestStore: cheapest.store_name,
      cheapestStoreSlug: cheapest.store_slug,
      cheapestWeight: cheapest.weight != null ? Number(cheapest.weight) : null,
      cheapestWeightUnit: cheapest.weight_unit,
      // Deal-specific fields
      savingsAmount,
      savingsPercent,
      salePrice,
      originalPrice,
      dealStore,
      dealStoreSlug,
      // All products in this family+tier
      products: tierProducts,
    };
  });

  // Compute the most recent scraped time across all results
  const newestScrapedAt = familyPage.reduce((latest, f) => {
    if (f.latest_scraped_at) {
      const t = new Date(f.latest_scraped_at).getTime();
      return t > latest ? t : latest;
    }
    return latest;
  }, 0);

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    totalPages,
    grouped: true,
    lastUpdated: newestScrapedAt > 0 ? new Date(newestScrapedAt).toISOString() : null,
  });
}
