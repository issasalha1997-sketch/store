/**
 * Local Puppeteer/Playwright scraper for Tesco and Aldi Ireland.
 * Runs a real browser on your machine to bypass anti-bot protections.
 *
 * Setup:
 *   npm install playwright
 *   npx playwright install chromium
 *
 * Usage:
 *   npx tsx scripts/scrape-live.ts              # scrape all stores
 *   npx tsx scripts/scrape-live.ts tesco         # scrape Tesco only
 *   npx tsx scripts/scrape-live.ts aldi          # scrape Aldi only
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { canonicalProductName, productMatchSlug } from "../src/lib/scraper/matcher";
import { CATEGORY_MAP } from "../src/lib/scraper/products";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface ScrapedItem {
  name: string;
  price: number;
  unitPrice?: string;
  imageUrl?: string;
  weight?: number;
  weightUnit?: string;
  category: string;
}

// ─── Tesco Ireland Scraper ────────────────────────────────────────

const TESCO_CATEGORIES = [
  { url: "https://www.tesco.ie/groceries/en-IE/shop/fresh-food/all?page=1&count=48", category: "dairy & eggs" },
  { url: "https://www.tesco.ie/groceries/en-IE/shop/fresh-food/all?page=2&count=48", category: "meat & poultry" },
  { url: "https://www.tesco.ie/groceries/en-IE/shop/bakery/all?page=1&count=48", category: "bakery" },
  { url: "https://www.tesco.ie/groceries/en-IE/shop/frozen-food/all?page=1&count=48", category: "frozen" },
  { url: "https://www.tesco.ie/groceries/en-IE/shop/drinks/all?page=1&count=48", category: "drinks" },
  { url: "https://www.tesco.ie/groceries/en-IE/shop/food-cupboard/all?page=1&count=48", category: "snacks & sweets" },
  { url: "https://www.tesco.ie/groceries/en-IE/shop/household/all?page=1&count=48", category: "household" },
  { url: "https://www.tesco.ie/groceries/en-IE/shop/health-and-beauty/all?page=1&count=48", category: "personal care" },
];

async function scrapeTesco(browser: any): Promise<ScrapedItem[]> {
  const items: ScrapedItem[] = [];
  const page = await browser.newPage();

  // Set realistic viewport and headers
  await page.setViewportSize({ width: 1366, height: 768 });

  for (const cat of TESCO_CATEGORIES) {
    console.log(`[Tesco] Scraping: ${cat.category}...`);
    try {
      await page.goto(cat.url, { waitUntil: "domcontentloaded", timeout: 30000 });

      // Wait for products to load
      await page.waitForSelector('[data-auto="product-tile"], .product-list--list-item, .styles__StyledTile', {
        timeout: 15000
      }).catch(() => {});

      // Scroll to load lazy content
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);

      // Extract products
      const products = await page.evaluate(() => {
        const results: Array<{ name: string; price: string; img: string; unitPrice: string }> = [];

        // Try multiple selector patterns (Tesco changes their layout)
        const selectors = [
          '[data-auto="product-tile"]',
          '.product-list--list-item',
          '.styles__StyledTile',
          '[class*="ProductTile"]',
        ];

        for (const sel of selectors) {
          const tiles = document.querySelectorAll(sel);
          if (tiles.length === 0) continue;

          tiles.forEach((tile) => {
            const nameEl = tile.querySelector('[data-auto="product-tile--title"], h3, [class*="Title"]');
            const priceEl = tile.querySelector('[data-auto="price-value"], [class*="price"], .value');
            const imgEl = tile.querySelector('img');
            const unitPriceEl = tile.querySelector('[class*="unitPrice"], [class*="price-per"]');

            const name = nameEl?.textContent?.trim() || '';
            const price = priceEl?.textContent?.trim() || '';
            const img = imgEl?.getAttribute('src') || '';
            const unitPrice = unitPriceEl?.textContent?.trim() || '';

            if (name && price) {
              results.push({ name, price, img, unitPrice });
            }
          });

          if (results.length > 0) break;
        }

        return results;
      });

      for (const p of products) {
        const priceMatch = p.price.match(/€?([\d.]+)/);
        if (priceMatch) {
          items.push({
            name: p.name,
            price: parseFloat(priceMatch[1]),
            imageUrl: p.img || undefined,
            unitPrice: p.unitPrice || undefined,
            category: cat.category,
          });
        }
      }

      console.log(`  Found ${products.length} products`);
    } catch (err: any) {
      console.log(`  Error: ${err.message?.slice(0, 80)}`);
    }

    // Delay between categories
    await page.waitForTimeout(2000 + Math.random() * 2000);
  }

  await page.close();
  return items;
}

// ─── Aldi Ireland Scraper ────────────────────────────────────────

const ALDI_CATEGORIES = [
  { url: "https://www.aldi.ie/products/fresh-food/fruit-and-vegetables/fruit", category: "fruits & vegetables" },
  { url: "https://www.aldi.ie/products/fresh-food/fruit-and-vegetables/vegetables", category: "fruits & vegetables" },
  { url: "https://www.aldi.ie/products/fresh-food/dairy-and-eggs", category: "dairy & eggs" },
  { url: "https://www.aldi.ie/products/fresh-food/fresh-meat", category: "meat & poultry" },
  { url: "https://www.aldi.ie/products/bakery", category: "bakery" },
  { url: "https://www.aldi.ie/products/drinks/soft-drinks", category: "drinks" },
  { url: "https://www.aldi.ie/products/frozen-food", category: "frozen" },
  { url: "https://www.aldi.ie/products/food-cupboard/crisps-snacks-and-nuts", category: "snacks & sweets" },
  { url: "https://www.aldi.ie/products/household", category: "household" },
];

async function scrapeAldi(browser: any): Promise<ScrapedItem[]> {
  const items: ScrapedItem[] = [];
  const page = await browser.newPage();

  await page.setViewportSize({ width: 1366, height: 768 });

  for (const cat of ALDI_CATEGORIES) {
    console.log(`[Aldi] Scraping: ${cat.category} (${cat.url.split('/').pop()})...`);
    try {
      await page.goto(cat.url, { waitUntil: "domcontentloaded", timeout: 30000 });

      // Wait for product tiles
      await page.waitForSelector('.product-tile, [data-testid="product-tile"], [class*="ProductCard"]', {
        timeout: 15000
      }).catch(() => {});

      // Scroll to load all
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1000);
      }

      const products = await page.evaluate(() => {
        const results: Array<{ name: string; price: string; img: string; unitPrice: string }> = [];

        const selectors = [
          '.product-tile',
          '[data-testid="product-tile"]',
          '[class*="ProductCard"]',
          '[class*="product-card"]',
        ];

        for (const sel of selectors) {
          const tiles = document.querySelectorAll(sel);
          if (tiles.length === 0) continue;

          tiles.forEach((tile) => {
            const nameEl = tile.querySelector('[class*="title"], [class*="name"], h3, h4');
            const priceEl = tile.querySelector('[class*="price"]:not([class*="unit"]), .base-price__regular');
            const imgEl = tile.querySelector('img');
            const unitPriceEl = tile.querySelector('[class*="unit-price"], [class*="base-price"]');

            const name = nameEl?.textContent?.trim() || '';
            const price = priceEl?.textContent?.trim() || '';
            const img = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || '';
            const unitPrice = unitPriceEl?.textContent?.trim() || '';

            if (name && price) {
              results.push({ name, price, img, unitPrice });
            }
          });

          if (results.length > 0) break;
        }

        return results;
      });

      for (const p of products) {
        const priceMatch = p.price.match(/€?([\d.]+)/);
        if (priceMatch) {
          items.push({
            name: `Aldi ${p.name}`,
            price: parseFloat(priceMatch[1]),
            imageUrl: p.img || undefined,
            unitPrice: p.unitPrice || undefined,
            category: cat.category,
          });
        }
      }

      console.log(`  Found ${products.length} products`);
    } catch (err: any) {
      console.log(`  Error: ${err.message?.slice(0, 80)}`);
    }

    await page.waitForTimeout(2000 + Math.random() * 2000);
  }

  await page.close();
  return items;
}

// ─── Import to Database ──────────────────────────────────────────

async function importToDb(storeSlug: string, items: ScrapedItem[]) {
  const store = await prisma.store.findUnique({ where: { slug: storeSlug } });
  if (!store) throw new Error(`Store '${storeSlug}' not found`);

  const categories = await prisma.category.findMany();
  const catMap = new Map(categories.map((c: any) => [c.slug, c.id]));

  let added = 0;
  let errors = 0;

  for (const item of items) {
    try {
      const matchSlug = productMatchSlug(item.name, item.weight, item.weightUnit);
      const canonName = canonicalProductName(item.name, item.weight, item.weightUnit);

      let product = await prisma.product.findUnique({ where: { slug: matchSlug } });

      if (!product) {
        const catSlug = CATEGORY_MAP[item.category.toLowerCase() as keyof typeof CATEGORY_MAP];
        const categoryId = catSlug ? catMap.get(catSlug) : undefined;
        product = await prisma.product.create({
          data: {
            name: canonName,
            slug: matchSlug,
            imageUrl: item.imageUrl || null,
            categoryId: categoryId || null,
            isActive: true,
          },
        });
      } else if (!product.imageUrl && item.imageUrl) {
        await prisma.product.update({
          where: { id: product.id },
          data: { imageUrl: item.imageUrl },
        });
      }

      // Mark old prices as not latest
      await prisma.price.updateMany({
        where: { productId: product.id, storeId: store.id, isLatest: true },
        data: { isLatest: false },
      });

      await prisma.price.create({
        data: {
          productId: product.id,
          storeId: store.id,
          price: item.price,
          currency: "EUR",
          isLatest: true,
          scrapedAt: new Date(),
        },
      });
      added++;
    } catch {
      errors++;
    }
  }

  console.log(`[${storeSlug}] Imported: ${added} prices, ${errors} errors`);
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const storeArg = process.argv[2]?.toLowerCase();

  let chromium: any;
  try {
    chromium = await import("playwright");
  } catch {
    console.error("Playwright not installed. Run:");
    console.error("  npm install playwright");
    console.error("  npx playwright install chromium");
    process.exit(1);
  }

  console.log("Launching browser...");
  const browser = await chromium.chromium.launch({
    headless: false, // Visible browser to bypass anti-bot
    args: ["--disable-blink-features=AutomationControlled"],
  });

  try {
    if (!storeArg || storeArg === "tesco") {
      console.log("\n=== Scraping Tesco Ireland ===");
      const tescoItems = await scrapeTesco(browser);
      console.log(`Total Tesco products: ${tescoItems.length}`);
      if (tescoItems.length > 0) {
        await importToDb("tesco", tescoItems);
      }
    }

    if (!storeArg || storeArg === "aldi") {
      console.log("\n=== Scraping Aldi Ireland ===");
      const aldiItems = await scrapeAldi(browser);
      console.log(`Total Aldi products: ${aldiItems.length}`);
      if (aldiItems.length > 0) {
        await importToDb("aldi", aldiItems);
      }
    }
  } finally {
    await browser.close();

    // Final stats
    const totalProducts = await prisma.product.count();
    const totalPrices = await prisma.price.count({ where: { isLatest: true } });
    console.log(`\nDatabase: ${totalProducts} products, ${totalPrices} active prices`);

    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
