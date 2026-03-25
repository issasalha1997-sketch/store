/**
 * Import all products from all stores with proper cross-store matching.
 * Run with: npx tsx scripts/import-all.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  canonicalProductName,
  productMatchSlug,
} from "../src/lib/scraper/matcher";
import { CATEGORY_MAP } from "../src/lib/scraper/products";
import type { ScrapedProduct } from "../src/lib/scraper/products";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// We need to import the curated data and scrapers
async function getProductsForStore(storeSlug: string): Promise<{
  products: ScrapedProduct[];
  source: string;
}> {
  // Dynamic import to handle the module
  const { scrapeStore } = await import("../src/lib/scraper/products");
  return scrapeStore(storeSlug);
}

async function findOrCreateProduct(
  scraped: ScrapedProduct,
  categoryBySlug: Map<string, string>
): Promise<string> {
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

  // Try existing
  const existing = await prisma.product.findUnique({
    where: { slug: matchSlug },
  });

  if (existing) {
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

async function importStore(storeSlug: string) {
  const startedAt = new Date();
  console.log(`\n[${ storeSlug.toUpperCase() }] Starting import...`);

  // Get store record
  const store = await prisma.store.findUnique({ where: { slug: storeSlug } });
  if (!store) {
    console.log(`  ✗ Store '${storeSlug}' not found in database`);
    return;
  }

  // Get categories
  const categories = await prisma.category.findMany();
  const categoryBySlug = new Map<string, string>(
    categories.map((c: { slug: string; id: string }) => [c.slug, c.id])
  );

  // Get products (live scrape or fallback)
  const result = await getProductsForStore(storeSlug);
  console.log(`  Source: ${result.source} (${result.products.length} products)`);

  let pricesUpdated = 0;
  let errors = 0;
  let matched = 0;
  let created = 0;

  for (const scraped of result.products) {
    try {
      // Check if product already existed before this call
      const slugBefore = productMatchSlug(scraped.name, scraped.weight, scraped.weightUnit);
      const existedBefore = await prisma.product.findUnique({ where: { slug: slugBefore } });

      const productId = await findOrCreateProduct(scraped, categoryBySlug);

      if (existedBefore) matched++;
      else created++;

      // Mark old prices as not latest
      await prisma.price.updateMany({
        where: { productId, storeId: store.id, isLatest: true },
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
      if (errors <= 5) {
        console.log(`  ✗ ${scraped.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  const duration = Math.round((Date.now() - startedAt.getTime()) / 1000);
  console.log(`  ✓ ${pricesUpdated} prices added (${created} new products, ${matched} matched existing) | ${errors} errors | ${duration}s`);

  // Log scrape run
  await prisma.scrapeRun.create({
    data: {
      storeSlug,
      status: errors > 0 && pricesUpdated === 0 ? "failed" : "completed",
      productsFound: result.products.length,
      pricesUpdated,
      errors,
      startedAt,
      completedAt: new Date(),
      duration,
    },
  });
}

async function main() {
  console.log("=== Importing All Store Products ===");

  const stores = ["tesco", "dunnes", "lidl", "aldi", "supervalu"];

  for (const store of stores) {
    await importStore(store);
  }

  // Final stats
  const totalProducts = await prisma.product.count();
  const totalPrices = await prisma.price.count({ where: { isLatest: true } });

  // Count products with prices from multiple stores
  const multiStore = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) as count FROM (
      SELECT "productId" FROM "Price" WHERE "isLatest" = true
      GROUP BY "productId" HAVING COUNT(DISTINCT "storeId") >= 2
    ) sub`
  );

  console.log("\n=== Final Stats ===");
  console.log(`Total unique products: ${totalProducts}`);
  console.log(`Total active prices: ${totalPrices}`);
  console.log(`Products with 2+ stores: ${multiStore[0]?.count ?? 0}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
