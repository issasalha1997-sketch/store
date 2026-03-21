import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { spawn } from "child_process";
import path from "path";

/**
 * GET /api/admin/scrape
 * Returns status summary for all stores with latest scrape runs.
 */
export async function GET() {
  try {
    const stores = ["tesco", "supervalu", "dunnes", "lidl", "aldi"];

    // Get latest scrape run per store
    const storeStatuses = await Promise.all(
      stores.map(async (slug) => {
        const latestRun = await prisma.scrapeRun.findFirst({
          where: { storeSlug: slug },
          orderBy: { startedAt: "desc" },
        });

        const totalRuns = await prisma.scrapeRun.count({
          where: { storeSlug: slug },
        });

        const totalProducts = await prisma.price.count({
          where: {
            store: { slug },
            isLatest: true,
          },
        });

        return {
          slug,
          latestRun: latestRun
            ? {
                id: latestRun.id,
                status: latestRun.status,
                productsFound: latestRun.productsFound,
                pricesUpdated: latestRun.pricesUpdated,
                errors: latestRun.errors,
                errorLog: latestRun.errorLog,
                startedAt: latestRun.startedAt,
                completedAt: latestRun.completedAt,
                duration: latestRun.duration,
              }
            : null,
          totalRuns,
          totalProducts,
        };
      })
    );

    // Overall stats
    const totalPrices = await prisma.price.count({ where: { isLatest: true } });
    const totalAllProducts = await prisma.product.count();

    return NextResponse.json({
      stores: storeStatuses,
      overall: {
        totalProducts: totalAllProducts,
        totalActivePrices: totalPrices,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/scrape error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/scrape
 * Triggers a scraper run for a specific store or all stores.
 * Body: { store: "tesco" | "all" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const store = body.store || "all";

    const validStores = ["tesco", "supervalu", "dunnes", "lidl", "aldi", "all"];
    if (!validStores.includes(store)) {
      return NextResponse.json(
        { error: `Invalid store: ${store}` },
        { status: 400 }
      );
    }

    // Spawn the Python scraper as a background process
    const scraperDir = path.join(process.cwd(), "scraper");
    const args = ["-m", "scraper.main", "--store", store];

    const child = spawn("python3", args, {
      cwd: scraperDir,
      env: { ...process.env },
      detached: true,
      stdio: "ignore",
    });

    child.unref();

    // Create a "running" scrape run record so the UI can show it immediately
    const storesToRun = store === "all" ? ["tesco", "supervalu", "dunnes", "lidl", "aldi"] : [store];

    const runIds = await Promise.all(
      storesToRun.map(async (slug) => {
        const run = await prisma.scrapeRun.create({
          data: {
            storeSlug: slug,
            status: "running",
            startedAt: new Date(),
          },
        });
        return { store: slug, runId: run.id };
      })
    );

    return NextResponse.json({
      message: `Scraper started for ${store}`,
      runs: runIds,
      pid: child.pid,
    });
  } catch (error) {
    console.error("POST /api/admin/scrape error:", error);
    return NextResponse.json(
      { error: "Failed to start scraper" },
      { status: 500 }
    );
  }
}
