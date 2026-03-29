import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { searchParamsSchema } from "@/lib/validators";
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
 * Family-grouped search: returns one result per product family.
 * Uses database-level GROUP BY instead of loading all products into memory.
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

  // Determine ORDER BY
  let orderByClause: string;
  if (sortBy === "price_asc") {
    orderByClause = `MIN(pr.price::numeric) ASC NULLS LAST, family_name ASC`;
  } else if (sortBy === "price_desc") {
    orderByClause = `MAX(pr.price::numeric) DESC NULLS LAST, family_name ASC`;
  } else {
    orderByClause = `store_count DESC, family_name ASC`;
  }

  const offset = (page - 1) * limit;

  // Count total families
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

  // Main grouped query
  const dataQuery = `
    SELECT
      p."familySlug" as family_slug,
      MIN(p.name) as family_name,
      MIN(p.slug) as slug,
      MIN(p."imageUrl") as image_url,
      MIN(p.brand) as brand,
      COUNT(DISTINCT pr."storeId") as store_count,
      COUNT(*) as option_count,
      COUNT(DISTINCT p.id) as product_count,
      MIN(pr.price::numeric) as min_price,
      MAX(pr.price::numeric) as max_price,
      bool_or(pr."isOnSale") as is_on_sale,
      MIN(pr."unitPrice"::numeric) as best_unit_price,
      (ARRAY_AGG(pr."unitPriceUnit" ORDER BY pr."unitPrice" ASC NULLS LAST))[1] as best_unit_price_unit,
      (ARRAY_AGG(s.name ORDER BY pr."unitPrice" ASC NULLS LAST))[1] as best_unit_store,
      (ARRAY_AGG(p.id ORDER BY pr.price ASC))[1] as cheapest_product_id,
      (ARRAY_AGG(p.slug ORDER BY pr.price ASC))[1] as cheapest_product_slug,
      (ARRAY_AGG(p.weight ORDER BY pr.price ASC))[1] as cheapest_weight,
      (ARRAY_AGG(p."weightUnit" ORDER BY pr.price ASC))[1] as cheapest_weight_unit
    FROM "Product" p
    JOIN "Price" pr ON pr."productId" = p.id AND pr."isLatest" = true
    JOIN "Store" s ON s.id = pr."storeId"
    LEFT JOIN "Category" c ON c.id = p."categoryId"
    WHERE ${whereClause}
    GROUP BY p."familySlug"
    ORDER BY ${orderByClause}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const dataParams = [...params, limit, offset];

  // Run count and data queries in parallel
  const [countResult, families] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{ total: bigint }>>(countQuery, ...params),
    prisma.$queryRawUnsafe<
      Array<{
        family_slug: string;
        family_name: string;
        slug: string;
        image_url: string | null;
        brand: string | null;
        store_count: bigint;
        option_count: bigint;
        product_count: bigint;
        min_price: number | null;
        max_price: number | null;
        is_on_sale: boolean;
        best_unit_price: number | null;
        best_unit_price_unit: string | null;
        best_unit_store: string | null;
        cheapest_product_id: string | null;
        cheapest_product_slug: string | null;
        cheapest_weight: number | null;
        cheapest_weight_unit: string | null;
      }>
    >(dataQuery, ...dataParams),
  ]);

  const total = Number(countResult[0]?.total ?? 0);
  const totalPages = Math.ceil(total / limit);

  // Fetch stores for the current page families only (not all families)
  const familySlugs = families.map((f) => f.family_slug);
  let storesByFamily = new Map<
    string,
    Array<{ name: string; slug: string; color: string | null }>
  >();

  if (familySlugs.length > 0) {
    const storeQuery = `
      SELECT DISTINCT
        p."familySlug" as family_slug,
        s.name,
        s.slug,
        s.color
      FROM "Product" p
      JOIN "Price" pr ON pr."productId" = p.id AND pr."isLatest" = true
      JOIN "Store" s ON s.id = pr."storeId"
      WHERE p."familySlug" = ANY($1) AND p."isActive" = true
      ORDER BY p."familySlug", s.name
    `;

    const storeRows = await prisma.$queryRawUnsafe<
      Array<{
        family_slug: string;
        name: string;
        slug: string;
        color: string | null;
      }>
    >(storeQuery, familySlugs);

    for (const row of storeRows) {
      if (!storesByFamily.has(row.family_slug)) {
        storesByFamily.set(row.family_slug, []);
      }
      storesByFamily.get(row.family_slug)!.push({
        name: row.name,
        slug: row.slug,
        color: row.color,
      });
    }
  }

  const data = families.map((f) => ({
    familySlug: f.family_slug,
    familyName: f.family_name,
    slug: f.slug,
    imageUrl: f.image_url,
    brand: f.brand,
    optionCount: Number(f.option_count),
    productCount: Number(f.product_count),
    storeCount: Number(f.store_count),
    stores: storesByFamily.get(f.family_slug) ?? [],
    minPrice: f.min_price != null ? Number(f.min_price) : null,
    maxPrice: f.max_price != null ? Number(f.max_price) : null,
    bestUnitPrice: f.best_unit_price != null ? Number(f.best_unit_price) : null,
    bestUnitPriceUnit: f.best_unit_price_unit,
    bestUnitStore: f.best_unit_store,
    isOnSale: f.is_on_sale,
    cheapestProductId: f.cheapest_product_id,
    cheapestProductSlug: f.cheapest_product_slug,
    cheapestWeight: f.cheapest_weight != null ? Number(f.cheapest_weight) : null,
    cheapestWeightUnit: f.cheapest_weight_unit,
  }));

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    totalPages,
    grouped: true,
  });
}
