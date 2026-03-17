import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { searchParamsSchema } from "@/lib/validators";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
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
    const skip = (page - 1) * limit;

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
        some: {
          isLatest: true,
          isOnSale: true,
        },
      };
    }

    // Determine sort order
    let orderBy: Prisma.ProductOrderByWithRelationInput = { name: "asc" };
    if (sortBy === "name") {
      orderBy = { name: "asc" };
    } else if (sortBy === "relevance" && q) {
      orderBy = { name: "asc" }; // Fallback; Prisma doesn't natively rank relevance
    }

    // Fetch total count and products in parallel
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

    // Post-query sort for price-based sorting (since prices are in a relation)
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
