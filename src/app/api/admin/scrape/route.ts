import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  scrapeStore,
  CATEGORY_MAP,
  type ScrapedProduct,
} from "@/lib/scraper/products";
import {
  canonicalProductName,
  productMatchSlug,
} from "@/lib/scraper/matcher";

// Allow up to 300 seconds on Vercel (Pro plan) or 60s (Hobby)
export const maxDuration = 300;

/**
 * GET /api/admin/scrape
 * Returns status summary for all stores with latest scrape runs.
 */
export async function GET() {
  try {
    // Clean up stuck "running" scrape runs older than 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    await prisma.scrapeRun.updateMany({
      where: {
        status: "running",
        startedAt: { lt: tenMinutesAgo },
      },
      data: {
        status: "failed",
        errorLog: "Timed out — marked as failed automatically",
        completedAt: new Date(),
      },
    });

    const stores = ["tesco", "supervalu", "dunnes", "lidl", "aldi"];

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
 * Runs the scraper inline (TypeScript-based, works on Vercel).
 * Body: { store: "tesco" | "all" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const storeParam = body.store || "all";

    const validStores = ["tesco", "supervalu", "dunnes", "lidl", "aldi", "all"];
    if (!validStores.includes(storeParam)) {
      return NextResponse.json(
        { error: `Invalid store: ${storeParam}` },
        { status: 400 }
      );
    }

    const storesToRun =
      storeParam === "all"
        ? ["tesco", "supervalu", "dunnes", "lidl", "aldi"]
        : [storeParam];

    const results = [];

    for (const storeSlug of storesToRun) {
      const startedAt = new Date();
      try {
        const result = await runStoreImport(storeSlug, startedAt);
        results.push(result);
      } catch (err) {
        const completedAt = new Date();
        const duration = Math.round(
          (completedAt.getTime() - startedAt.getTime()) / 1000
        );
        await prisma.scrapeRun.create({
          data: {
            storeSlug,
            status: "failed",
            errors: 1,
            errorLog: err instanceof Error ? err.message : String(err),
            startedAt,
            completedAt,
            duration,
          },
        });
        results.push({
          store: storeSlug,
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      message: `Scraper completed for ${storeParam}`,
      results,
    });
  } catch (error) {
    console.error("POST /api/admin/scrape error:", error);
    return NextResponse.json(
      { error: "Failed to run scraper" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Core import logic — runs inline, no Python needed                  */
/* ------------------------------------------------------------------ */

async function runStoreImport(storeSlug: string, startedAt: Date) {
  // 1. Get the store record
  const store = await prisma.store.findUnique({ where: { slug: storeSlug } });
  if (!store) {
    throw new Error(`Store '${storeSlug}' not found in database`);
  }

  // 2. Get products (attempts live scraping, falls back to curated data)
  const scrapeResult = await scrapeStore(storeSlug);
  const scrapedProducts = scrapeResult.products;
  if (scrapedProducts.length === 0) {
    throw new Error(`No product data available for ${storeSlug}`);
  }
  console.log(
    `[${storeSlug}] Using ${scrapeResult.source} data (${scrapedProducts.length} products)${scrapeResult.error ? ` — live error: ${scrapeResult.error}` : ""}`
  );

  // 3. Load categories
  const categories = await prisma.category.findMany();
  const categoryBySlug = new Map<string, string>(categories.map((c: { slug: string; id: string }) => [c.slug, c.id]));

  // 4. Process each product
  let pricesUpdated = 0;
  let errors = 0;
  const errorMessages: string[] = [];

  for (const scraped of scrapedProducts) {
    try {
      // Find or create the product
      const productId = await findOrCreateProduct(scraped, categoryBySlug);

      // Mark old prices as not latest for this store + product
      await prisma.price.updateMany({
        where: {
          productId,
          storeId: store.id,
          isLatest: true,
        },
        data: { isLatest: false },
      });

      // Insert new price
      await prisma.price.create({
        data: {
          productId,
          storeId: store.id,
          price: scraped.price,
          originalPrice: scraped.originalPrice ?? null,
          isOnSale: scraped.isOnSale ?? false,
          unitPrice: scraped.unitPrice ?? null,
          unitPriceUnit: scraped.unitPriceUnit ?? null,
          currency: "EUR",
          isLatest: true,
          scrapedAt: new Date(),
        },
      });

      pricesUpdated++;
    } catch (err) {
      errors++;
      errorMessages.push(
        `${scraped.name}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // 5. Record the scrape run
  const completedAt = new Date();
  const duration = Math.round(
    (completedAt.getTime() - startedAt.getTime()) / 1000
  );

  const run = await prisma.scrapeRun.create({
    data: {
      storeSlug,
      status: errors > 0 && pricesUpdated === 0 ? "failed" : "completed",
      productsFound: scrapedProducts.length,
      pricesUpdated,
      errors,
      errorLog: errorMessages.length > 0 ? errorMessages.join("\n") : null,
      startedAt,
      completedAt,
      duration,
    },
  });

  return {
    store: storeSlug,
    status: run.status,
    productsFound: scrapedProducts.length,
    pricesUpdated,
    errors,
    duration,
  };
}

async function findOrCreateProduct(
  scraped: ScrapedProduct,
  categoryBySlug: Map<string, string>
): Promise<string> {
  // Use the smart matcher for cross-store product matching
  const canonical = canonicalProductName(
    scraped.name,
    scraped.weight,
    scraped.weightUnit
  );
  const matchSlug = productMatchSlug(
    scraped.name,
    scraped.weight,
    scraped.weightUnit
  );

  // Try to find existing product by slug
  const existing = await prisma.product.findUnique({
    where: { slug: matchSlug },
  });

  if (existing) {
    // Update fields if the existing product is missing data
    const updates: Record<string, unknown> = {};
    if (!existing.imageUrl && scraped.imageUrl) updates.imageUrl = scraped.imageUrl;
    if (!existing.description && scraped.description) updates.description = scraped.description;
    if (!existing.weight && scraped.weight) {
      updates.weight = scraped.weight;
      updates.weightUnit = scraped.weightUnit;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.product.update({
        where: { id: existing.id },
        data: updates,
      });
    }
    return existing.id;
  }

  // Resolve category
  let categoryId: string | undefined;
  if (scraped.category) {
    const catSlug = CATEGORY_MAP[scraped.category.toLowerCase()];
    if (catSlug) {
      categoryId = categoryBySlug.get(catSlug) ?? undefined;
    }
  }

  // Create new product — use the canonical name for display
  const product = await prisma.product.create({
    data: {
      name: canonical,
      slug: matchSlug,
      brand: scraped.brand ?? null,
      weight: scraped.weight ?? null,
      weightUnit: scraped.weightUnit ?? null,
      barcode: scraped.barcode ?? null,
      categoryId: categoryId ?? null,
      imageUrl: scraped.imageUrl ?? null,
      description: scraped.description ?? null,
      isActive: true,
    },
  });

  return product.id;
}
