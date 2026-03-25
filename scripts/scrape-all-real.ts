/**
 * REAL automated scraper for Irish grocery stores.
 *
 * Scrapes:
 *   - SuperValu: REST API (no browser needed)
 *   - Dunnes:    dunnesstoresgrocery.com via Chrome (search-based)
 *   - Tesco:     tesco.ie via Chrome (when not blocked by Akamai)
 *   - Aldi:      aldi.ie bakery section via Chrome
 *
 * Setup:
 *   npm install playwright
 *   npx playwright install chromium
 *   Chrome must be installed on your system!
 *
 * Usage:
 *   npx tsx scripts/scrape-all-real.ts              # all stores
 *   npx tsx scripts/scrape-all-real.ts supervalu     # SuperValu only
 *   npx tsx scripts/scrape-all-real.ts dunnes        # Dunnes only
 *   npx tsx scripts/scrape-all-real.ts tesco         # Tesco only
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { canonicalProductName, productMatchSlug } from "../src/lib/scraper/matcher";
import { CATEGORY_MAP } from "../src/lib/scraper/products";
import { chromium, type Browser, type BrowserContext } from "playwright";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

let catMap: Map<string, string>;

// ─── DB helper ──────────────────────────────────────────────────

async function upsertProduct(
  storeId: string,
  name: string,
  price: number,
  category: string,
  extra?: { imageUrl?: string; brand?: string; unitPrice?: number; unitPriceUnit?: string; description?: string; weight?: number; weightUnit?: string }
): Promise<boolean> {
  if (price <= 0 || !name || name.length < 3) return false;

  const w = extra?.weight;
  const wu = extra?.weightUnit;
  const matchSlug = productMatchSlug(name, w, wu);
  const canonName = canonicalProductName(name, w, wu);

  let product = await prisma.product.findUnique({ where: { slug: matchSlug } });

  if (!product) {
    const catSlug = CATEGORY_MAP[category.toLowerCase() as keyof typeof CATEGORY_MAP];
    const categoryId = catSlug ? catMap.get(catSlug) : undefined;
    product = await prisma.product.create({
      data: {
        name: canonName,
        slug: matchSlug,
        brand: extra?.brand || null,
        imageUrl: extra?.imageUrl || null,
        description: extra?.description || null,
        weight: w || null,
        weightUnit: wu || null,
        categoryId: categoryId || null,
        isActive: true,
      },
    });
  } else {
    const updates: Record<string, unknown> = {};
    if (!product.imageUrl && extra?.imageUrl) updates.imageUrl = extra.imageUrl;
    if (!product.brand && extra?.brand) updates.brand = extra.brand;
    if (!product.description && extra?.description) updates.description = extra.description;
    if (Object.keys(updates).length > 0) {
      await prisma.product.update({ where: { id: product.id }, data: updates });
    }
  }

  // Skip if already has a price from this store
  const existing = await prisma.price.findFirst({
    where: { productId: product.id, storeId, isLatest: true },
  });
  if (existing) return false;

  await prisma.price.create({
    data: {
      productId: product.id,
      storeId,
      price,
      unitPrice: extra?.unitPrice || null,
      unitPriceUnit: extra?.unitPriceUnit || null,
      currency: "EUR",
      isLatest: true,
      scrapedAt: new Date(),
    },
  });
  return true;
}

// ─── SuperValu (API) ────────────────────────────────────────────

const SV_API = "https://storefrontgateway.supervalu.ie/api";
const SV_STORE = "1733";
const SV_CATS = [
  { id: "O100001", cat: "fruits & vegetables" },
  { id: "O100010", cat: "bakery" },
  { id: "O100015", cat: "meat & poultry" },
  { id: "O100023", cat: "dairy & eggs" },
  { id: "O100025", cat: "dairy & eggs" },
  { id: "O100030", cat: "dairy & eggs" },
  { id: "O100045", cat: "frozen" },
  { id: "O100050", cat: "drinks" },
  { id: "O100035", cat: "snacks & sweets" },
  { id: "O100065", cat: "household" },
  { id: "O100055", cat: "personal care" },
  { id: "O100060", cat: "baby" },
];

async function scrapeSuperValu() {
  const store = await prisma.store.findUnique({ where: { slug: "supervalu" } });
  if (!store) return 0;

  let total = 0;
  for (const sc of SV_CATS) {
    let skip = 0;
    const max = 150;
    while (skip < max) {
      const res = await fetch(
        `${SV_API}/stores/${SV_STORE}/categories/${sc.id}/search?take=48&skip=${skip}`,
        { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } }
      );
      const data = await res.json();
      if (!data.items?.length) break;

      for (const item of data.items) {
        const price = typeof item.priceNumeric === "number" ? item.priceNumeric : 0;
        let up: number | undefined;
        let upu: string | undefined;
        if (item.pricePerUnit) {
          const m = item.pricePerUnit.match(/€([\d.]+)\/([\w]+)/);
          if (m) { up = parseFloat(m[1]); upu = m[2]; }
        }
        const ok = await upsertProduct(store.id, item.name, price, sc.cat, {
          imageUrl: item.image?.default,
          brand: item.brand,
          unitPrice: up,
          unitPriceUnit: upu,
          description: item.description?.slice(0, 500),
          weight: item.unitOfSize?.size,
          weightUnit: item.unitOfSize?.abbreviation,
        });
        if (ok) total++;
      }

      skip += data.items.length;
      if (skip >= data.total) break;
      await new Promise((r) => setTimeout(r, 150));
    }
    process.stdout.write(".");
  }
  console.log();
  return total;
}

// ─── Dunnes (browser — dunnesstoresgrocery.com) ─────────────────

const DUNNES_SEARCHES = [
  { query: "milk", cat: "dairy & eggs" },
  { query: "butter", cat: "dairy & eggs" },
  { query: "cheese", cat: "dairy & eggs" },
  { query: "eggs", cat: "dairy & eggs" },
  { query: "yoghurt", cat: "dairy & eggs" },
  { query: "cream", cat: "dairy & eggs" },
  { query: "chicken", cat: "meat & poultry" },
  { query: "beef", cat: "meat & poultry" },
  { query: "pork", cat: "meat & poultry" },
  { query: "bacon", cat: "meat & poultry" },
  { query: "sausages", cat: "meat & poultry" },
  { query: "ham", cat: "meat & poultry" },
  { query: "salmon", cat: "meat & poultry" },
  { query: "bananas", cat: "fruits & vegetables" },
  { query: "apples", cat: "fruits & vegetables" },
  { query: "potatoes", cat: "fruits & vegetables" },
  { query: "carrots", cat: "fruits & vegetables" },
  { query: "tomatoes", cat: "fruits & vegetables" },
  { query: "onions", cat: "fruits & vegetables" },
  { query: "broccoli", cat: "fruits & vegetables" },
  { query: "mushrooms", cat: "fruits & vegetables" },
  { query: "lettuce", cat: "fruits & vegetables" },
  { query: "bread", cat: "bakery" },
  { query: "rolls", cat: "bakery" },
  { query: "wraps", cat: "bakery" },
  { query: "water", cat: "drinks" },
  { query: "juice", cat: "drinks" },
  { query: "tea", cat: "drinks" },
  { query: "coffee", cat: "drinks" },
  { query: "cola", cat: "drinks" },
  { query: "pizza", cat: "frozen" },
  { query: "fish fingers", cat: "frozen" },
  { query: "frozen chips", cat: "frozen" },
  { query: "ice cream", cat: "frozen" },
  { query: "chocolate", cat: "snacks & sweets" },
  { query: "crisps", cat: "snacks & sweets" },
  { query: "biscuits", cat: "snacks & sweets" },
  { query: "toilet roll", cat: "household" },
  { query: "washing up liquid", cat: "household" },
  { query: "detergent", cat: "household" },
  { query: "shampoo", cat: "personal care" },
  { query: "toothpaste", cat: "personal care" },
  { query: "nappies", cat: "baby" },
];

async function scrapeDunnes(browser: Browser) {
  const store = await prisma.store.findUnique({ where: { slug: "dunnes" } });
  if (!store) return 0;

  const context = await browser.newContext({ locale: "en-IE" });
  const page = await context.newPage();

  let total = 0;
  for (const s of DUNNES_SEARCHES) {
    try {
      const url = `https://www.dunnesstoresgrocery.com/sm/delivery/rsid/258/results?q=${encodeURIComponent(s.query)}`;
      await page.goto(url, { waitUntil: "load", timeout: 30000 });
      await page.waitForTimeout(6000);

      const products = await page.evaluate(() => {
        const state = (window as any).__PRELOADED_STATE__;
        if (!state?.search?.productCardDictionary) return [];
        return Object.values(state.search.productCardDictionary).map((p: any) => ({
          name: p.name,
          price: p.price,
          unitPrice: p.unitPrice,
          brand: p.brand,
          sku: p.sku,
          sellBy: p.sellBy,
          image: typeof p.image === "string" ? p.image : undefined,
          unitOfSize: p.unitOfSize,
        }));
      });

      let added = 0;
      for (const p of products) {
        const priceStr = String(p.price).replace(/[€,]/g, "");
        const price = parseFloat(priceStr);
        if (!price || price <= 0) continue;

        // Parse unit price like "€1.70/l"
        let up: number | undefined;
        let upu: string | undefined;
        if (p.unitPrice) {
          const m = String(p.unitPrice).match(/€?([\d.]+)\/([\w]+)/);
          if (m) { up = parseFloat(m[1]); upu = m[2]; }
        }

        const ok = await upsertProduct(store.id, `Dunnes ${p.name}`, price, s.cat, {
          brand: p.brand,
          unitPrice: up,
          unitPriceUnit: upu,
        });
        if (ok) added++;
      }
      total += added;
      process.stdout.write(added > 0 ? `${s.query}(${added}) ` : ".");
    } catch {
      process.stdout.write("x");
    }

    await page.waitForTimeout(1500 + Math.random() * 1500);
  }
  console.log();
  await context.close();
  return total;
}

// ─── Tesco (browser — first category only, Akamai blocks rest) ──

async function scrapeTesco(browser: Browser) {
  const store = await prisma.store.findUnique({ where: { slug: "tesco" } });
  if (!store) return 0;

  const context = await browser.newContext({ locale: "en-IE" });
  const page = await context.newPage();

  // Go to homepage first
  await page.goto("https://www.tesco.ie/", { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(3000);

  // Accept cookies
  try {
    await page.locator('button:has-text("Accept")').first().click({ timeout: 3000 });
    await page.waitForTimeout(1000);
  } catch {}

  const tescoCategories = [
    { url: "https://www.tesco.ie/groceries/en-IE/shop/fresh-food/milk-butter-and-eggs/all", cat: "dairy & eggs" },
    { url: "https://www.tesco.ie/groceries/en-IE/shop/fresh-food/cheese/all", cat: "dairy & eggs" },
    { url: "https://www.tesco.ie/groceries/en-IE/shop/fresh-food/fresh-meat-and-poultry/all", cat: "meat & poultry" },
    { url: "https://www.tesco.ie/groceries/en-IE/shop/fresh-food/fresh-fruit/all", cat: "fruits & vegetables" },
    { url: "https://www.tesco.ie/groceries/en-IE/shop/fresh-food/fresh-vegetables/all", cat: "fruits & vegetables" },
    { url: "https://www.tesco.ie/groceries/en-IE/shop/bakery/all", cat: "bakery" },
    { url: "https://www.tesco.ie/groceries/en-IE/shop/frozen-food/all", cat: "frozen" },
    { url: "https://www.tesco.ie/groceries/en-IE/shop/drinks/all", cat: "drinks" },
  ];

  let total = 0;
  for (const tc of tescoCategories) {
    try {
      await page.goto(tc.url, { waitUntil: "load", timeout: 45000 });
      await page.waitForTimeout(8000);

      const body = await page.textContent("body");
      if (body?.includes("Access Denied")) {
        process.stdout.write("B");
        continue;
      }

      // Scroll to load
      for (let i = 0; i < 4; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1500);
      }

      const products = await page.evaluate(() => {
        const results: Array<{ name: string; price: string }> = [];
        const seen = new Set<string>();
        document.querySelectorAll('a[href*="/products/"]').forEach((link) => {
          const name = link.textContent?.trim() || "";
          if (!name || name.length < 3 || seen.has(name)) return;
          seen.add(name);
          const container = link.closest("li") || link.closest("div");
          const priceEl = container?.querySelector('[class*="price"]');
          const price = priceEl?.textContent?.trim() || "";
          if (price) results.push({ name, price });
        });
        return results;
      });

      let added = 0;
      for (const p of products) {
        const m = p.price.match(/€?([\d.]+)/);
        if (!m) continue;
        const ok = await upsertProduct(store.id, `Tesco ${p.name}`, parseFloat(m[1]), tc.cat);
        if (ok) added++;
      }
      total += added;
      process.stdout.write(added > 0 ? `+${added} ` : ".");
    } catch {
      process.stdout.write("x");
    }
    await page.waitForTimeout(3000 + Math.random() * 2000);
  }
  console.log();
  await context.close();
  return total;
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  const arg = process.argv[2]?.toLowerCase();
  console.log("=== GrocerySaver Automated Scraper ===\n");

  const categories = await prisma.category.findMany();
  catMap = new Map(categories.map((c: any) => [c.slug, c.id]));

  if (!arg || arg === "supervalu") {
    process.stdout.write("SuperValu (API): ");
    const n = await scrapeSuperValu();
    console.log(`  → ${n} new prices`);
  }

  let browser: Browser | null = null;
  try {
    if (!arg || arg === "dunnes" || arg === "tesco") {
      browser = await chromium.launch({ headless: false, channel: "chrome" });
    }

    if ((!arg || arg === "dunnes") && browser) {
      process.stdout.write("Dunnes (browser): ");
      const n = await scrapeDunnes(browser);
      console.log(`  → ${n} new prices`);
    }

    if ((!arg || arg === "tesco") && browser) {
      process.stdout.write("Tesco (browser): ");
      const n = await scrapeTesco(browser);
      console.log(`  → ${n} new prices`);
    }
  } finally {
    if (browser) await browser.close();
  }

  // Stats
  console.log("\n=== Results ===");
  const stores = await prisma.store.findMany({ select: { name: true, id: true } });
  for (const s of stores) {
    const count = await prisma.price.count({ where: { storeId: s.id, isLatest: true } });
    if (count > 0) console.log(`  ${s.name}: ${count} prices`);
  }
  const tp = await prisma.product.count();
  const tpr = await prisma.price.count({ where: { isLatest: true } });
  const multi = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) as count FROM (SELECT "productId" FROM "Price" WHERE "isLatest" = true GROUP BY "productId" HAVING COUNT(DISTINCT "storeId") >= 2) sub`
  );
  console.log(`  Total: ${tp} products, ${tpr} prices`);
  console.log(`  Cross-store products: ${multi[0]?.count ?? 0}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
