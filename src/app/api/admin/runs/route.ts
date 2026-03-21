import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/runs
 * Returns scrape run history with filtering.
 * Query params:
 *   - store: filter by store slug
 *   - limit: number of runs (default 50)
 *   - status: filter by status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const store = searchParams.get("store");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const where: Record<string, unknown> = {};
    if (store) where.storeSlug = store;
    if (status) where.status = status;

    const runs = await prisma.scrapeRun.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: Math.min(limit, 200),
    });

    // Aggregate stats
    const stats = await prisma.scrapeRun.aggregate({
      where,
      _sum: {
        productsFound: true,
        pricesUpdated: true,
        errors: true,
      },
      _avg: {
        duration: true,
        productsFound: true,
        pricesUpdated: true,
      },
      _count: true,
    });

    return NextResponse.json({
      runs: runs.map((r) => ({
        id: r.id,
        storeSlug: r.storeSlug,
        status: r.status,
        productsFound: r.productsFound,
        pricesUpdated: r.pricesUpdated,
        errors: r.errors,
        errorLog: r.errorLog,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        duration: r.duration,
      })),
      stats: {
        totalRuns: stats._count,
        totalProductsFound: stats._sum.productsFound || 0,
        totalPricesUpdated: stats._sum.pricesUpdated || 0,
        totalErrors: stats._sum.errors || 0,
        avgDuration: Math.round(stats._avg.duration || 0),
        avgProductsFound: Math.round(stats._avg.productsFound || 0),
        avgPricesUpdated: Math.round(stats._avg.pricesUpdated || 0),
      },
    });
  } catch (error) {
    console.error("GET /api/admin/runs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
