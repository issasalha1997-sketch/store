/**
 * Scraper that writes to STAGING tables instead of live Product/Price tables.
 * Admin reviews the batch and approves before data goes live.
 *
 * Usage:
 *   npx tsx scripts/scrape-to-staging.ts              # all stores
 *   npx tsx scripts/scrape-to-staging.ts supervalu     # SuperValu only
 *   npx tsx scripts/scrape-to-staging.ts tesco         # Tesco only
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  canonicalProductName,
  productMatchSlug,
} from "../src/lib/scraper/matcher";
import { scrapeAldiLive } from "../src/lib/scraper/aldi";
import { scrapeTescoLive } from "../src/lib/scraper/tesco";
import type { ScrapedProduct } from "../src/lib/scraper/products";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Mi9 API helpers (SuperValu & Dunnes) ────────────────

interface Mi9Product {
  sku: string;
  name: string;
  description?: string;
  brand?: string;
  priceNumeric: number;
  pricePerUnit?: string;
  unitOfSize?: { abbreviation: string; type: string; size: number };
  image?: { default?: string; cell?: string };
  tprPrice?: unknown;
}

async function fetchMi9Page(
  apiBase: string,
  storeId: string,
  categoryId: string,
  take: number,
  skip: number
): Promise<{ total: number; items: Mi9Product[] }> {
  const url = `${apiBase}/stores/${storeId}/categories/${categoryId}/search?take=${take}&skip=${skip}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "application/json",
      "Accept-Language": "en-IE,en;q=0.9",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${url}`);
  return res.json();
}

function parseMi9Product(item: Mi9Product): ScrapedProduct {
  const tpr = typeof item.tprPrice === "number" ? item.tprPrice : null;
  const isOnSale = tpr != null && tpr > 0 && tpr < item.priceNumeric;
  const price = isOnSale && tpr ? tpr : item.priceNumeric;

  let unitPrice: number | undefined;
  let unitPriceUnit: string | undefined;
  if (item.pricePerUnit) {
    const m = item.pricePerUnit.match(/€([\d.]+)\/([\w]+)/);
    if (m) {
      unitPrice = parseFloat(m[1]);
      unitPriceUnit = m[2];
    }
  }

  return {
    name: item.name,
    price,
    originalPrice: isOnSale ? item.priceNumeric : undefined,
    isOnSale,
    brand: item.brand || undefined,
    imageUrl: item.image?.default || item.image?.cell || undefined,
    unitPrice,
    unitPriceUnit,
    description: item.description || undefined,
    weight: item.unitOfSize?.size || undefined,
    weightUnit: item.unitOfSize?.abbreviation || undefined,
    barcode: item.sku || undefined,
  };
}

interface StoreConfig {
  slug: string;
  apiBase: string;
  storeId: string;
  categories: Array<{ id: string; name: string; mapped: string }>;
  maxPerCategory: number;
}

async function scrapeMi9Store(config: StoreConfig): Promise<ScrapedProduct[]> {
  const all: ScrapedProduct[] = [];
  for (const cat of config.categories) {
    try {
      let skip = 0;
      let fetched = 0;
      while (fetched < config.maxPerCategory) {
        const take = Math.min(48, config.maxPerCategory - fetched);
        const data = await fetchMi9Page(
          config.apiBase,
          config.storeId,
          cat.id,
          take,
          skip
        );
        if (!data.items?.length) break;
        for (const item of data.items) {
          if (item.priceNumeric <= 0) continue;
          const p = parseMi9Product(item);
          p.category = cat.mapped;
          all.push(p);
        }
        fetched += data.items.length;
        skip += data.items.length;
        if (fetched >= data.total) break;
        await new Promise((r) => setTimeout(r, 150));
      }
      process.stdout.write(".");
    } catch {
      process.stdout.write("x");
    }
  }
  console.log();
  return all;
}

// ─── Store configs ───────────────────────────────────────

const SUPERVALU: StoreConfig = {
  slug: "supervalu",
  apiBase: "https://storefrontgateway.supervalu.ie/api",
  storeId: "1733",
  maxPerCategory: 200,
  categories: [
    { id: "O100001", name: "Fruit & Vegetables", mapped: "fruits & vegetables" },
    { id: "O100010", name: "Bakery", mapped: "bakery" },
    { id: "O100015", name: "Meat & Poultry", mapped: "meat & poultry" },
    { id: "O100023", name: "Cheese", mapped: "dairy & eggs" },
    { id: "O100025", name: "Milk, Butter & Eggs", mapped: "dairy & eggs" },
    { id: "O100030", name: "Chilled Food", mapped: "dairy & eggs" },
    { id: "O100045", name: "Frozen Foods", mapped: "frozen" },
    { id: "O100050", name: "Drinks", mapped: "drinks" },
    { id: "O100035", name: "Food Cupboard", mapped: "snacks & sweets" },
    { id: "O100065", name: "Household & Cleaning", mapped: "household" },
    { id: "O100055", name: "Beauty & Personal Care", mapped: "personal care" },
    { id: "O100060", name: "Baby", mapped: "baby" },
  ],
};

const DUNNES: StoreConfig = {
  slug: "dunnes",
  apiBase: "https://storefrontgateway.dunnesstoresgrocery.com/api",
  storeId: "258",
  maxPerCategory: 200,
  categories: [
    { id: "50066", name: "Fresh Fruit", mapped: "fruits & vegetables" },
    { id: "47183", name: "Fresh Vegetables", mapped: "fruits & vegetables" },
    { id: "47181", name: "Fresh Meat & Poultry", mapped: "meat & poultry" },
    { id: "50101", name: "Chilled Fish & Seafood", mapped: "meat & poultry" },
    { id: "47173", name: "Chilled Food", mapped: "dairy & eggs" },
    { id: "47171", name: "Bakery", mapped: "bakery" },
    { id: "47177", name: "Food Cupboard", mapped: "snacks & sweets" },
    { id: "47185", name: "Frozen Food", mapped: "frozen" },
    { id: "47175", name: "Drinks", mapped: "drinks" },
    { id: "47189", name: "Household & Cleaning", mapped: "household" },
    { id: "47201", name: "Toiletries", mapped: "personal care" },
    { id: "47169", name: "Baby", mapped: "baby" },
  ],
};

// ─── Stage products into staging tables ──────────────────

async function stageProducts(
  storeSlug: string,
  products: ScrapedProduct[]
): Promise<{ batchId: string; staged: number; newProducts: number; priceChanges: number }> {
  // Get existing store and products for comparison
  const store = await prisma.store.findUnique({ where: { slug: storeSlug } });
  if (!store) throw new Error(`Store '${storeSlug}' not found`);

  // Create batch
  const batch = await prisma.stagedBatch.create({
    data: { storeSlug, totalProducts: products.length },
  });

  let staged = 0;
  let newProducts = 0;
  let priceChanges = 0;
  let unchanged = 0;

  for (const p of products) {
    if (p.price <= 0 || !p.name || p.name.length < 3) continue;

    const w = p.weight;
    const wu = p.weightUnit;
    const matchSlug = productMatchSlug(p.name, w, wu);
    const canonName = canonicalProductName(p.name, w, wu);

    // Check if product already exists — try barcode first, then fall back to slug
    let existingProduct = p.barcode
      ? await prisma.product.findUnique({
          where: { barcode: p.barcode },
          include: {
            prices: {
              where: { storeId: store.id, isLatest: true },
              take: 1,
            },
          },
        })
      : null;

    if (!existingProduct) {
      existingProduct = await prisma.product.findUnique({
        where: { slug: matchSlug },
        include: {
          prices: {
            where: { storeId: store.id, isLatest: true },
            take: 1,
          },
        },
      });
    }

    let existingProductId: string | null = null;
    let priceChange: number | null = null;

    if (existingProduct) {
      existingProductId = existingProduct.id;
      const currentPrice = existingProduct.prices[0];
      if (currentPrice) {
        const diff = p.price - Number(currentPrice.price);
        if (Math.abs(diff) > 0.005) {
          priceChange = diff;
          priceChanges++;
        } else {
          unchanged++;
          continue; // Skip unchanged prices
        }
      } else {
        // Product exists but no price from this store
        newProducts++;
      }
    } else {
      newProducts++;
    }

    try {
      await prisma.stagedProduct.create({
        data: {
          batchId: batch.id,
          storeSlug,
          rawName: p.name,
          matchSlug,
          canonName,
          price: p.price,
          originalPrice: p.originalPrice || null,
          isOnSale: p.isOnSale || false,
          unitPrice: p.unitPrice || null,
          unitPriceUnit: p.unitPriceUnit || null,
          brand: p.brand || null,
          category: p.category || null,
          imageUrl: p.imageUrl || null,
          weight: w || null,
          weightUnit: wu || null,
          barcode: p.barcode || null,
          description: p.description?.slice(0, 500) || null,
          sourceUrl: p.sourceUrl || null,
          existingProductId,
          priceChange,
        },
      });
      staged++;
    } catch {
      // Skip duplicates or other errors
    }
  }

  // Update batch summary
  await prisma.stagedBatch.update({
    where: { id: batch.id },
    data: {
      totalProducts: staged,
      newProducts,
      priceChanges,
      unchanged,
    },
  });

  return { batchId: batch.id, staged, newProducts, priceChanges };
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  const arg = process.argv[2]?.toLowerCase();
  console.log("=== GrocerySaver Staging Scraper ===\n");
  console.log("Products go to STAGING. Review at /admin/staging before going live.\n");

  if (!arg || arg === "supervalu") {
    process.stdout.write("Scraping SuperValu: ");
    const products = await scrapeMi9Store(SUPERVALU);
    console.log(`  Scraped ${products.length} products`);
    const result = await stageProducts("supervalu", products);
    console.log(
      `  Staged: ${result.staged} (${result.newProducts} new, ${result.priceChanges} price changes)`
    );
    console.log(`  Batch ID: ${result.batchId}\n`);
  }

  if (!arg || arg === "dunnes") {
    process.stdout.write("Scraping Dunnes: ");
    const products = await scrapeMi9Store(DUNNES);
    console.log(`  Scraped ${products.length} products`);
    const result = await stageProducts("dunnes", products);
    console.log(
      `  Staged: ${result.staged} (${result.newProducts} new, ${result.priceChanges} price changes)`
    );
    console.log(`  Batch ID: ${result.batchId}\n`);
  }

  if (!arg || arg === "aldi") {
    console.log("Scraping Aldi:");
    const products = await scrapeAldiLive(5);
    console.log(`  Scraped ${products.length} products`);
    const result = await stageProducts("aldi", products);
    console.log(
      `  Staged: ${result.staged} (${result.newProducts} new, ${result.priceChanges} price changes)`
    );
    console.log(`  Batch ID: ${result.batchId}\n`);
  }

  if (!arg || arg === "tesco") {
    console.log("Scraping Tesco:");
    const products = await scrapeTescoLive(200);
    console.log(`  Scraped ${products.length} products`);
    const result = await stageProducts("tesco", products);
    console.log(
      `  Staged: ${result.staged} (${result.newProducts} new, ${result.priceChanges} price changes)`
    );
    console.log(`  Batch ID: ${result.batchId}\n`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
