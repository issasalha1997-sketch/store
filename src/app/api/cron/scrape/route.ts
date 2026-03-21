import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/cron/scrape
 *
 * Returns the status of recent scrape runs.
 * Can be used by Vercel Cron, external schedulers, or monitoring dashboards.
 *
 * Protected by CRON_SECRET environment variable.
 * Pass it as: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the latest scrape run for each store
    const latestRuns = await prisma.scrapeRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
    });

    // Group by store
    const byStore: Record<string, typeof latestRuns> = {};
    for (const run of latestRuns) {
      if (!byStore[run.storeSlug]) {
        byStore[run.storeSlug] = [];
      }
      byStore[run.storeSlug].push(run);
    }

    // Summary per store
    const summary = Object.entries(byStore).map(([slug, runs]) => {
      const latest = runs[0];
      return {
        store: slug,
        lastRun: latest.startedAt,
        status: latest.status,
        productsFound: latest.productsFound,
        pricesUpdated: latest.pricesUpdated,
        errors: latest.errors,
        duration: latest.duration,
        totalRuns: runs.length,
      };
    });

    return NextResponse.json({
      status: "ok",
      stores: summary,
      recentRuns: latestRuns.slice(0, 10).map((r) => ({
        store: r.storeSlug,
        status: r.status,
        productsFound: r.productsFound,
        pricesUpdated: r.pricesUpdated,
        errors: r.errors,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        duration: r.duration,
      })),
    });
  } catch (error) {
    console.error("GET /api/cron/scrape error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
