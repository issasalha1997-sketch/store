/**
 * REAL automated scraper for Irish grocery stores — API only, NO browser.
 *
 * Both SuperValu and Dunnes use the same Mi9/Wynshop platform with open APIs.
 *
 * Usage:
 *   npx tsx scripts/scrape-all-real.ts              # all stores
 *   npx tsx scripts/scrape-all-real.ts supervalu     # SuperValu only
 *   npx tsx scripts/scrape-all-real.ts dunnes        # Dunnes only
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { canonicalProductName, productMatchSlug, productFamilySlug } from "../src/lib/scraper/matcher";
import { CATEGORY_MAP } from "../src/lib/scraper/products";
import { scrapeAldiLive } from "../src/lib/scraper/aldi";
import { scrapeTescoLive } from "../src/lib/scraper/tesco";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

let catMap: Map<string, string>;

// ─── Shared API helpers (both stores use same Mi9 platform) ─────

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
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "application/json",
      "Accept-Language": "en-IE,en;q=0.9",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${url}`);
  return res.json();
}

/** Strip HTML tags and decode entities */
function stripHtml(html: string | undefined): string | undefined {
  if (!html) return undefined;
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim()
    .slice(0, 500) || undefined;
}

async function upsertProduct(
  storeId: string,
  name: string,
  price: number,
  category: string,
  extra?: {
    imageUrl?: string;
    brand?: string;
    unitPrice?: number;
    unitPriceUnit?: string;
    description?: string;
    weight?: number;
    weightUnit?: string;
    originalPrice?: number;
    isOnSale?: boolean;
  }
): Promise<boolean> {
  if (price <= 0 || !name || name.length < 3) return false;

  const w = extra?.weight;
  const wu = extra?.weightUnit;
  const matchSlug = productMatchSlug(name, w, wu);
  const canonName = canonicalProductName(name, w, wu);
  const famSlug = productFamilySlug(name, w, wu);

  const catSlug = CATEGORY_MAP[category.toLowerCase() as keyof typeof CATEGORY_MAP];
  const categoryId = catSlug ? catMap.get(catSlug) : undefined;

  const cleanDesc = stripHtml(extra?.description);

  const product = await prisma.product.upsert({
    where: { slug: matchSlug },
    create: {
      name: canonName,
      slug: matchSlug,
      familySlug: famSlug,
      brand: extra?.brand || null,
      imageUrl: extra?.imageUrl || null,
      description: cleanDesc || null,
      weight: w || null,
      weightUnit: wu || null,
      categoryId: categoryId || null,
      isActive: true,
    },
    update: {
      ...(extra?.imageUrl ? { imageUrl: extra.imageUrl } : {}),
      ...(extra?.brand ? { brand: extra.brand } : {}),
      ...(cleanDesc ? { description: cleanDesc } : {}),
      familySlug: famSlug,
    },
  });

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
      originalPrice: extra?.originalPrice || null,
      isOnSale: extra?.isOnSale || false,
      unitPrice: extra?.unitPrice || null,
      unitPriceUnit: extra?.unitPriceUnit || null,
      currency: "EUR",
      isLatest: true,
      scrapedAt: new Date(),
    },
  });
  return true;
}

function parseMi9Product(
  item: Mi9Product,
  category: string
): {
  name: string;
  price: number;
  extra: Parameters<typeof upsertProduct>[4];
} {
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
    extra: {
      imageUrl: item.image?.default || item.image?.cell || undefined,
      brand: item.brand || undefined,
      unitPrice,
      unitPriceUnit,
      description: item.description || undefined,
      weight: item.unitOfSize?.size || undefined,
      weightUnit: item.unitOfSize?.abbreviation || undefined,
      originalPrice: isOnSale ? item.priceNumeric : undefined,
      isOnSale,
    },
  };
}

// ─── Generic Mi9 store scraper ──────────────────────────────────

interface StoreConfig {
  slug: string;
  apiBase: string;
  storeId: string;
  categories: Array<{ id: string; name: string; mapped: string }>;
  maxPerCategory: number;
}

