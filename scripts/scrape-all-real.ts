/**
 * REAL scraper for all Irish grocery stores.
 * Uses the actual installed Chrome browser to bypass anti-bot protections.
 *
 * Setup:
 *   npm install playwright
 *   npx playwright install chromium
 *   Must have Chrome installed on your system!
 *
 * Usage:
 *   npx tsx scripts/scrape-all-real.ts              # scrape all
 *   npx tsx scripts/scrape-all-real.ts tesco         # Tesco only
 *   npx tsx scripts/scrape-all-real.ts supervalu     # SuperValu only (API, no browser)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { canonicalProductName, productMatchSlug } from "../src/lib/scraper/matcher";
import { CATEGORY_MAP } from "../src/lib/scraper/products";
import { chromium, type Browser, type Page } from "playwright";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── DB helpers ─────────────────────────────────────────────────

async function importProduct(
  storeSlug: string,
  storeId: string,
  name: string,
  price: number,
  category: string,
  imageUrl?: string,
  unitPrice?: string,
  catMap?: Map<string, string>
) {
  if (price <= 0 || !name) return false;

  const matchSlug = productMatchSlug(name);
  const canonName = canonicalProductName(name);

  let product = await prisma.product.findUnique({ where: { slug: matchSlug } });

  if (!product) {
    const catSlug = CATEGORY_MAP[category.toLowerCase() as keyof typeof CATEGORY_MAP];
    const categoryId = catSlug && catMap ? catMap.get(catSlug) : undefined;
    product = await prisma.product.create({
      data: {
        name: canonName,
        slug: matchSlug,
        imageUrl: imageUrl || null,
        categoryId: categoryId || null,
        isActive: true,
      },
    });
  } else if (!product.imageUrl && imageUrl) {
    await prisma.product.update({
      where: { id: product.id },
      data: { imageUrl },
    });
  }

  // Check existing price
  const existing = await prisma.price.findFirst({
    where: { productId: product.id, storeId, isLatest: true },
  });
  if (existing) return false;

  await prisma.price.create({
    data: {
      productId: product.id,
      storeId,
      price,
      currency: "EUR",
      isLatest: true,
      scrapedAt: new Date(),
    },
  });
  return true;
}

// ─── Tesco Ireland ──────────────────────────────────────────────

const TESCO_CATEGORIES = [
  { url: "https://www.tesco.ie/groceries/en-IE/shop/fresh-food/milk-butter-and-eggs/all", category: "dairy & eggs" },
  { url: "https://www.tesco.ie/groceries/en-IE/shop/fresh-food/cheese/all", category: "dairy & eggs" },
  { url: "https://www.tesco.ie/groceries/en-IE/shop/fresh-food/yoghurts/all", category: "dairy & eggs" },
  { url: "https://www.tesco.ie/groceries/en-IE/shop/fresh-food/fresh-meat-and-poultry/all", category: "meat & poultry" },
  { url: "https://www.tesco.ie/groceries/en-IE/shop/fresh-food/fresh-fruit/all", category: "fruits & vegetables" },
  { url: "https://www.tesco.ie/groceries/en-IE/shop/fresh-food/fresh-vegetables/all", category: "fruits & vegetables" },
  { url: "https://www.tesco.ie/groceries/en-IE/shop/bakery/all", category: "bakery" },
  { url: "https://www.tesco.ie/groceries/en-IE/shop/frozen-food/all", category: "frozen" },
  { url: "https://www.tesco.ie/groceries/en-IE/shop/drinks/all", category: "drinks" },
  { url: "https://www.tesco.ie/groceries/en-IE/shop/food-cupboard/biscuits-and-chocolate/all", category: "snacks & sweets" },
  { url: "https://www.tesco.ie/groceries/en-IE/shop/food-cupboard/crisps-and-snacks/all", category: "snacks & sweets" },
  { url: "https://www.tesco.ie/groceries/en-IE/shop/household/all", category: "household" },
];

async function scrapeTesco(browser: Browser, catMap: Map<string, string>) {
  const store = await prisma.store.findUnique({ where: { slug: "tesco" } });
  if (!store) throw new Error("Tesco store not found in DB");

  const context = await browser.newContext({ locale: "en-IE" });
  const page = await context.newPage();

  let totalAdded = 0;

  for (const cat of TESCO_CATEGORIES) {
    console.log(`  [Tesco] ${cat.category}: ${cat.url.split("/").pop()}...`);
    try {
      await page.goto(cat.url, { waitUntil: "networkidle", timeout: 45000 });

      // Dismiss cookie banner if present
      try {
        const acceptBtn = page.locator('button:has-text("Accept All"), button:has-text("accept")').first();
        if (await acceptBtn.isVisible({ timeout: 3000 })) {
          await acceptBtn.click();
          await page.waitForTimeout(1000);
        }
      } catch {}

      // Wait for products
      await page.waitForTimeout(5000);

      // Scroll to load more
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1500);
      }

      // Extract products
      const products = await page.evaluate(() => {
        const results: Array<{ name: string; price: string; img: string }> = [];

        // Find all product links
        const links = document.querySelectorAll('a[href*="/products/"]');
        const seen = new Set<string>();

        for (const link of Array.from(links)) {
          const name = link.textContent?.trim() || "";
          if (!name || name.length < 3 || seen.has(name)) continue;
          seen.add(name);

          const container =
            link.closest("li") || link.closest("div[class*=tile]") || link.parentElement?.parentElement;
          if (!container) continue;

          // Find price nearby
          const priceEl = container.querySelector('[class*="price"], [class*="Price"]');
          const price = priceEl?.textContent?.trim() || "";

          const img = container.querySelector("img")?.src || "";

          if (name && price) {
            results.push({ name, price, img });
          }
        }

        return results;
      });

      let added = 0;
      for (const p of products) {
        const priceMatch = p.price.match(/€?([\d.]+)/);
        if (!priceMatch) continue;
        const ok = await importProduct(
          "tesco",
          store.id,
          `Tesco ${p.name}`,
          parseFloat(priceMatch[1]),
          cat.category,
          p.img || undefined,
          undefined,
          catMap
        );
        if (ok) added++;
      }
      totalAdded += added;
      console.log(`    → ${products.length} found, ${added} new prices added`);
    } catch (err: any) {
      console.log(`    ✗ Error: ${err.message?.slice(0, 80)}`);
    }

    await page.waitForTimeout(2000 + Math.random() * 2000);
  }

  await context.close();
  return totalAdded;
}

// ─── SuperValu (API) ────────────────────────────────────────────

const SV_API = "https://storefrontgateway.supervalu.ie/api";
const SV_STORE_ID = "1733";

const SV_CATEGORIES = [
  { id: "O100001", category: "fruits & vegetables" },
  { id: "O100010", category: "bakery" },
  { id: "O100015", category: "meat & poultry" },
  { id: "O100025", category: "dairy & eggs" },
  { id: "O100023", category: "dairy & eggs" },
  { id: "O100045", category: "frozen" },
  { id: "O100050", category: "drinks" },
  { id: "O100035", category: "snacks & sweets" },
  { id: "O100065", category: "household" },
  { id: "O100055", category: "personal care" },
  { id: "O100060", category: "baby" },
];

async function scrapeSuperValu(catMap: Map<string, string>) {
  const store = await prisma.store.findUnique({ where: { slug: "supervalu" } });
  if (!store) throw new Error("SuperValu store not found in DB");

  let totalAdded = 0;

  for (const cat of SV_CATEGORIES) {
    let skip = 0;
    const maxPerCat = 150;
    let fetched = 0;

    while (fetched < maxPerCat) {
      const take = Math.min(48, maxPerCat - fetched);
      const res = await fetch(
        `${SV_API}/stores/${SV_STORE_ID}/categories/${cat.id}/search?take=${take}&skip=${skip}`,
        { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } }
      );
      const data = await res.json();
      if (!data.items || data.items.length === 0) break;

      let added = 0;
      for (const item of data.items) {
        const price = typeof item.priceNumeric === "number" ? item.priceNumeric : 0;
        if (price <= 0) continue;

        const ok = await importProduct(
          "supervalu",
          store.id,
          item.name,
          price,
          cat.category,
          item.image?.default || undefined,
          item.pricePerUnit || undefined,
          catMap
        );
        if (ok) added++;
      }
      totalAdded += added;
      fetched += data.items.length;
      skip += data.items.length;
      if (fetched >= data.total) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    console.log(`  [SuperValu] ${cat.category}: ${fetched} fetched, added to DB`);
  }

  return totalAdded;
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  const storeArg = process.argv[2]?.toLowerCase();

  console.log("=== GrocerySaver Real Scraper ===\n");

  // Load categories
  const categories = await prisma.category.findMany();
  const catMap = new Map(categories.map((c: any) => [c.slug, c.id]));

  // SuperValu (API — no browser needed)
  if (!storeArg || storeArg === "supervalu") {
    console.log("Scraping SuperValu (API)...");
    const count = await scrapeSuperValu(catMap);
    console.log(`✓ SuperValu: ${count} new prices\n`);
  }

  // Tesco (needs real Chrome)
  if (!storeArg || storeArg === "tesco") {
    console.log("Scraping Tesco (Chrome browser)...");
    let browser: Browser | null = null;
    try {
      browser = await chromium.launch({
        headless: false,
        channel: "chrome",
      });
      const count = await scrapeTesco(browser, catMap);
      console.log(`✓ Tesco: ${count} new prices\n`);
    } catch (err: any) {
      console.log(`✗ Tesco failed: ${err.message?.slice(0, 100)}\n`);
      console.log("  Make sure Google Chrome is installed on your system.");
    } finally {
      if (browser) await browser.close();
    }
  }

  // Final stats
  const totalProducts = await prisma.product.count();
  const totalPrices = await prisma.price.count({ where: { isLatest: true } });
  const stores = await prisma.store.findMany({ select: { name: true, id: true } });
  console.log("=== Database Stats ===");
  for (const s of stores) {
    const count = await prisma.price.count({ where: { storeId: s.id, isLatest: true } });
    if (count > 0) console.log(`  ${s.name}: ${count} prices`);
  }
  console.log(`  Total: ${totalProducts} products, ${totalPrices} prices`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