async function scrapeStore(config: StoreConfig): Promise<number> {
  const store = await prisma.store.findUnique({ where: { slug: config.slug } });
  if (!store) {
    console.log(`  Store '${config.slug}' not found in DB`);
    return 0;
  }

  let total = 0;
  for (const cat of config.categories) {
    try {
      let skip = 0;
      let fetched = 0;

      while (fetched < config.maxPerCategory) {
        const take = Math.min(48, config.maxPerCategory - fetched);
        const data = await fetchMi9Page(config.apiBase, config.storeId, cat.id, take, skip);
        if (!data.items?.length) break;

        for (const item of data.items) {
          if (item.priceNumeric <= 0) continue;
          const parsed = parseMi9Product(item, cat.mapped);
          try {
            const ok = await upsertProduct(store.id, parsed.name, parsed.price, cat.mapped, parsed.extra);
            if (ok) total++;
          } catch {
            // Skip individual product errors
          }
        }

        fetched += data.items.length;
        skip += data.items.length;
        if (fetched >= data.total) break;
        await new Promise((r) => setTimeout(r, 150));
      }

      process.stdout.write(".");
    } catch (err) {
      process.stdout.write("x");
    }
  }
  console.log();
  return total;
}

// ─── Store configs ──────────────────────────────────────────────

const SUPERVALU: StoreConfig = {
  slug: "supervalu",
  apiBase: "https://storefrontgateway.supervalu.ie/api",
  storeId: "1733", // Ranelagh, Dublin
  maxPerCategory: 500,
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
  storeId: "258", // Beacon Court, Dublin 18
  maxPerCategory: 500,
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

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  const arg = process.argv[2]?.toLowerCase();
  console.log("=== GrocerySaver Scraper (API only, no browser) ===\n");

  const categories = await prisma.category.findMany();
  catMap = new Map(categories.map((c: any) => [c.slug, c.id]));

  if (!arg || arg === "supervalu") {
    process.stdout.write("SuperValu: ");
    const n = await scrapeStore(SUPERVALU);
    console.log(`  → ${n} new prices`);
  }

  if (!arg || arg === "dunnes") {
    process.stdout.write("Dunnes: ");
    const n = await scrapeStore(DUNNES);
    console.log(`  → ${n} new prices`);
  }

  if (!arg || arg === "aldi") {
    console.log("Aldi (HTML scraper):");
    const store = await prisma.store.findUnique({ where: { slug: "aldi" } });
    if (store) {
      const products = await scrapeAldiLive(5);
      let imported = 0;
      for (const p of products) {
        if (p.price <= 0 || !p.name || p.name.length < 3) continue;
        try {
          const ok = await upsertProduct(store.id, p.name, p.price, p.category || "snacks & sweets", {
            imageUrl: p.imageUrl,
            brand: p.brand,
            unitPrice: p.unitPrice,
            unitPriceUnit: p.unitPriceUnit,
            description: p.description,
            weight: p.weight,
            weightUnit: p.weightUnit,
            originalPrice: p.originalPrice,
            isOnSale: p.isOnSale,
          });
          if (ok) imported++;
        } catch {
          // Skip individual errors
        }
      }
      console.log(`  → ${imported} new prices (from ${products.length} scraped)`);
    } else {
      console.log("  Store 'aldi' not found in DB");
    }
  }

  if (!arg || arg === "tesco") {
    console.log("Tesco (HTML scraper):");
    const store = await prisma.store.findUnique({ where: { slug: "tesco" } });
    if (store) {
      const products = await scrapeTescoLive(200);
      let imported = 0;
      for (const p of products) {
        if (p.price <= 0 || !p.name || p.name.length < 3) continue;
        try {
          const ok = await upsertProduct(store.id, p.name, p.price, p.category || "snacks & sweets", {
            imageUrl: p.imageUrl,
            brand: p.brand,
            unitPrice: p.unitPrice,
            unitPriceUnit: p.unitPriceUnit,
            description: p.description,
            weight: p.weight,
            weightUnit: p.weightUnit,
            originalPrice: p.originalPrice,
            isOnSale: p.isOnSale,
          });
          if (ok) imported++;
        } catch {
          // Skip individual errors
        }
      }
      console.log(`  → ${imported} new prices (from ${products.length} scraped)`);
    } else {
      console.log("  Store 'tesco' not found in DB");
    }
  }

  // Final stats
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
  console.log(`  Cross-store matches: ${multi[0]?.count ?? 0}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
